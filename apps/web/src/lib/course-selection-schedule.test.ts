import { describe, expect, test } from "bun:test";
import type { CourseSelectionPeriod } from "./course-selection-periods";
import {
  getCompactCourseSelectionPeriods,
  getCourseSelectionPhaseStatus,
  getCourseSelectionSchedule,
  type CourseSelectionPhaseStatus,
} from "./course-selection-schedule";

const period: CourseSelectionPeriod = {
  id: "course-selection:add-drop",
  semester: "11510",
  phase: "add-drop",
  audience: "unspecified",
  startDate: "2026-09-03",
  endDate: "2026-09-20",
  sourceEventId: "add-drop",
  sourceSummary: "115學年度第1學期加退選開始(至20日止)",
};

describe("course selection phase status", () => {
  test.each([
    ["the day before", "2026-09-02", "upcoming"],
    ["the first day", "2026-09-03", "in-progress"],
    ["the last day", "2026-09-20", "in-progress"],
    ["the day after", "2026-09-21", "finished"],
  ] satisfies [string, string, CourseSelectionPhaseStatus][])(
    "%s",
    (_label, dateKey, expected) => {
      expect(getCourseSelectionPhaseStatus(period, dateKey)).toBe(expected);
    },
  );
});

const createPeriod = (overrides: Partial<CourseSelectionPeriod>) => ({
  ...period,
  ...overrides,
});

describe("course selection schedule helpers", () => {
  test("falls back to the latest semester with data and sorts its periods", () => {
    const latest = createPeriod({
      id: "course-selection:latest",
      semester: "11520",
      startDate: "2027-02-01",
      endDate: "2027-02-03",
    });

    expect(getCourseSelectionSchedule([latest, period], "11420")).toEqual({
      semester: "11520",
      periods: [latest],
    });
  });

  test("keeps the current phase and the next two phases in compact schedules", () => {
    const nextOne = createPeriod({
      id: "course-selection:next-1",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
    });
    const nextTwo = createPeriod({
      id: "course-selection:next-2",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
    });
    const later = createPeriod({
      id: "course-selection:later",
      startDate: "2026-12-01",
      endDate: "2026-12-03",
    });

    expect(
      getCompactCourseSelectionPeriods(
        [later, nextTwo, period, nextOne],
        "2026-09-10",
      ),
    ).toEqual([period, nextOne, nextTwo]);
  });
});
