import { describe, expect, test } from "bun:test";
import {
  daysUntilCourseSelection,
  getCourseSelectionState,
  type CourseSelectionPeriod,
} from "./course-selection-periods";

const periods: CourseSelectionPeriod[] = [
  {
    id: "course-selection:round-3",
    semester: "11510",
    phase: "round-3",
    audience: "unspecified",
    startDate: "2026-08-25",
    endDate: "2026-08-27",
    sourceEventId: "round-3",
    sourceSummary: "115學年度第1學期第3次選課開始(至27日止)",
  },
  {
    id: "course-selection:add-drop",
    semester: "11510",
    phase: "add-drop",
    audience: "unspecified",
    startDate: "2026-09-03",
    endDate: "2026-09-20",
    sourceEventId: "add-drop",
    sourceSummary: "115學年度第1學期加退選開始(至20日止)",
  },
];

describe("course selection state", () => {
  test("returns the open phase and next phase", () => {
    expect(getCourseSelectionState(periods, "11510", "2026-09-10")).toEqual({
      current: [periods[1]],
      next: null,
    });
    expect(getCourseSelectionState(periods, "11510", "2026-08-01")).toEqual({
      current: [],
      next: null,
    });
  });

  test("only returns a next phase within the 14-day banner window", () => {
    expect(getCourseSelectionState(periods, "11510", "2026-08-15")).toEqual({
      current: [],
      next: periods[0],
    });
  });

  test("counts calendar days without a browser timezone", () => {
    expect(daysUntilCourseSelection("2026-08-25", "2026-08-22")).toBe(3);
  });
});
