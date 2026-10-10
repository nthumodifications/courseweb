import { zValidator } from "@hono/zod-validator";
import type {
  D1Database,
  D1PreparedStatement,
} from "@cloudflare/workers-types";
import { Hono } from "hono";
import {
  HTMLTableCellElement,
  HTMLTableElement,
  HTMLTableRowElement,
  HTMLOptionElement,
  parseHTML,
} from "linkedom/worker";
import { z } from "zod";

import type { Bindings } from "./index";
import { rateLimitMiddleware } from "./utils/rate-limit";

const CCXP_ORIGIN = "https://www.ccxp.nthu.edu.tw";
const FORM_URL = `${CCXP_ORIGIN}/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84201.php`;
const RESULTS_URL = `${CCXP_ORIGIN}/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84202.php`;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 2_500_000;
const REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const COURSE_STATISTIC_COLUMNS = 8;
const MAX_ROWS_PER_STATEMENT = Math.floor(100 / COURSE_STATISTIC_COLUMNS);

const acixStoreSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid session value");
const semesterSchema = z
  .string()
  .regex(/^\d{3}\|(10|20|30)$/, "Invalid semester");

const contributionBodySchema = z.object({
  ACIXSTORE: acixStoreSchema,
  semester: semesterSchema.optional(),
});

const courseCodeSchema = z.object({
  courseCode: z.string().trim().min(1).max(64),
});

export type CourseStatisticRow = {
  rawId: string;
  courseCode: string;
  semester: string;
  enrollment: number;
  scale: "gpa" | "percent";
  average: number;
  stdDev: number;
};

export type ParsedSemesterPage = {
  expectedCount: number;
  rows: CourseStatisticRow[];
};

export type SemesterOption = {
  value: string;
  label: string;
};

class ContributionError extends Error {
  constructor(
    readonly code:
      | "session_expired"
      | "school_unreachable"
      | "school_response_invalid"
      | "invalid_semester"
      | "nothing_found"
      | "storage_error",
    readonly status: 400 | 401 | 404 | 502 | 500,
  ) {
    super(code);
  }
}

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const compactSemester = (value: string) => value.replace("|", "");

const parseNumber = (value: string) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const responseHasSessionError = (html: string) =>
  html.includes("session is interrupted!");

export function parseSemesterOptions(html: string): SemesterOption[] {
  if (responseHasSessionError(html)) {
    throw new ContributionError("session_expired", 401);
  }

  const doc = parseHTML(html).document;
  const options = Array.from(
    doc.querySelectorAll("select[name=qyt] option") as HTMLOptionElement[],
  ).flatMap((option) => {
    const value = option.getAttribute("value") ?? "";
    if (!semesterSchema.safeParse(value).success) return [];
    return [{ value, label: normalizeText(option.textContent) }];
  });

  if (options.length === 0) {
    throw new ContributionError("school_response_invalid", 502);
  }
  return options;
}

export function parseSemesterPage(
  html: string,
  semester: string,
): ParsedSemesterPage {
  if (responseHasSessionError(html)) {
    throw new ContributionError("session_expired", 401);
  }
  if (html.includes("學年有誤")) {
    throw new ContributionError("invalid_semester", 400);
  }

  const doc = parseHTML(html).document;
  const bodyText = normalizeText(doc.body?.textContent);
  const expectedCountMatch = bodyText.match(/共\s*(\d+)\s*科目/);
  const expectedCount = expectedCountMatch
    ? Number.parseInt(expectedCountMatch[1], 10)
    : 0;
  const isEmptyResult = bodyText.includes("查無平均值及標準差資料");
  const compact = compactSemester(semester);

  const table = Array.from(
    doc.querySelectorAll("table") as HTMLTableElement[],
  ).find((candidate) =>
    Array.from(candidate.querySelectorAll("tr") as HTMLTableRowElement[]).some(
      (row) => {
        const cells = row.querySelectorAll("td,th");
        const text = normalizeText(row.textContent);
        return (
          cells.length === 6 &&
          text.includes("科號") &&
          text.includes("Course No.")
        );
      },
    ),
  );

  if (!table) {
    if (isEmptyResult && expectedCount === 0) {
      return { expectedCount: 0, rows: [] };
    }
    throw new ContributionError("school_response_invalid", 502);
  }

  const rows = Array.from(table.querySelectorAll("tr") as HTMLTableRowElement[])
    .map((row) =>
      Array.from(row.querySelectorAll("td") as HTMLTableCellElement[]),
    )
    .filter((cells) => cells.length === 8)
    .map((cells) => {
      const rawId = normalizeText(cells[0].textContent);
      const enrollmentText = normalizeText(cells[3].textContent);
      const enrollment = Number.parseInt(enrollmentText, 10);
      const gpaAverage = parseNumber(normalizeText(cells[4].textContent));
      const gpaStdDev = parseNumber(normalizeText(cells[5].textContent));
      const percentAverage = parseNumber(normalizeText(cells[6].textContent));
      const percentStdDev = parseNumber(normalizeText(cells[7].textContent));

      if (
        !rawId.startsWith(compact) ||
        !Number.isSafeInteger(enrollment) ||
        enrollment < 0
      ) {
        throw new ContributionError("school_response_invalid", 502);
      }

      const gpaComplete = gpaAverage !== null && gpaStdDev !== null;
      const percentComplete = percentAverage !== null && percentStdDev !== null;
      if (!gpaComplete && !percentComplete) {
        throw new ContributionError("school_response_invalid", 502);
      }

      const scale = gpaComplete ? "gpa" : "percent";
      const average = gpaComplete ? gpaAverage! : percentAverage!;
      const stdDev = gpaComplete ? gpaStdDev! : percentStdDev!;
      return {
        rawId,
        courseCode: rawId.slice(5),
        semester: compact,
        enrollment,
        scale,
        average,
        stdDev,
      } satisfies CourseStatisticRow;
    });

  if (rows.length !== expectedCount) {
    throw new ContributionError("school_response_invalid", 502);
  }
  return { expectedCount, rows };
}

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch {
    throw new ContributionError("school_unreachable", 502);
  } finally {
    clearTimeout(timeout);
  }
};

const readCcXpHtml = async (response: Response) => {
  if (!response.ok) {
    throw new ContributionError("school_unreachable", 502);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new ContributionError("school_response_invalid", 502);
  }
  const html = new TextDecoder("big5").decode(bytes);
  if (responseHasSessionError(html)) {
    throw new ContributionError("session_expired", 401);
  }
  return { bytes, html };
};

const buildCcXpUrl = (base: string, acixStore: string) => {
  const url = new URL(base);
  url.searchParams.set("ACIXSTORE", acixStore);
  return url;
};

export async function fetchSemesterOptions(acixStore: string) {
  const response = await fetchWithTimeout(buildCcXpUrl(FORM_URL, acixStore), {
    method: "GET",
    headers: { accept: "text/html" },
  });
  const { html } = await readCcXpHtml(response);
  return parseSemesterOptions(html);
}

export async function fetchSemesterPage(acixStore: string, semester: string) {
  const body = new URLSearchParams({
    ACIXSTORE: acixStore,
    qyt: semester,
    kwc: "",
    kwt: "",
    sort: "ckey",
  });
  const response = await fetchWithTimeout(RESULTS_URL, {
    method: "POST",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  return readCcXpHtml(response);
}

const sha256 = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

type SemesterMeta = {
  semester: string;
  contentHash: string;
  courseCount: number;
  updatedAt: string;
};

const readSemesterMeta = async (db: D1Database, semester: string) =>
  db
    .prepare(
      `SELECT "semester", "contentHash", "courseCount", "updatedAt"
       FROM "CourseStatisticSemester" WHERE "semester" = ?`,
    )
    .bind(semester)
    .first<SemesterMeta>();

const readSemesterRowCount = async (db: D1Database, semester: string) => {
  const result = await db
    .prepare(
      `SELECT COUNT(*) AS "count"
       FROM "CourseStatistic" WHERE "semester" = ?`,
    )
    .bind(semester)
    .first<{ count: number }>();
  return result?.count ?? 0;
};

const isRecentlyRefreshed = (meta: SemesterMeta | null, now: Date) => {
  if (!meta) return false;
  const updatedAt = Date.parse(meta.updatedAt);
  return (
    Number.isFinite(updatedAt) &&
    now.getTime() - updatedAt < REFRESH_COOLDOWN_MS
  );
};

const makeUpsertStatement = (
  db: D1Database,
  rows: CourseStatisticRow[],
  updatedAt: string,
  expectedMeta: SemesterMeta | null,
): D1PreparedStatement => {
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const values = rows.flatMap((row) => [
    row.rawId,
    row.courseCode,
    row.semester,
    row.enrollment,
    row.scale,
    row.average,
    row.stdDev,
    updatedAt,
  ]);
  const guard = expectedMeta
    ? `EXISTS (
         SELECT 1 FROM "CourseStatisticSemester"
         WHERE "semester" = ? AND "contentHash" = ? AND "updatedAt" = ?
       )`
    : `NOT EXISTS (
         SELECT 1 FROM "CourseStatisticSemester" WHERE "semester" = ?
       )`;
  values.push(
    ...(expectedMeta
      ? [
          expectedMeta.semester,
          expectedMeta.contentHash,
          expectedMeta.updatedAt,
        ]
      : [rows[0].semester]),
  );
  return db
    .prepare(
      `INSERT INTO "CourseStatistic"
         ("rawId", "courseCode", "semester", "enrollment", "scale", "average", "stdDev", "updatedAt")
       SELECT * FROM (VALUES ${placeholders}) WHERE ${guard}
       ON CONFLICT ("rawId") DO UPDATE SET
         "courseCode" = excluded."courseCode",
         "semester" = excluded."semester",
         "enrollment" = excluded."enrollment",
         "scale" = excluded."scale",
         "average" = excluded."average",
         "stdDev" = excluded."stdDev",
         "updatedAt" = excluded."updatedAt"`,
    )
    .bind(...values);
};

const writeSemester = async (
  db: D1Database,
  semester: string,
  parsed: ParsedSemesterPage,
  contentHash: string,
  now: Date,
  expectedMeta: SemesterMeta | null,
) => {
  const updatedAt = now.toISOString();
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < parsed.rows.length; i += MAX_ROWS_PER_STATEMENT) {
    statements.push(
      makeUpsertStatement(
        db,
        parsed.rows.slice(i, i + MAX_ROWS_PER_STATEMENT),
        updatedAt,
        expectedMeta,
      ),
    );
  }
  const guard = expectedMeta
    ? `EXISTS (
         SELECT 1 FROM "CourseStatisticSemester"
         WHERE "semester" = ? AND "contentHash" = ? AND "updatedAt" = ?
       )`
    : `NOT EXISTS (
         SELECT 1 FROM "CourseStatisticSemester" WHERE "semester" = ?
       )`;
  const guardValues = expectedMeta
    ? [expectedMeta.semester, expectedMeta.contentHash, expectedMeta.updatedAt]
    : [semester];
  statements.push(
    db
      .prepare(
        `DELETE FROM "CourseStatistic"
         WHERE "semester" = ? AND "updatedAt" < ? AND ${guard}`,
      )
      .bind(semester, updatedAt, ...guardValues),
  );
  statements.push(
    expectedMeta
      ? db
          .prepare(
            `UPDATE "CourseStatisticSemester"
             SET "contentHash" = ?, "courseCount" = ?, "updatedAt" = ?
             WHERE "semester" = ? AND "contentHash" = ? AND "updatedAt" = ?`,
          )
          .bind(
            contentHash,
            parsed.expectedCount,
            updatedAt,
            semester,
            expectedMeta.contentHash,
            expectedMeta.updatedAt,
          )
      : db
          .prepare(
            `INSERT INTO "CourseStatisticSemester"
               ("semester", "contentHash", "courseCount", "updatedAt")
             SELECT ?, ?, ?, ?
             WHERE NOT EXISTS (
               SELECT 1 FROM "CourseStatisticSemester" WHERE "semester" = ?
             )`,
          )
          .bind(
            semester,
            contentHash,
            parsed.expectedCount,
            updatedAt,
            semester,
          ),
  );
  const results = await db.batch(statements);
  return Boolean(results.at(-1)?.meta?.changes);
};

const refreshLostToConcurrentWrite = async (
  db: D1Database,
  semester: string,
) => {
  const meta = await readSemesterMeta(db, semester);
  return {
    status: "already_up_to_date" as const,
    semester,
    savedCourses: meta?.courseCount ?? 0,
  };
};

export async function refreshSemester(
  db: D1Database,
  acixStore: string,
  semester: string,
  now = new Date(),
) {
  if (!semesterSchema.safeParse(semester).success) {
    throw new ContributionError("invalid_semester", 400);
  }

  const compact = compactSemester(semester);
  let meta: SemesterMeta | null;
  try {
    meta = await readSemesterMeta(db, compact);
  } catch {
    throw new ContributionError("storage_error", 500);
  }
  if (isRecentlyRefreshed(meta, now)) {
    return {
      status: "already_up_to_date" as const,
      semester: compact,
      savedCourses: meta?.courseCount ?? 0,
    };
  }

  const { bytes, html } = await fetchSemesterPage(acixStore, semester);
  const parsed = parseSemesterPage(html, semester);
  const contentHash = await sha256(bytes);

  try {
    if (parsed.expectedCount === 0) {
      const existingRowCount = await readSemesterRowCount(db, compact);
      if (existingRowCount > 0) {
        return {
          status: "no_data" as const,
          semester: compact,
          savedCourses: existingRowCount,
        };
      }
    }

    if (meta?.contentHash === contentHash) {
      const results = await db.batch([
        db
          .prepare(
            `UPDATE "CourseStatisticSemester"
             SET "courseCount" = ?, "updatedAt" = ?
             WHERE "semester" = ? AND "contentHash" = ? AND "updatedAt" = ?`,
          )
          .bind(
            parsed.expectedCount,
            now.toISOString(),
            compact,
            meta.contentHash,
            meta.updatedAt,
          ),
      ]);
      if (results[0]?.meta?.changes) {
        return {
          status: "already_up_to_date" as const,
          semester: compact,
          savedCourses: parsed.expectedCount,
        };
      }
      return await refreshLostToConcurrentWrite(db, compact);
    }
    const committed = await writeSemester(
      db,
      compact,
      parsed,
      contentHash,
      now,
      meta,
    );
    if (!committed) return await refreshLostToConcurrentWrite(db, compact);
  } catch {
    throw new ContributionError("storage_error", 500);
  }

  return {
    status:
      parsed.expectedCount === 0 ? ("no_data" as const) : ("saved" as const),
    semester: compact,
    savedCourses: parsed.expectedCount,
  };
}

const contributionRateLimit = rateLimitMiddleware({
  limiter: "CONTRIBUTE_RATE_LIMITER",
  errorMessage: "Too many contribution requests. Please try again later.",
});

const app = new Hono<{ Bindings: Bindings }>()
  .post(
    "/grades",
    contributionRateLimit,
    zValidator("form", contributionBodySchema, (result, c) => {
      if (result.success) return;
      const issuePath = result.error.issues[0]?.path[0];
      return c.json(
        {
          error:
            issuePath === "semester" ? "invalid_semester" : "invalid_session",
        },
        400,
      );
    }),
    async (c) => {
      const { ACIXSTORE: acixStore, semester } = c.req.valid("form");
      try {
        if (!semester) {
          const semesters = await fetchSemesterOptions(acixStore);
          return c.json({ semesters });
        }

        const result = await refreshSemester(c.env.DB, acixStore, semester);
        return c.json(result);
      } catch (error) {
        if (error instanceof ContributionError) {
          return c.json({ error: error.code }, error.status);
        }
        console.error(
          "Course statistics contribution failed",
          error instanceof Error ? error.name : "unknown",
        );
        return c.json({ error: "storage_error" }, 500);
      }
    },
  )
  .get(
    "/grades/:courseCode",
    zValidator("param", courseCodeSchema),
    async (c) => {
      const requestedCourseCode = normalizeText(
        c.req.valid("param").courseCode,
      );
      const courseCode = /^\d{5}/.test(requestedCourseCode)
        ? requestedCourseCode.slice(5)
        : requestedCourseCode;
      try {
        const rows = await c.env.DB.prepare(
          `SELECT "rawId", "courseCode", "semester", "enrollment", "scale", "average", "stdDev", "updatedAt"
           FROM "CourseStatistic" WHERE "courseCode" = ? ORDER BY "semester" DESC`,
        )
          .bind(courseCode)
          .all<CourseStatisticRow & { updatedAt: string }>();
        if (rows.results.length === 0) {
          return c.json({ error: "nothing_found" }, 404);
        }
        c.header("Cache-Control", "public, max-age=300");
        return c.json({ courseCode, statistics: rows.results });
      } catch {
        return c.json({ error: "storage_error" }, 500);
      }
    },
  );

export default app;
