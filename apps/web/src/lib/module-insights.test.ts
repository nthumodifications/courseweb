import { describe, expect, test } from "bun:test";
import {
  getCommonTimes,
  getDemandSeries,
  getInstructorInsights,
  getLanguages,
  getRecentFill,
  summariseScores,
  type InsightOffering,
} from "./module-insights";

const offering = (over: Partial<InsightOffering>): InsightOffering => ({
  raw_id: "11310CS  135501",
  semester: "11310",
  teacher_zh: ["胡敏君"],
  teacher_en: ["MIN-CHUN HU"],
  times: ["M7M8R6"],
  language: "英",
  capacity: 75,
  enrolled: 117,
  ...over,
});

describe("module insights", () => {
  test("demand adds up sections of a semester and reports over-subscription", () => {
    const series = getDemandSeries([
      offering({}),
      offering({ raw_id: "11310CS  135502", capacity: 75, enrolled: 63 }),
      offering({
        raw_id: "11320CS  135500",
        semester: "11320",
        capacity: 300,
        enrolled: 188,
      }),
    ]);
    expect(series.map((point) => point.semester)).toEqual(["11310", "11320"]);
    expect(series[0]).toMatchObject({
      enrolled: 180,
      capacity: 150,
      sections: 2,
    });
    expect(series[0].fill).toBeCloseTo(1.2);
    expect(series[1].fill).toBeCloseTo(188 / 300);
  });

  test("offerings without both numbers are left out, not counted as empty", () => {
    expect(
      getDemandSeries([
        offering({ capacity: null }),
        offering({ capacity: 0 }),
        offering({ enrolled: null }),
        offering({ enrolled: 0 }),
      ]),
    ).toEqual([]);
    expect(getRecentFill([])).toBeNull();
  });

  test("recent fill weights by seats, over the latest semesters only", () => {
    const series = getDemandSeries([
      offering({ semester: "11010", capacity: 10, enrolled: 1 }),
      offering({ semester: "11310", capacity: 100, enrolled: 100 }),
      offering({ semester: "11320", capacity: 300, enrolled: 150 }),
    ]);
    expect(getRecentFill(series, 2)).toBeCloseTo(250 / 400);
  });

  test("common times and languages are ranked by how often they occur", () => {
    const offerings = [
      offering({}),
      offering({ times: ["M7M8R6"] }),
      offering({ times: ["TaTbTc"], language: "中" }),
      offering({ times: null, language: null }),
    ];
    expect(getCommonTimes(offerings)[0]).toEqual({
      value: "M7M8R6",
      count: 2,
    });
    expect(getLanguages(offerings).map((entry) => entry.value)).toEqual([
      "英",
      "中",
    ]);
  });

  test("score scales are summarised separately", () => {
    const summary = summariseScores([
      {
        raw_id: "a",
        average: 70,
        std_dev: 10,
        type: "percent",
        enrollment: 50,
      },
      {
        raw_id: "b",
        average: 80,
        std_dev: 10,
        type: "percent",
        enrollment: 50,
      },
      { raw_id: "c", average: 3.2, std_dev: 0.5, type: "gpa", enrollment: 50 },
    ]);
    expect(summary).toEqual([
      { type: "percent", count: 2, average: 75 },
      { type: "gpa", count: 1, average: 3.2 },
    ]);
  });

  test("instructors carry their own semesters and averages, newest first", () => {
    const insights = getInstructorInsights(
      [
        offering({}),
        offering({ raw_id: "11210CS  135501", semester: "11210" }),
        offering({
          raw_id: "11320CS  135500",
          semester: "11320",
          teacher_zh: ["陳煥宗"],
          teacher_en: ["CHEN, HWANN-TZONG"],
        }),
      ],
      [
        {
          raw_id: "11310CS  135501",
          average: 69.35,
          std_dev: 22.15,
          type: "percent",
          enrollment: 108,
        },
      ],
    );
    expect(insights.map((entry) => entry.key)).toEqual(["陳煥宗", "胡敏君"]);
    expect(insights[1].semesters).toEqual(["11210", "11310"]);
    expect(insights[1].scores).toEqual([
      { type: "percent", count: 1, average: 69.35 },
    ]);
    expect(insights[0].scores).toEqual([]);
  });
});
