import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { readMergedSemesterInfo } from "./scheduled/semester-dates";

export type SemesterResponse = {
  id: string;
  year: number;
  semester: number;
  begins: string;
  ends: string;
  hasCourses: boolean;
};

type SemesterDateRow = {
  id: string;
  year: number;
  semester: number;
  begins: Date;
  ends: Date;
  hasCourses: boolean;
};

type CourseCountResult = { count: number; checkedAt: number };
const COURSE_COUNT_TTL_MS = 30 * 60 * 1000;
const courseCountCache = new Map<string, CourseCountResult>();
export const clearSemesterCourseCountCache = () => courseCountCache.clear();

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const nextSemesterId = (id: string): string | undefined => {
  const match = /^(\d{3})(10|20|30)$/.exec(id);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (match[2] === "10") return `${match[1]}20`;
  if (match[2] === "20") return `${match[1]}30`;
  return `${String(year + 1).padStart(3, "0")}10`;
};

export const relevantCourseCountIds = (
  semesters: readonly SemesterDateRow[],
  now = new Date(),
): string[] => {
  const current =
    semesters.find(
      (semester) => now >= semester.begins && now <= semester.ends,
    ) ??
    [...semesters].reverse().find((semester) => semester.begins <= now) ??
    semesters[0];
  const ids = new Set(semesters.slice(-5).map((semester) => semester.id));
  const upcoming = semesters
    .filter((semester) => semester.begins > now)
    .slice(0, 2);
  for (const semester of upcoming) ids.add(semester.id);
  if (current) {
    ids.add(current.id);
    const next = nextSemesterId(current.id);
    if (next) {
      ids.add(next);
      const afterNext = nextSemesterId(next);
      if (afterNext) ids.add(afterNext);
    }
  }
  return [...ids].sort((left, right) => left.localeCompare(right));
};

const getCourseCount = async (
  semester: string,
  url: string,
  serviceRoleKey: string,
  now: number,
  fetcher: typeof fetch,
): Promise<number | undefined> => {
  const cached = courseCountCache.get(semester);
  if (cached && now - cached.checkedAt < COURSE_COUNT_TTL_MS) {
    return cached.count;
  }

  const requestUrl = new URL(`${url.replace(/\/$/, "")}/rest/v1/courses`);
  requestUrl.searchParams.set("select", "raw_id");
  requestUrl.searchParams.set("semester", `eq.${semester}`);
  try {
    const response = await fetcher(requestUrl, {
      method: "HEAD",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok)
      throw new Error(`Supabase course count HTTP ${response.status}`);
    const range = response.headers.get("Content-Range");
    const count = /\/(\d+)$/.exec(range ?? "")?.[1];
    if (count === undefined)
      throw new Error("Supabase course count was missing");
    const parsed = Number(count);
    courseCountCache.set(semester, { count: parsed, checkedAt: now });
    return parsed;
  } catch (error) {
    console.warn(`[semesters] course count unavailable for ${semester}`, error);
    return undefined;
  }
};

export const buildSemesterResponse = async (options: {
  semesters: readonly SemesterDateRow[];
  now?: Date;
  supabaseUrl?: string;
  serviceRoleKey?: string;
  fetcher?: typeof fetch;
}): Promise<SemesterResponse[]> => {
  const now = options.now ?? new Date();
  const relevantIds = new Set(relevantCourseCountIds(options.semesters, now));
  const response = await Promise.all(
    options.semesters.map(async (row) => {
      let hasCourses = row.hasCourses;
      if (
        relevantIds.has(row.id) &&
        options.supabaseUrl &&
        options.serviceRoleKey
      ) {
        const count = await getCourseCount(
          row.id,
          options.supabaseUrl,
          options.serviceRoleKey,
          now.getTime(),
          options.fetcher ?? fetch,
        );
        if (count !== undefined) hasCourses = count > 0;
      }
      return {
        id: row.id,
        year: row.year,
        semester: row.semester,
        begins: dateKey(row.begins),
        ends: dateKey(row.ends),
        hasCourses,
      };
    }),
  );
  return response.sort((left, right) => left.id.localeCompare(right.id));
};

const app = new Hono().get("/", async (c) => {
  const env = c.env as
    | {
        DB?: D1Database;
        SUPABASE_URL?: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
      }
    | undefined;
  const rows = await readMergedSemesterInfo(env?.DB);
  const semesters = await buildSemesterResponse({
    semesters: rows,
    supabaseUrl: env?.SUPABASE_URL,
    serviceRoleKey: env?.SUPABASE_SERVICE_ROLE_KEY,
  });
  return c.json(semesters, 200, {
    "Cache-Control":
      "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
  });
});

export default app;
