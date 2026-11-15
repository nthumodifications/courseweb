import { describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
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
  class: "0",
  name_zh: "資料結構",
  name_en: "Data Structures",
  capacity: 30,
  enrolled: 24,
  language: "英",
  times: ["M3M4"],
  venues: ["DELTA台達629"],
};

describe("GET /course/insights", () => {
  it("returns aggregates and a six-hour cache for the latest semester", async () => {
    const loadData = mock(async () => ({
      historyRows: [] as CourseInsightHistoryRow[],
      currentRows: [current],
    }));
    const app = new Hono().route(
      "/course/insights",
      createCourseInsightsApp(loadData, () => undefined),
    );

    const response = await app.request("/course/insights?semester=11510");
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
  });

  it("uses a longer cache for past semesters", async () => {
    const app = createCourseInsightsApp(
      async () => ({ historyRows: [], currentRows: [current] }),
      () => undefined,
    );

    const response = await app.request("/?semester=11410");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=2592000");
  });

  it("rejects semester ids that are not present in shared semester data", async () => {
    const loadData = mock(async () => ({
      historyRows: [] as CourseInsightHistoryRow[],
      currentRows: [],
    }));
    const app = createCourseInsightsApp(loadData, () => undefined);

    const response = await app.request("/?semester=99999");

    expect(response.status).toBe(400);
    expect(loadData).not.toHaveBeenCalled();
  });
});
