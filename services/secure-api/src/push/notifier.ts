import { Prisma } from "@prisma/client";
import prisma from "../client";
import { getVapidConfig, type VapidConfig } from "../config/push";
import {
  getCourseChanges,
  getCourseNames,
  type CourseChangeRow,
} from "./courseChanges";
import {
  sendPush,
  isRetriablePushResult,
  type PushDatabase,
  type PushPayload,
  type PushSendOptions,
  type PushSubscriptionRecord,
} from "./sender";
import {
  buildAnnouncementNotification,
  buildCourseNotification,
  buildCourseSummaryNotification,
  type AnnouncementArticle,
  type CourseName,
} from "./text";
import {
  createUserStorageStore,
  resolveUserStorageMode,
  type UserStore,
} from "../storage/userStore";
import { getFirebaseAdminFromProcessEnv } from "../config/firebase_admin";
import type { PushLanguage } from "../api/push";

const NOTIFIER_INTERVAL_MS = 10 * 60 * 1000;
const COURSE_CHANGE_BATCH_SIZE = 1000;
const COURSE_NOTIFICATION_LIMIT = 5;
const ANNOUNCEMENTS_URL = "https://api.nthumods.com/announcements";
const TAIPEI_TIME_ZONE = "Asia/Taipei";

export type NotifierSubscription = PushSubscriptionRecord & {
  userId: string;
  language: PushLanguage;
  courseChanges: boolean;
  announcementSources: string[];
  lastCourseChangeId: bigint;
  lastDigestDate: string | null;
};

type NotifierPushStore = PushDatabase["pushSubscription"] & {
  findMany(args: unknown): Promise<NotifierSubscription[]>;
  update(args: unknown): Promise<unknown>;
};

type NotifierDatabase = {
  pushSubscription: NotifierPushStore;
  $queryRaw<T>(query: unknown): Promise<T>;
};

type NotifierDependencies = {
  db?: NotifierDatabase;
  vapid?: VapidConfig;
  userStore?: UserStore;
  fetcher?: typeof fetch;
  send?: typeof sendPush;
  now?: () => Date;
  getCourseChanges?: typeof getCourseChanges;
  getCourseNames?: typeof getCourseNames;
};

type AnnouncementResponse = {
  articles: AnnouncementArticle[];
};

const defaultDatabase = prisma as unknown as NotifierDatabase;

const languageOf = (value: string): PushLanguage =>
  value === "en" || value === "zh-cn" ? value : "zh";

const asTimetable = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([semester, courses]) =>
      Array.isArray(courses) &&
      courses.every((course) => typeof course === "string")
        ? [[semester, courses]]
        : [],
    ),
  );
};

export const selectCourseChanges = (
  changes: readonly CourseChangeRow[],
  timetable: Record<string, readonly string[]>,
  cursor: bigint,
) => {
  const latestByCourse = new Map<string, CourseChangeRow>();
  for (const change of changes) {
    const id = BigInt(change.id);
    if (id <= cursor || !timetable[change.semester]?.includes(change.raw_id))
      continue;
    const existing = latestByCourse.get(change.raw_id);
    if (!existing || BigInt(existing.id) < id)
      latestByCourse.set(change.raw_id, change);
  }
  return [...latestByCourse.values()].sort((a, b) =>
    BigInt(a.id) < BigInt(b.id) ? -1 : 1,
  );
};

export const buildCourseNotifications = (
  changes: readonly CourseChangeRow[],
  courses: ReadonlyMap<string, CourseName>,
  language: PushLanguage,
) => {
  const individual = changes
    .slice(0, COURSE_NOTIFICATION_LIMIT - 1)
    .map((change) =>
      buildCourseNotification(change, courses.get(change.raw_id), language),
    );
  if (changes.length <= COURSE_NOTIFICATION_LIMIT - 1) return individual;
  return [
    ...individual,
    buildCourseSummaryNotification(
      changes.length - individual.length,
      language,
    ),
  ];
};

const dateParts = (date: Date) => {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    formatted.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
  };
};

export const selectAnnouncementDigest = (
  response: AnnouncementResponse,
  followedSourceIds: readonly string[],
  lastDigestDate: string | null,
  now: Date,
) => {
  // Dates are calendar days in Asia/Taipei: the first digest includes yesterday
  // and today, while later digests include dates strictly after lastDigestDate.
  const today = dateParts(now).date;
  const previousDate =
    lastDigestDate ??
    dateParts(new Date(now.getTime() - 24 * 60 * 60 * 1000)).date;
  const followed = new Set(followedSourceIds);
  return response.articles.filter(
    (article) =>
      (lastDigestDate
        ? article.date > previousDate
        : article.date >= previousDate) &&
      article.date <= today &&
      article.sourceIds.some((sourceId) => followed.has(sourceId)),
  );
};

export const shouldSendAnnouncementDigest = (
  lastDigestDate: string | null,
  now: Date,
) => {
  const parts = dateParts(now);
  return (
    (parts.hour > 8 || (parts.hour === 8 && parts.minute >= 0)) &&
    lastDigestDate !== parts.date
  );
};

const fetchAnnouncements = async (
  fetcher: typeof fetch,
): Promise<AnnouncementResponse> => {
  const response = await fetcher(ANNOUNCEMENTS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok)
    throw new Error(`Announcements returned ${response.status}`);
  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid announcements response");
  const articles = (payload as { articles?: unknown }).articles;
  if (!Array.isArray(articles))
    throw new Error("Invalid announcements articles");
  return {
    articles: articles.flatMap((article) => {
      if (!article || typeof article !== "object") return [];
      const value = article as Record<string, unknown>;
      return typeof value["title"] === "string" &&
        typeof value["link"] === "string" &&
        typeof value["date"] === "string" &&
        Array.isArray(value["sourceIds"]) &&
        value["sourceIds"].every((sourceId) => typeof sourceId === "string")
        ? [
            {
              title: value["title"],
              link: value["link"],
              date: value["date"],
              sourceIds: value["sourceIds"],
            },
          ]
        : [];
    }),
  };
};

const pushOptions = (ttl: number): PushSendOptions => ({ ttl });

const SUBSCRIPTION_PAGE_SIZE = 500;
const DELIVERY_CONCURRENCY = 8;
const LEASE_DURATION_MS = 9 * 60 * 1000;
const LEASE_MARGIN_MS = 60 * 1000;

const updateCursor = async (
  db: NotifierDatabase,
  subscription: NotifierSubscription,
  lastCourseChangeId: bigint,
) => {
  if (lastCourseChangeId <= subscription.lastCourseChangeId) return;
  try {
    await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { lastCourseChangeId },
    });
  } catch (error) {
    console.error(
      "Failed to advance push course cursor",
      error instanceof Error ? error.message : error,
    );
  }
};

const updateDigestDate = async (
  db: NotifierDatabase,
  subscription: NotifierSubscription,
  lastDigestDate: string,
) => {
  try {
    await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { lastDigestDate },
    });
  } catch (error) {
    console.error(
      "Failed to advance push digest date",
      error instanceof Error ? error.message : error,
    );
  }
};

const runWithConcurrency = async <T>(
  values: readonly T[],
  limit: number,
  canStart: () => boolean,
  worker: (value: T) => Promise<void>,
): Promise<boolean> => {
  let next = 0;
  const runWorker = async () => {
    while (canStart()) {
      const index = next++;
      if (index >= values.length) return;
      await worker(values[index]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(limit, values.length) },
      () => runWorker(),
    ),
  );
  return next >= values.length;
};

export const createPushNotifier = (dependencies: NotifierDependencies = {}) => {
  const db = dependencies.db ?? defaultDatabase;
  const vapid = dependencies.vapid ?? getVapidConfig();
  const fetcher = dependencies.fetcher ?? fetch;
  const send = dependencies.send ?? sendPush;
  const now = dependencies.now ?? (() => new Date());
  const readCourseChanges = dependencies.getCourseChanges ?? getCourseChanges;
  const readCourseNames = dependencies.getCourseNames ?? getCourseNames;
  const userStore =
    dependencies.userStore ??
    createUserStorageStore({
      mode: resolveUserStorageMode(),
      getFirestore: () => getFirebaseAdminFromProcessEnv().adminFirestore,
    });
  let running = false;

  const runUnlocked = async (deadline: number) => {
    if (!vapid) return;
    const timetablePromises = new Map<
      string,
      Promise<Record<string, string[]> | null>
    >();
    let announcementPromise: Promise<AnnouncementResponse> | undefined;

    const readTimetable = (userId: string) => {
      let promise = timetablePromises.get(userId);
      if (!promise) {
        promise = userStore
          .get(userId, "courses")
          .then((value) => asTimetable(value?.value))
          .catch((error) => {
            console.error(
              "Failed to read timetable for push notification",
              error instanceof Error ? error.message : error,
            );
            return null;
          });
        timetablePromises.set(userId, promise);
      }
      return promise;
    };

    const readAnnouncements = () => {
      announcementPromise ??= fetchAnnouncements(fetcher);
      return announcementPromise;
    };

    const processSubscription = async (
      subscription: NotifierSubscription,
      changes: CourseChangeRow[],
      courseNames: Map<string, CourseName>,
      currentTime: Date,
    ) => {
      const language = languageOf(subscription.language);
      if (subscription.courseChanges && changes.length > 0) {
        const timetable = await readTimetable(subscription.userId);
        if (timetable !== null) {
          const matchingChanges = selectCourseChanges(
            changes,
            timetable,
            subscription.lastCourseChangeId,
          );
          let retriableFailure = false;
          for (const notification of buildCourseNotifications(
            matchingChanges,
            courseNames,
            language,
          )) {
            try {
              const result = await send(
                subscription,
                notification as PushPayload,
                pushOptions(24 * 60 * 60),
                { db, vapid },
              );
              retriableFailure ||= isRetriablePushResult(result);
            } catch (error) {
              retriableFailure = true;
              console.error(
                "Push course delivery failed",
                error instanceof Error ? error.message : error,
              );
            }
          }
          if (!retriableFailure) {
            const maxId = changes.reduce((maximum, change) => {
              const id = BigInt(change.id);
              return id > maximum ? id : maximum;
            }, subscription.lastCourseChangeId);
            await updateCursor(db, subscription, maxId);
          }
        }
      }

      if (
        !subscription.announcementSources.length ||
        !shouldSendAnnouncementDigest(subscription.lastDigestDate, currentTime)
      ) {
        return;
      }
      const today = dateParts(currentTime).date;
      let digestSucceeded = false;
      try {
        const response = await readAnnouncements();
        const articles = selectAnnouncementDigest(
          response,
          subscription.announcementSources,
          subscription.lastDigestDate,
          currentTime,
        );
        digestSucceeded = true;
        if (articles.length > 0) {
          const result = await send(
            subscription,
            buildAnnouncementNotification(articles, language) as PushPayload,
            pushOptions(12 * 60 * 60),
            { db, vapid },
          );
          digestSucceeded = !isRetriablePushResult(result);
        }
      } catch (error) {
        console.error(
          "Failed to prepare announcement digest",
          error instanceof Error ? error.message : error,
        );
      }
      if (digestSucceeded) await updateDigestDate(db, subscription, today);
    };

    let cursor: string | undefined;
    while (now().getTime() < deadline - LEASE_MARGIN_MS) {
      const subscriptions = await db.pushSubscription.findMany(
        cursor
          ? {
              take: SUBSCRIPTION_PAGE_SIZE,
              skip: 1,
              cursor: { id: cursor },
              orderBy: { id: "asc" },
            }
          : {
              take: SUBSCRIPTION_PAGE_SIZE,
              orderBy: { id: "asc" },
            },
      );
      if (subscriptions.length === 0) break;
      const currentTime = now();
      const courseSubscriptions = subscriptions.filter(
        (subscription) => subscription.courseChanges,
      );
      let changes: CourseChangeRow[] = [];
      let courseNames = new Map<string, CourseName>();
      if (courseSubscriptions.length > 0) {
        const courseCursor = courseSubscriptions.reduce(
          (minimum, subscription) =>
            subscription.lastCourseChangeId < minimum
              ? subscription.lastCourseChangeId
              : minimum,
          courseSubscriptions[0].lastCourseChangeId,
        );
        try {
          changes = await readCourseChanges(
            courseCursor,
            COURSE_CHANGE_BATCH_SIZE,
          );
          courseNames = await readCourseNames([
            ...new Set(changes.map((change) => change.raw_id)),
          ]);
        } catch (error) {
          console.error(
            "Failed to prepare course change notifications",
            error instanceof Error ? error.message : error,
          );
          changes = [];
        }
      }
      const completed = await runWithConcurrency(
        subscriptions,
        DELIVERY_CONCURRENCY,
        () => now().getTime() < deadline - LEASE_MARGIN_MS,
        (subscription) =>
          processSubscription(subscription, changes, courseNames, currentTime),
      );
      if (!completed) break;
      if (subscriptions.length < SUBSCRIPTION_PAGE_SIZE) break;
      cursor = subscriptions[subscriptions.length - 1]?.id;
    }
  };

  const run = async () => {
    if (running) return false;
    running = true;
    const holder = crypto.randomUUID();
    try {
      const result = await db.$queryRaw<{ id: number }[]>(Prisma.sql`
        UPDATE "push_notifier_lease"
        SET "locked_until" = now() + interval '9 minutes', "holder" = ${holder}
        WHERE "id" = 1 AND "locked_until" < now()
        RETURNING "id"
      `);
      if (result.length === 0) return false;
      try {
        await runUnlocked(now().getTime() + LEASE_DURATION_MS);
        return true;
      } finally {
        await db.$queryRaw(Prisma.sql`
          UPDATE "push_notifier_lease"
          SET "locked_until" = now()
          WHERE "id" = 1 AND "holder" = ${holder}
        `);
      }
    } finally {
      running = false;
    }
  };

  return { run };
};

export const startPushNotifier = (dependencies: NotifierDependencies = {}) => {
  const notifier = createPushNotifier(dependencies);
  const timer = setInterval(() => void notifier.run(), NOTIFIER_INTERVAL_MS);
  void notifier.run();
  return { stop: () => clearInterval(timer), run: notifier.run };
};
