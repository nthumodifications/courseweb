import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { lastSemester, semesterInfo } from "@courseweb/shared";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import {
  buildCourseInsights,
  type CourseInsightCurrentRow,
  type CourseInsightHistoryRow,
} from "./course-insights-aggregation";

const PAGE_SIZE = 1_000;
const HISTORY_SELECT =
  "raw_id,semester,department,course,name_zh,name_en,capacity,enrolled,language";
const CURRENT_SELECT = `${HISTORY_SELECT},class,times,venues`;
const CURRENT_CACHE_CONTROL =
  "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400";
const PAST_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=31536000";

const semesterQueryValidator = zValidator(
  "query",
  z.object({
    semester: z
      .string()
      .regex(/^\d{5}$/)
      .optional(),
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
  const priorSemesters = semesterInfo
    .filter((item) => item.id < semester)
    .map((item) => item.id);
  const [historyRows, currentRows] = await Promise.all([
    loadHistoryRows(context, priorSemesters),
    loadCurrentRows(context, semester),
  ]);
  return { historyRows, currentRows };
};

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
) =>
  new Hono().get("/", semesterQueryValidator, async (c) => {
    const semester = c.req.valid("query").semester ?? lastSemester.id;
    if (!semesterInfo.some((item) => item.id === semester)) {
      return c.json({ error: "Unknown semester" }, 400);
    }

    const cache = cacheProvider();
    const cacheKeyUrl = new URL(c.req.url);
    cacheKeyUrl.search = new URLSearchParams({ semester }).toString();
    const cacheKey = new Request(cacheKeyUrl.toString());
    if (cache) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
      } catch (error) {
        console.error("Failed to read course insights cache", error);
      }
    }

    const { historyRows, currentRows } = await loadData(c, semester);
    const payload = buildCourseInsights(semester, historyRows, currentRows);
    const cacheControl =
      semester === lastSemester.id ? CURRENT_CACHE_CONTROL : PAST_CACHE_CONTROL;
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
