import { describe, expect, test } from "bun:test";
import type { CourseSelectionPeriod } from "@/lib/course-selection-periods";
import {
  formatCourseSelectionBarDate,
  formatCourseSelectionDateRange,
} from "./CourseSelectionSchedule";

const period: CourseSelectionPeriod = {
  id: "course-selection:round-1",
  semester: "11510",
  phase: "round-1",
  audience: "unspecified",
  startDate: "2026-06-15",
  endDate: "2026-06-17",
  sourceEventId: "round-1",
  sourceSummary: "115學年度第1學期第一階段選課",
};

describe("course selection date formatting", () => {
  test("uses the compact Chinese range used by the bar", () => {
    expect(formatCourseSelectionDateRange(period, "zh")).toBe(
      "6/15（一）– 6/17（三）",
    );
  });

  test("uses the compact English range used by the bar", () => {
    expect(formatCourseSelectionDateRange(period, "en")).toBe(
      "Jun 15 (Mon) – Jun 17 (Wed)",
    );
  });

  test("shows one compact date for a same-day phase", () => {
    const sameDay = { ...period, endDate: period.startDate };

    expect(formatCourseSelectionDateRange(sameDay, "zh")).toBe("6/15（一）");
    expect(formatCourseSelectionDateRange(sameDay, "en")).toBe("Jun 15 (Mon)");
  });

  test("formats the bar date labels directly", () => {
    expect(formatCourseSelectionBarDate("2026-06-15", "zh")).toBe("6/15（一）");
    expect(formatCourseSelectionBarDate("2026-06-15", "en")).toBe(
      "Jun 15 (Mon)",
    );
  });
});
