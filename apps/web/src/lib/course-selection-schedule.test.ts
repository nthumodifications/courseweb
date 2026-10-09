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
  test("renders every 11510 phase in date order", () => {
    const semesterPeriods = [
      createPeriod({
        id: "course-selection:round-1",
        phase: "round-1",
        startDate: "2026-06-15",
        endDate: "2026-06-17",
      }),
      createPeriod({
        id: "course-selection:round-2",
        phase: "round-2",
        startDate: "2026-06-23",
        endDate: "2026-06-25",
      }),
      createPeriod({
        id: "course-selection:new-students",
        phase: "new-students",
        audience: "new-students",
        startDate: "2026-08-18",
        endDate: "2026-08-20",
      }),
      createPeriod({
        id: "course-selection:round-3",
        phase: "round-3",
        startDate: "2026-08-25",
        endDate: "2026-08-27",
      }),
      createPeriod({
        id: "course-selection:add-drop",
        phase: "add-drop",
        startDate: "2026-09-03",
        endDate: "2026-09-20",
      }),
      createPeriod({
        id: "course-selection:inter-school",
        phase: "inter-school",
        audience: "inter-school",
        startDate: "2026-09-03",
        endDate: "2026-09-18",
      }),
      createPeriod({
        id: "course-selection:withdrawal",
        phase: "withdrawal",
        startDate: "2026-11-02",
        endDate: "2026-11-20",
      }),
    ];

    const schedule = getCourseSelectionSchedule(
      semesterPeriods.toReversed(),
      "11510",
    );

    expect(schedule.periods).toHaveLength(7);
    expect(
      schedule.periods.map(({ phase, startDate }) => [phase, startDate]),
    ).toEqual([
      ["round-1", "2026-06-15"],
      ["round-2", "2026-06-23"],
      ["new-students", "2026-08-18"],
      ["round-3", "2026-08-25"],
      ["add-drop", "2026-09-03"],
      ["inter-school", "2026-09-03"],
      ["withdrawal", "2026-11-02"],
    ]);
  });

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
