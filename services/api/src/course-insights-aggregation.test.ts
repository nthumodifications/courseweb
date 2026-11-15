import { describe, expect, it } from "bun:test";
import { COURSE_INSIGHT_SEMESTERS } from "./course-insights-mirrors";
import {
  buildCourseInsights,
  getCourseInsightHistorySemesters,
  summarizeCourseRows,
  type CourseInsightCurrentRow,
  type CourseInsightHistoryRow,
} from "./course-insights-aggregation";

const historyRow = (
  rawId: string,
  semester: string,
  department: string,
  course: string,
  values: Partial<CourseInsightHistoryRow> = {},
): CourseInsightHistoryRow => ({
  raw_id: rawId,
  semester,
  department,
  course,
  name_zh: `${department} 課程`,
  name_en: `${department} course`,
  capacity: 30,
  enrolled: 24,
  language: "中",
  ...values,
});

const currentRow = (
  rawId: string,
  department: string,
  course: string,
  values: Partial<CourseInsightCurrentRow> = {},
): CourseInsightCurrentRow => ({
  ...historyRow(rawId, "11510", department, course),
  times: [],
  venues: [],
  ...values,
});

describe("course insights aggregation", () => {
  it("summarizes sections and skips unpublished fill observations", () => {
    const rows = [
      historyRow("a", "11510", "CS", "1010", {
        capacity: 40,
        enrolled: 30,
        language: "英",
      }),
      historyRow("b", "11510", "CS", "1010", {
        capacity: 20,
        enrolled: 0,
      }),
      historyRow("c", "11510", "EE", "2020", {
        capacity: null,
        enrolled: 10,
      }),
      historyRow("d", "11510", "EE", "3030", {
        capacity: 0,
        enrolled: 5,
      }),
    ];

    expect(summarizeCourseRows(rows)).toEqual({
      modules: 3,
      sections: 4,
      departments: 2,
      seats: 60,
      englishShare: 0.25,
      averageClassSize: 15,
    });
  });

  it("ranks full sections, departments, schedules, modules, trends, and buildings", () => {
    const current = [
      currentRow("11510CS 101000", "CS", "1010", {
        name_zh: "資料結構",
        name_en: "Data Structures",
        capacity: 30,
        enrolled: 36,
        language: "英",
        times: ["M3M4M4"],
        venues: ["DELTA台達629", "DELTA台達630"],
      }),
      currentRow("11510CS 101001", "CS", "1010", {
        capacity: 5,
        enrolled: 5,
        times: ["M4F3"],
        venues: ["DELTA台達631"],
      }),
      currentRow("11510EE 202000", "EE", "2020", {
        capacity: 50,
        enrolled: 45,
        times: ["T2T3"],
        venues: ["EECS資電101", "未知教室"],
      }),
      currentRow("11510ME 303000", "ME", "3030", {
        capacity: 0,
        enrolled: 20,
        times: ["bad-code"],
        venues: ["VC虛擬教室"],
      }),
    ];
    const history = [
      historyRow("11310CS 101000", "11310", "CS", "1010"),
      historyRow("11320CS 101000", "11320", "CS", "1010"),
      historyRow("11410CS 101000", "11410", "CS", "1010"),
      historyRow("11410BI 404000", "11410", "BI", "4040"),
      historyRow("11420CS 101000", "11420", "CS", "1010"),
    ];

    const insights = buildCourseInsights("11510", history, current);

    expect(insights.comparisonSemester).toBe("11410");
    expect(insights.comparison?.modules).toBe(2);
    expect(insights.fullestCourses.map((course) => course.rawId)).toEqual([
      "11510CS 101000",
      "11510EE 202000",
    ]);
    expect(
      insights.departments.map((department) => department.department),
    ).toEqual(["EE", "CS", "ME"]);
    expect(insights.departments[1]?.fillRate).toBe(41 / 35);
    expect(insights.schedule.counts[0]?.[2]).toBe(1);
    expect(insights.schedule.counts[0]?.[3]).toBe(2);
    expect(insights.schedule.counts[4]?.[2]).toBe(1);
    expect(insights.newModules.map((module) => module.key)).toEqual([
      "EE:2020",
      "ME:3030",
    ]);
    expect(insights.discontinuedModules.map((module) => module.key)).toEqual([
      "BI:4040",
    ]);
    expect(insights.trends.at(-1)?.englishShare).toBe(0.25);
    expect(insights.buildings).toEqual([
      {
        code: "DELTA",
        nameZh: "台達館",
        nameEn: "Delta Building",
        sections: 2,
      },
      {
        code: "EECS",
        nameZh: "資訊電機館",
        nameEn: "Electrical Engineering and Computer Science Building",
        sections: 1,
      },
    ]);
  });

  it("does not claim comparison or new-module coverage without prior rows", () => {
    const insights = buildCourseInsights(
      "10910",
      [],
      [
        {
          ...currentRow("10910CS 101000", "CS", "1010"),
          semester: "10910",
        },
      ],
    );

    expect(insights.comparisonSemester).toBe("10810");
    expect(insights.comparison).toBeNull();
    expect(insights.newLookback).toBe(0);
    expect(insights.newModules).toEqual([]);
  });

  it("loads only the history needed for the eight-term trend", () => {
    const latestSemester = COURSE_INSIGHT_SEMESTERS.at(-1)!.id;
    const history = getCourseInsightHistorySemesters(latestSemester);

    expect(history).toHaveLength(7);
    expect(history.every((semester) => semester < latestSemester)).toBe(true);
  });

  it("includes valid summer terms in comparisons and trends", () => {
    const insights = buildCourseInsights(
      "11530",
      [historyRow("11430CS 101001", "11430", "CS", "1010")],
      [
        currentRow("11530CS 101001", "CS", "1010", {
          semester: "11530",
        }),
      ],
    );

    expect(insights.comparisonSemester).toBe("11430");
    expect(insights.trends.map(({ semester }) => semester)).toContain("11530");
  });

  it("requires at least 30 seats and caps the fullest list at ten", () => {
    const current = Array.from({ length: 12 }, (_, index) =>
      currentRow(`11510CS ${index}`, "CS", `${1000 + index}`, {
        capacity: index === 0 ? 20 : 30,
        enrolled: 100 - index,
      }),
    );

    const insights = buildCourseInsights("11510", [], current);

    expect(insights.fullestCourses).toHaveLength(10);
    expect(
      insights.fullestCourses.every((course) => course.capacity >= 30),
    ).toBe(true);
    expect(
      insights.fullestCourses.some((course) => course.capacity === 20),
    ).toBe(false);
  });
});
