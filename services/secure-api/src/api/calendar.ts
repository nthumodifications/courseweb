import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyApiKey, requireScope } from "../middleware/apikey";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import ical, {
  ICalCalendarMethod,
  ICalEventTransparency,
} from "ical-generator";
import { createICalendar } from "../utils/icalendar";
import { addDays } from "date-fns";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { sha256hash } from "../utils/sha256";
import prisma from "../client";
import { env } from "hono/adapter";

const TIMETABLE_FEED_NAME = "__timetable_feed__";
const DEFAULT_TIMETABLE_API_URL = "https://api.nthumods.com";
const CALENDAR_FEED_CACHE_CONTROL = "private, max-age=900";
const ACADEMIC_CALENDAR_CACHE_TTL_MS = 60 * 60 * 1000;
const ACADEMIC_CALENDAR_FAILURE_RETRY_MS = 5 * 60 * 1000;
const CALENDAR_TIME_ZONE = "Asia/Taipei";

export const CALENDAR_FEED_INCLUDES = [
  "classes",
  "events",
  "academic",
] as const;

export type CalendarFeedInclude = (typeof CALENDAR_FEED_INCLUDES)[number];
const DEFAULT_CALENDAR_FEED_INCLUDES = new Set<CalendarFeedInclude>(
  CALENDAR_FEED_INCLUDES,
);

export const parseCalendarIncludes = (
  value: string | undefined,
): Set<CalendarFeedInclude> => {
  if (value === undefined) return new Set(DEFAULT_CALENDAR_FEED_INCLUDES);
  return new Set(
    value
      .split(",")
      .filter((item): item is CalendarFeedInclude =>
        (CALENDAR_FEED_INCLUDES as readonly string[]).includes(item),
      ),
  );
};

const lazyRequireAuth = (scopes: string[]) =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return requireAuth(scopes)(c, next);
  }) as MiddlewareHandler;

const generateCalendarShareToken = () =>
  "cal_" +
  Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

const publicCalendarUrl = (c: any, userId: string, token: string) => {
  const url = new URL(c.req.url);
  url.pathname = `/api/calendar/ics/${encodeURIComponent(userId)}`;
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
};

const webcalUrl = (url: string) => url.replace(/^https?:\/\//i, "webcal://");

const getCalendarFeedSecret = (c: any) => {
  const { JWT_PRIVATE_KEY } = env<{ JWT_PRIVATE_KEY?: string }>(c);
  return JWT_PRIVATE_KEY?.trim() ? JWT_PRIVATE_KEY : null;
};

const CALENDAR_FEED_KEY_CONTEXT = "courseweb/calendar-feed/v1";

const importCalendarFeedKey = async (secret: string, usages: KeyUsage[]) => {
  const jwtKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const feedKeyMaterial = await crypto.subtle.sign(
    "HMAC",
    jwtKey,
    new TextEncoder().encode(CALENDAR_FEED_KEY_CONTEXT),
  );
  return crypto.subtle.importKey(
    "raw",
    feedKeyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
};

const deriveCalendarFeedToken = async (secret: string, rowId: string) => {
  const key = await importCalendarFeedKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rowId),
  );
  return `cal_${Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

const verifyCalendarFeedToken = async (
  secret: string,
  rowId: string,
  suppliedToken: string,
) => {
  if (!/^cal_[0-9a-f]{64}$/i.test(suppliedToken)) return false;
  const signature = new Uint8Array(
    suppliedToken
      .slice(4)
      .match(/.{2}/g)!
      .map((byte) => Number.parseInt(byte, 16)),
  );
  const key = await importCalendarFeedKey(secret, ["verify"]);
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(rowId),
  );
};

const feedSelect = {
  id: true,
  createdAt: true,
  tokenHash: true,
} as const;

type TimetableFeed = {
  id: string;
  createdAt: Date;
  tokenHash: string;
};

const feedWhere = (userId: string) => ({
  userId,
  name: TIMETABLE_FEED_NAME,
  revokedAt: null,
});

const findActiveTimetableFeed = async (userId: string, secret: string) => {
  const first = await prisma.calendarShareToken.findFirst({
    where: feedWhere(userId),
    orderBy: { createdAt: "asc" },
    select: feedSelect,
  });
  if (first && (await isValidTimetableFeed(first, secret))) return first;

  const rows = await prisma.calendarShareToken.findMany({
    where: feedWhere(userId),
    orderBy: { createdAt: "asc" },
    select: feedSelect,
  });
  for (const row of rows) {
    // NOSONAR: creation order is part of the deterministic fallback contract;
    // stop at the first valid feed instead of racing validation requests.
    if (await isValidTimetableFeed(row, secret)) return row;
  }
  return null;
};

const isValidTimetableFeed = async (
  row: { id: string; tokenHash: string },
  secret: string,
) => {
  const token = await deriveCalendarFeedToken(secret, row.id);
  return row.tokenHash === (await sha256hash(token));
};

const createTimetableFeed = async (userId: string, secret: string) => {
  const id = crypto.randomUUID();
  const token = await deriveCalendarFeedToken(secret, id);
  return prisma.calendarShareToken.create({
    data: {
      id,
      name: TIMETABLE_FEED_NAME,
      tokenHash: await sha256hash(token),
      userId,
      includeFullDetails: false,
    },
    select: feedSelect,
  });
};

const convergeTimetableFeeds = async (
  userId: string,
  fallback: TimetableFeed,
  secret: string,
) => {
  const activeFeeds = await prisma.calendarShareToken.findMany({
    where: feedWhere(userId),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: feedSelect,
  });
  const validFeeds = (
    await Promise.all(
      activeFeeds.map(async (feed) =>
        (await isValidTimetableFeed(feed, secret)) ? feed : null,
      ),
    )
  ).filter((feed): feed is TimetableFeed => feed !== null);
  const [kept, ...duplicates] = validFeeds.length ? validFeeds : [fallback];
  await Promise.all(
    duplicates.map((duplicate) =>
      prisma.calendarShareToken.update({
        where: { id: duplicate.id },
        data: { revokedAt: new Date() },
      }),
    ),
  );
  return kept!;
};

const getOrCreateTimetableFeed = async (userId: string, secret: string) => {
  const existing = await findActiveTimetableFeed(userId, secret);
  const feed = existing ?? (await createTimetableFeed(userId, secret));
  return convergeTimetableFeeds(userId, feed, secret);
};

const revokeOtherValidTimetableFeeds = async (
  userId: string,
  created: TimetableFeed,
  secret: string,
) => {
  const activeFeeds = await prisma.calendarShareToken.findMany({
    where: feedWhere(userId),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: feedSelect,
  });
  await Promise.all(
    activeFeeds
      .filter((feed) => feed.id !== created.id)
      .map(async (feed) => {
        if (!(await isValidTimetableFeed(feed, secret))) return;
        await prisma.calendarShareToken.update({
          where: { id: feed.id },
          data: { revokedAt: new Date() },
        });
      }),
  );
};

const timetableFeedResponse = async (
  c: any,
  userId: string,
  feed: any,
  secret: string,
) => {
  const token = await deriveCalendarFeedToken(secret, feed.id);
  const url = publicCalendarUrl(c, userId, token);
  return {
    url,
    webcalUrl: webcalUrl(url),
    createdAt: feed.createdAt,
  };
};

const unauthorizedCalendar = () =>
  new HTTPException(403, {
    message: "Unauthorized access to this calendar",
  });

const rejectUnauthorized = (c: any): never => {
  c.header("Cache-Control", "no-store");
  throw unauthorizedCalendar();
};

type StoredCourses = Record<string, string[]>;

// Worker-local mirror of packages/shared/src/constants/semester.ts. The secure
// API package cannot safely import the shared package at runtime in this repo;
// calendar.test.ts compares this table with the canonical source.
const parseSemesterDate = (value: string) => {
  const [year, month, day] = value.split(",").map(Number);
  return new Date(year!, month!, day!);
};

export const SEMESTER_INFO = `
10810|2019,8,9|2020,0,12
10820|2020,1,17|2020,5,21
10910|2020,8,14|2021,0,29
10920|2021,1,22|2021,5,25
11010|2021,8,13|2022,0,14
11020|2022,1,14|2022,5,17
11110|2022,8,12|2023,0,13
11120|2023,1,13|2023,5,16
11210|2023,8,11|2024,0,12
11220|2024,1,19|2024,5,23
11310|2024,8,2|2024,11,22
11320|2025,1,17|2025,5,8
11410|2025,8,1|2025,11,21
11420|2026,1,23|2026,5,14
11510|2026,8,7|2026,11,27
`
  .trim()
  .split("\n")
  .map((row) => {
    const [id, begins, ends] = row.split("|");
    return {
      id: id!,
      begins: parseSemesterDate(begins!),
      ends: parseSemesterDate(ends!),
    };
  });

const normalizeStoredCourses = (value: unknown): StoredCourses => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([semester, courseIds]) => {
      if (!Array.isArray(courseIds)) return [];
      const ids = courseIds.filter(
        (courseId): courseId is string =>
          typeof courseId === "string" && courseId.length > 0,
      );
      return ids.length > 0 ? [[semester, ids]] : [];
    }),
  );
};

const readStoredCourses = async (
  c: any,
  userId: string,
): Promise<StoredCourses> => {
  try {
    const { adminFirestore } = getFirebaseAdmin(c);
    const snapshot = await adminFirestore
      .collection("users")
      .doc(userId)
      .collection("storage")
      .doc("courses")
      .get();
    if (!snapshot.exists) return {};
    const data = snapshot.data();
    return normalizeStoredCourses(data?.["value"] ?? data);
  } catch (error) {
    console.error(`Error reading timetable storage for ${userId}:`, error);
    return {};
  }
};

const semestersWithCurrentClasses = (courses: StoredCourses) => {
  const now = new Date();
  const currentSemester = SEMESTER_INFO.find(
    (semester) => now >= semester.begins && now <= semester.ends,
  );
  const currentId = currentSemester?.id ?? SEMESTER_INFO.at(-1)?.id ?? "";
  return Object.entries(courses)
    .filter(([id]) => {
      const knownSemester = SEMESTER_INFO.find(
        (semester) => semester.id === id,
      );
      return knownSemester ? knownSemester.ends >= now : id > currentId;
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 6);
};

export const trimTrailingSlashes = (value: string) => {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end -= 1;
  return value.slice(0, end);
};

const timetableApiUrl = (c: any) => {
  const { COURSEWEB_API_URL } = env<{ COURSEWEB_API_URL?: string }>(c);
  return trimTrailingSlashes(COURSEWEB_API_URL || DEFAULT_TIMETABLE_API_URL);
};

type AcademicCalendarEvent = {
  id: string;
  summary: string;
  date: string;
  courseSelectionPeriod?: {
    startDate?: string;
    endDate?: string;
  } | null;
};

const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const isDateKey = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = dateKeyPattern.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    Number(match[2]) >= 1 &&
    Number(match[2]) <= 12 &&
    Number(match[3]) >= 1 &&
    Number(match[3]) <= 31
  );
};

const dateKeyFromNow = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  ) as Record<"year" | "month" | "day", string>;
  return `${values["year"]}-${values["month"]}-${values["day"]}`;
};

const addDateKey = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const academicCalendarCache = new Map<
  string,
  {
    expiresAt: number;
    events: AcademicCalendarEvent[];
    hasSuccessfulData: boolean;
  }
>();
const academicCalendarFailureWindows = new Set<string>();

export const clearAcademicCalendarCache = () => {
  academicCalendarCache.clear();
  academicCalendarFailureWindows.clear();
};

const normalizeAcademicCalendarEvents = (
  value: unknown,
): AcademicCalendarEvent[] | null => {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const event = item as Record<string, unknown>;
    if (
      typeof event["id"] !== "string" ||
      typeof event["summary"] !== "string" ||
      !isDateKey(event["date"])
    ) {
      return [];
    }
    const period = event["courseSelectionPeriod"];
    const courseSelectionPeriod =
      period && typeof period === "object"
        ? {
            startDate: isDateKey(
              (period as Record<string, unknown>)["startDate"],
            )
              ? (period as Record<string, string>)["startDate"]
              : undefined,
            endDate: isDateKey((period as Record<string, unknown>)["endDate"])
              ? (period as Record<string, string>)["endDate"]
              : undefined,
          }
        : null;
    return [
      {
        id: event["id"] as string,
        summary: event["summary"] as string,
        date: event["date"] as string,
        courseSelectionPeriod,
      },
    ];
  });
};

const fetchAcademicCalendarEvents = async (
  c: any,
): Promise<AcademicCalendarEvent[]> => {
  const now = new Date();
  const today = dateKeyFromNow(now);
  const start = addDateKey(today, -30);
  const end = addDateKey(today, 240);
  const cacheKey = `${timetableApiUrl(c)}|${start}|${end}`;
  const cached = academicCalendarCache.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime()) return cached.events;

  const url = new URL("/acacalendar", `${timetableApiUrl(c)}/`);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`upstream returned ${response.status}`);
    }
    const events = normalizeAcademicCalendarEvents(await response.json());
    if (!events) throw new Error("upstream returned an unexpected payload");
    academicCalendarCache.set(cacheKey, {
      expiresAt: now.getTime() + ACADEMIC_CALENDAR_CACHE_TTL_MS,
      events,
      hasSuccessfulData: true,
    });
    academicCalendarFailureWindows.delete(cacheKey);
    return events;
  } catch (error) {
    if (!academicCalendarFailureWindows.has(cacheKey)) {
      academicCalendarFailureWindows.add(cacheKey);
      console.error(
        `Error fetching academic calendar for ${start}..${end}:`,
        error,
      );
    }
    academicCalendarCache.set(cacheKey, {
      expiresAt: now.getTime() + ACADEMIC_CALENDAR_FAILURE_RETRY_MS,
      events: cached?.hasSuccessfulData ? cached.events : [],
      hasSuccessfulData: cached?.hasSuccessfulData ?? false,
    });
    return cached?.hasSuccessfulData ? cached.events : [];
  }
};

const stripCalendarLineBreaks = (value: string) => value.replace(/[\r\n]/g, "");

const academicCalendarUid = async (id: string) => {
  const safeId = /^[A-Za-z0-9_-]{1,64}$/.test(id)
    ? id
    : (await sha256hash(id)).slice(0, 16);
  return `aca-${safeId}@nthumods.com`;
};

const academicCalendarIcs = async (
  events: AcademicCalendarEvent[],
  now = new Date(),
) => {
  const calendar = ical({
    name: "NTHU Academic Calendar",
    prodId: { company: "NTHUMods", product: "Calendar" },
    scale: "gregorian",
    method: ICalCalendarMethod.PUBLISH,
    timezone: "UTC",
  });
  const stamp = new Date(
    Math.floor(now.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000),
  );

  for (const event of events) {
    const period = event.courseSelectionPeriod;
    const start =
      period?.startDate && isDateKey(period.startDate)
        ? period.startDate
        : event.date;
    const inclusiveEnd =
      period?.endDate && isDateKey(period.endDate) && period.endDate >= start
        ? period.endDate
        : start;
    calendar.createEvent({
      id: await academicCalendarUid(event.id),
      stamp,
      start: new Date(`${start}T00:00:00Z`),
      end: new Date(`${addDateKey(inclusiveEnd, 1)}T00:00:00Z`),
      allDay: true,
      summary: stripCalendarLineBreaks(event.summary),
      transparency: ICalEventTransparency.TRANSPARENT,
      categories: [{ name: "NTHU Academic" }],
    });
  }
  return calendar.toString();
};

const fetchTimetableCalendars = async (
  c: any,
  courses: StoredCourses,
): Promise<string[]> => {
  const calendars = await Promise.all(
    semestersWithCurrentClasses(courses).map(async ([semester, courseIds]) => {
      const url = new URL("/timetable/calendar.ics", `${timetableApiUrl(c)}/`);
      url.searchParams.set("semester", semester);
      url.searchParams.set(`semester_${semester}`, courseIds.join(","));
      if (url.toString().length > 8000) {
        console.error(
          `Skipping timetable calendar for ${semester}: URL too long`,
        );
        return null;
      }
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          throw new Error(`upstream returned ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        console.error(
          `Error fetching timetable calendar for ${semester}:`,
          error,
        );
        return null;
      }
    }),
  );
  return calendars.filter((calendar): calendar is string => calendar !== null);
};

const foldCalendarLine = (line: string) => {
  const chunks: string[] = [];
  let chunk = "";
  let limit = 75;
  for (const character of Array.from(line)) {
    const next = chunk + character;
    if (new TextEncoder().encode(next).length > limit && chunk) {
      chunks.push(chunk);
      chunk = character;
      limit = 74;
    } else {
      chunk = next;
    }
  }
  if (chunk || chunks.length === 0) chunks.push(chunk);
  return chunks.map((value, index) => (index === 0 ? value : ` ${value}`));
};

const normalizeCalendarLines = (calendar: string) => {
  const unfolded: string[] = [];
  for (const line of calendar
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else if (line.length > 0) {
      unfolded.push(line);
    }
  }
  return unfolded.flatMap(foldCalendarLine);
};

const eventBlocksFrom = (calendar: string) => {
  const lines = normalizeCalendarLines(calendar);
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index] !== "BEGIN:VEVENT") {
      index += 1;
      continue;
    }
    const end = lines.indexOf("END:VEVENT", index + 1);
    if (end < 0) {
      index += 1;
      continue;
    }
    blocks.push(lines.slice(index, end + 1).join("\r\n"));
    index = end + 1;
  }
  return blocks;
};

const eventUid = (block: string) => /(?:^|\r\n)UID:([^\r\n]*)/.exec(block)?.[1];

const mergeCalendarEvents = (
  calendar: string,
  timetableCalendars: string[],
  academicCalendars: string[] = [],
) => {
  const baseLines = normalizeCalendarLines(calendar);
  const classEvents = timetableCalendars.flatMap(eventBlocksFrom);
  const baseEvents = eventBlocksFrom(calendar);
  const academicEvents = academicCalendars.flatMap(eventBlocksFrom);
  const seenUids = new Set<string>();
  const events: string[] = [];
  for (const event of [...classEvents, ...baseEvents, ...academicEvents]) {
    const uid = eventUid(event);
    if (uid && seenUids.has(uid)) {
      console.warn(`Skipping duplicate calendar event UID: ${uid}`);
      continue;
    }
    if (uid) seenUids.add(uid);
    events.push(event);
  }

  const firstEvent = baseLines.indexOf("BEGIN:VEVENT");
  const lastEvent = baseLines.lastIndexOf("END:VEVENT");
  const endCalendar = baseLines.lastIndexOf("END:VCALENDAR");
  if (endCalendar < 0) return baseLines.join("\r\n") + "\r\n";
  const prefix = baseLines.slice(0, firstEvent >= 0 ? firstEvent : endCalendar);
  const suffix = baseLines.slice(lastEvent >= 0 ? lastEvent + 1 : endCalendar);
  return (
    [
      ...prefix,
      ...events.flatMap((event) => event.split("\r\n")),
      ...suffix,
    ].join("\r\n") + "\r\n"
  );
};

const matchesIfNoneMatch = (value: string | undefined, etag: string) =>
  value?.split(",").some((candidate) => {
    const trimmed = candidate.trim();
    return (
      trimmed === "*" ||
      trimmed.replace(/^W\//i, "") === etag.replace(/^W\//i, "")
    );
  }) ?? false;

const etagFor = async (body: string) => `"${await sha256hash(body)}"`;

export const createCalendarApp = (
  authFactory: (scopes: string[]) => MiddlewareHandler = lazyRequireAuth,
) => {
  const auth = (scopes: string[]) => authFactory(scopes);
  return (
    new Hono()
      .get("/feed", auth(["calendar"]), async (c) => {
        const secret = getCalendarFeedSecret(c);
        if (!secret) {
          throw new HTTPException(503, {
            message: "Calendar feed unavailable",
          });
        }
        const feed = await getOrCreateTimetableFeed(c.var.user.userId, secret);
        return c.json(
          await timetableFeedResponse(c, c.var.user.userId, feed, secret),
        );
      })
      .post("/feed/rotate", auth(["calendar"]), async (c) => {
        const secret = getCalendarFeedSecret(c);
        if (!secret) {
          throw new HTTPException(503, {
            message: "Calendar feed unavailable",
          });
        }
        const created = await createTimetableFeed(c.var.user.userId, secret);
        await revokeOtherValidTimetableFeeds(
          c.var.user.userId,
          created,
          secret,
        );
        return c.json(
          await timetableFeedResponse(c, c.var.user.userId, created, secret),
        );
      })
      .get("/share-tokens", auth(["calendar"]), async (c) => {
        const tokens = await prisma.calendarShareToken.findMany({
          where: {
            userId: c.var.user.userId,
            revokedAt: null,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            includeFullDetails: true,
            expiresAt: true,
            createdAt: true,
            lastUsedAt: true,
          },
        });

        return c.json(tokens);
      })
      .post(
        "/share-tokens",
        auth(["calendar"]),
        zValidator(
          "json",
          z.object({
            name: z.string().trim().min(1).max(80).default("Calendar share"),
            includeFullDetails: z.boolean().default(false),
            expiresAt: z.string().datetime().optional(),
          }),
        ),
        async (c) => {
          const user = c.var.user;
          const { name, includeFullDetails, expiresAt } = c.req.valid("json");
          if (name === TIMETABLE_FEED_NAME) {
            throw new HTTPException(400, {
              message: "This calendar share name is reserved",
            });
          }
          const token = generateCalendarShareToken();
          const tokenHash = await sha256hash(token);

          const shareToken = await prisma.calendarShareToken.create({
            data: {
              name,
              tokenHash,
              userId: user.userId,
              includeFullDetails,
              expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            },
            select: {
              id: true,
              name: true,
              includeFullDetails: true,
              expiresAt: true,
              createdAt: true,
            },
          });

          return c.json(
            {
              ...shareToken,
              token,
              url: publicCalendarUrl(c, user.userId, token),
            },
            201,
          );
        },
      )
      .delete(
        "/share-tokens/:id",
        auth(["calendar"]),
        zValidator(
          "param",
          z.object({
            id: z.string().uuid(),
          }),
        ),
        async (c) => {
          const { id } = c.req.valid("param");
          const existing = await prisma.calendarShareToken.findFirst({
            where: {
              id,
              userId: c.var.user.userId,
              revokedAt: null,
            },
          });

          if (!existing) {
            return c.json({ error: "Calendar share token not found" }, 404);
          }

          await prisma.calendarShareToken.update({
            where: { id },
            data: { revokedAt: new Date() },
          });

          return c.json({ success: true });
        },
      )
      // Public endpoint for accessing calendar via dedicated share token
      .get(
        "/ics/:userId",
        zValidator(
          "param",
          z.object({
            userId: z.string(),
          }),
        ),
        zValidator(
          "query",
          z.object({
            token: z.string().optional(),
            type: z.enum(["basic", "full"]).default("basic"),
            include: z.string().optional(),
          }),
        ),
        async (c) => {
          const { userId } = c.req.valid("param");
          const {
            token,
            type: calendarType,
            include: includeQuery,
          } = c.req.valid("query");
          const includes = parseCalendarIncludes(includeQuery);

          if (!token) rejectUnauthorized(c);
          const suppliedToken = token as string;

          let includeFullDetails = false;

          const tokenHash = await sha256hash(suppliedToken);
          const shareToken = await prisma.calendarShareToken.findUnique({
            where: { tokenHash },
            include: {
              user: {
                select: {
                  userId: true,
                },
              },
            },
          });

          if (!shareToken) rejectUnauthorized(c);
          const verifiedShareToken = shareToken as NonNullable<
            typeof shareToken
          >;
          if (verifiedShareToken.revokedAt) rejectUnauthorized(c);
          if (
            verifiedShareToken.expiresAt &&
            verifiedShareToken.expiresAt < new Date()
          ) {
            rejectUnauthorized(c);
          }
          if (verifiedShareToken.user.userId !== userId) rejectUnauthorized(c);

          const feedSecret =
            verifiedShareToken.name === TIMETABLE_FEED_NAME
              ? getCalendarFeedSecret(c)
              : null;
          const isTimetableFeed =
            !!feedSecret &&
            (await verifyCalendarFeedToken(
              feedSecret,
              verifiedShareToken.id,
              suppliedToken,
            ));

          includeFullDetails =
            verifiedShareToken.includeFullDetails && calendarType === "full";

          await prisma.calendarShareToken.update({
            where: { id: verifiedShareToken.id },
            data: { lastUsedAt: new Date() },
          });

          try {
            // Generate calendar data using the iCalendar utility
            const baseCalendar = await createICalendar(
              userId,
              includeFullDetails,
              c,
              undefined,
              undefined,
              undefined,
              includes.has("events"),
            );
            const timetableCalendars: string[] = [];
            if (isTimetableFeed && includes.has("classes")) {
              timetableCalendars.push(
                ...(await fetchTimetableCalendars(
                  c,
                  await readStoredCourses(c, userId),
                )),
              );
            }
            const academicCalendars: string[] = [];
            if (includes.has("academic")) {
              const academicEvents = await fetchAcademicCalendarEvents(c);
              if (academicEvents.length > 0) {
                academicCalendars.push(
                  await academicCalendarIcs(academicEvents),
                );
              }
            }
            const calendar =
              timetableCalendars.length || academicCalendars.length
                ? mergeCalendarEvents(
                    baseCalendar,
                    timetableCalendars,
                    academicCalendars,
                  )
                : baseCalendar;
            const includeKey = CALENDAR_FEED_INCLUDES.filter((include) =>
              includes.has(include),
            ).join(",");
            const etag = await etagFor(`${includeKey}\n${calendar}`);

            // Set proper content type for iCalendar file
            c.header("Content-Type", "text/calendar");
            c.header(
              "Content-Disposition",
              `attachment; filename=${userId}_calendar.ics`,
            );
            c.header("Cache-Control", CALENDAR_FEED_CACHE_CONTROL);
            c.header("ETag", etag);

            if (matchesIfNoneMatch(c.req.header("If-None-Match"), etag)) {
              return c.body(null, 304);
            }

            return c.body(calendar);
          } catch (error) {
            console.error("Error generating calendar:", error);
            throw new HTTPException(500, {
              message: "Failed to generate calendar",
            });
          }
        },
      )
      // Authenticated endpoint for accessing calendar data
      .get("/", verifyApiKey, requireScope("calendar:read"), async (c) => {
        // Type assertion for user to handle the 'unknown' type issue
        const user = c.get("user") as {
          userId: string;
          name: string;
          email: string;
        };

        try {
          const currentDate = new Date();
          const sixMonthsFromNow = addDays(currentDate, 180); // Look ahead 6 months

          // Use Firebase to fetch calendar events with optimized query
          const { adminFirestore } = getFirebaseAdmin(c);
          const eventsRef = adminFirestore
            .collection("users")
            .doc(user.userId)
            .collection("events");

          // Optimized query with proper indexing for date range filtering
          const eventsSnapshot = await eventsRef
            .where("start", "<=", sixMonthsFromNow.toISOString())
            .where("end", ">=", currentDate.toISOString())
            .orderBy("start", "asc")
            .limit(50) // Reasonable limit for API response
            .get();

          // Convert Firebase documents to event objects
          const formattedEvents = eventsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data["title"],
              details: data["details"],
              location: data["location"],
              start: data["start"],
              end: data["end"],
              allDay: data["allDay"] || false,
              repeat: data["repeat"],
              color: data["color"],
              tag: data["tag"],
            };
          });
          return c.json({
            userId: user.userId,
            events: formattedEvents,
          });
        } catch (error) {
          console.error("Error fetching calendar data:", error);
          throw new HTTPException(500, {
            message: "Failed to fetch calendar data",
          });
        }
      })
  );
};

const app = createCalendarApp();

export default app;
