import { describe, expect, it, mock } from "bun:test";
import { Hono, type Context } from "hono";
import { createCourseInsightsApp } from "./course-insights";
import type {
  CourseInsightCurrentRow,
  CourseInsightHistoryRow,
} from "./course-insights-aggregation";

const current: CourseInsightCurrentRow = {
  raw_id: "11510CS 101000",
  semester: "11510",
  department: "CS",
  course: "1010",
  name_zh: "資料結構",
  name_en: "Data Structures",
  capacity: 30,
  enrolled: 24,
  language: "英",
  times: ["M3M4"],
  venues: ["DELTA台達629"],
};

describe("GET /course/insights", () => {
  it("defaults to the latest semester with course rows and uses a six-hour cache", async () => {
    const requestedSemesters: string[] = [];
    const loadData = mock(async (_context: Context, semester: string) => {
      requestedSemesters.push(semester);
      return {
        historyRows: [] as CourseInsightHistoryRow[],
        currentRows: [current],
      };
    });
    const app = new Hono().route(
      "/course/insights",
      createCourseInsightsApp(
        loadData,
        () => undefined,
        async () => "11510",
      ),
    );

    const response = await app.request("/course/insights");
    const body = (await response.json()) as {
      snapshot: { sections: number; englishShare: number | null };
      fullestCourses: { rawId: string; fillRate: number }[];
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age=21600");
    expect(body.snapshot).toEqual({
      modules: 1,
      sections: 1,
      departments: 1,
      seats: 30,
      englishShare: 1,
      averageClassSize: 24,
    });
    expect(body.fullestCourses[0]).toMatchObject({
      rawId: current.raw_id,
      fillRate: 0.8,
    });
    expect(loadData).toHaveBeenCalledTimes(1);
    expect(requestedSemesters).toEqual(["11510"]);
  });

  it("uses a longer cache for past semesters", async () => {
    const app = createCourseInsightsApp(
      async () => ({ historyRows: [], currentRows: [current] }),
      () => undefined,
      async () => "11510",
    );

    const response = await app.request("/?semester=11410");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=2592000");
  });

  it("rejects semester ids that do not match a supported term format", async () => {
    const loadData = mock(async () => ({
      historyRows: [] as CourseInsightHistoryRow[],
      currentRows: [],
    }));
    const app = createCourseInsightsApp(loadData, () => undefined);

    const response = await app.request("/?semester=99999");

    expect(response.status).toBe(400);
    expect(loadData).not.toHaveBeenCalled();
  });

  it("accepts the academic-term format for summer semesters", async () => {
    const app = createCourseInsightsApp(
      async (_context, semester) => ({
        historyRows: [],
        currentRows: [{ ...current, semester }],
      }),
      () => undefined,
      async () => "11510",
    );

    const response = await app.request("/?semester=11530");

    expect(response.status).toBe(200);
    expect(((await response.json()) as { semester: string }).semester).toBe(
      "11530",
    );
  });
});
