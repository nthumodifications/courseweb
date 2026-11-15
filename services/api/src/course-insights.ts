import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import {
  buildCourseInsights,
  getCourseInsightHistorySemesters,
  type CourseInsightCurrentRow,
  type CourseInsightHistoryRow,
  type CourseInsightsResponse,
} from "./course-insights-aggregation";

const PAGE_SIZE = 1_000;
const HISTORY_SELECT =
  "raw_id,semester,department,course,name_zh,name_en,capacity,enrolled,language";
const CURRENT_SELECT = `${HISTORY_SELECT},times,venues`;
const CURRENT_CACHE_CONTROL =
  "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400";
const PAST_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=31536000";
const LATEST_SEMESTER_CACHE_TTL_MS = 5 * 60 * 1000;
const SEMESTER_ID_PATTERN = /^\d{3}(10|20|30)$/;

let latestSemesterCache: { semester: string; expiresAt: number } | undefined;

const semesterQueryValidator = zValidator(
  "query",
  z.object({
    semester: z.string().regex(SEMESTER_ID_PATTERN).optional(),
  }),
);

export interface CourseInsightData {
  historyRows: CourseInsightHistoryRow[];
  currentRows: CourseInsightCurrentRow[];
}

export type CourseInsightDataLoader = (
  context: Context,
  semester: string,
) => Promise<CourseInsightData>;

export type LatestSemesterLoader = (context: Context) => Promise<string | null>;

export const loadLatestCourseSemester: LatestSemesterLoader = async (
  context,
) => {
  const now = Date.now();
  if (latestSemesterCache && latestSemesterCache.expiresAt > now) {
    return latestSemesterCache.semester;
  }

  const { data, error } = await supabase_server(context)
    .from("courses")
    .select("semester")
    .not("semester", "is", null)
    .order("semester", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const semester = (data as { semester?: string } | null)?.semester;
  if (!semester || !SEMESTER_ID_PATTERN.test(semester)) return null;

  latestSemesterCache = {
    semester,
    expiresAt: now + LATEST_SEMESTER_CACHE_TTL_MS,
  };
  return semester;
};

const loadHistoryRows = async (
  context: Context,
  semesters: readonly string[],
): Promise<CourseInsightHistoryRow[]> => {
  if (semesters.length === 0) return [];
  const client = supabase_server(context);
  const rows: CourseInsightHistoryRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("courses")
      .select(HISTORY_SELECT)
      .in("semester", [...semesters])
      .order("raw_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as CourseInsightHistoryRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
};

const loadCurrentRows = async (
  context: Context,
  semester: string,
): Promise<CourseInsightCurrentRow[]> => {
  const client = supabase_server(context);
  const rows: CourseInsightCurrentRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("courses")
      .select(CURRENT_SELECT)
      .eq("semester", semester)
      .order("raw_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as CourseInsightCurrentRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
};

export const loadCourseInsightData: CourseInsightDataLoader = async (
  context,
  semester,
) => {
  const priorSemesters = getCourseInsightHistorySemesters(semester);
  const [historyRows, currentRows] = await Promise.all([
    loadHistoryRows(context, priorSemesters),
    loadCurrentRows(context, semester),
  ]);
  return { historyRows, currentRows };
};

const INSIGHTS_CACHE_ORIGIN = "https://cache.nthumods.internal/course-insights";

type CacheProvider = () => Cache | undefined;

const getDefaultCache: CacheProvider = () => {
  try {
    return typeof caches === "undefined" ? undefined : caches.default;
  } catch {
    return undefined;
  }
};

export const createCourseInsightsApp = (
  loadData: CourseInsightDataLoader = loadCourseInsightData,
  cacheProvider: CacheProvider = getDefaultCache,
  loadLatestSemester: LatestSemesterLoader = loadLatestCourseSemester,
) =>
  new Hono().get("/", semesterQueryValidator, async (c) => {
    const requestedSemester = c.req.valid("query").semester;
    const latestSemester = await loadLatestSemester(c);
    if (!latestSemester) return c.json({ error: "No course data" }, 404);
    const semester = requestedSemester ?? latestSemester;

    const cache = cacheProvider();
    // Fixed origin: the key never depends on the incoming host or path.
    const cacheKey = new Request(
      `${INSIGHTS_CACHE_ORIGIN}?${new URLSearchParams({ semester })}`,
    );
    const cacheControl =
      semester === latestSemester ? CURRENT_CACHE_CONTROL : PAST_CACHE_CONTROL;
    if (cache) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) {
          return c.json((await cached.json()) as CourseInsightsResponse, 200, {
            "Cache-Control": cacheControl,
          });
        }
      } catch (error) {
        console.error("Failed to read course insights cache", error);
      }
    }

    const { historyRows, currentRows } = await loadData(c, semester);
    const payload = buildCourseInsights(semester, historyRows, currentRows);
    const response = c.json(payload, 200, { "Cache-Control": cacheControl });

    if (cache) {
      try {
        const write = cache.put(cacheKey, response.clone()).catch((error) => {
          console.error("Failed to write course insights cache", error);
        });
        try {
          c.executionCtx.waitUntil(write);
        } catch {
          await write;
        }
      } catch (error) {
        console.error("Failed to start course insights cache write", error);
      }
    }
    return response;
  });

export default createCourseInsightsApp();
