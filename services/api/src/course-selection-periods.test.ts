import { describe, expect, test } from "bun:test";
import { parseCourseSelectionPeriods } from "./course-selection-periods";

describe("course selection period source parsing", () => {
  test("uses the academic calendar date range", () => {
    expect(
      parseCourseSelectionPeriods([
        {
          id: "add-drop",
          date: "2026-09-03",
          summary:
            "115學年度第1學期加退選開始(至20日止) Add-or-Drop Selection (9/3-9/20)",
        },
      ]),
    ).toMatchObject([
      {
        semester: "11510",
        startDate: "2026-09-03",
        endDate: "2026-09-20",
      },
    ]);
  });

  test("assigns spring events without an academic year to the prior year", () => {
    expect(
      parseCourseSelectionPeriods([
        {
          id: "inter-school",
          date: "2027-02-12",
          summary: "受理校際選課(至26日止）Inter-School Selection (2/12-2/26)",
        },
      ])[0]?.semester,
    ).toBe("11520");
  });

  test("does not turn unrelated academic events into selection periods", () => {
    expect(
      parseCourseSelectionPeriods([
        {
          id: "semester-start",
          date: "2026-08-01",
          summary: "115學年度第1學期開始 2026 Fall Semester Begins",
        },
      ]),
    ).toEqual([]);
  });

  test("leaves summer-session entries out of regular semesters", () => {
    expect(
      parseCourseSelectionPeriods([
        {
          id: "summer-withdrawal",
          date: "2026-08-03",
          summary:
            "暑期班申請課程停修 Course Withdrawal for Summer Session (8/3-8/7)",
        },
        {
          id: "regular-withdrawal",
          date: "2026-11-02",
          summary: "115學年度第1學期申請課程停修開始(至20日止)",
        },
      ]),
    ).toMatchObject([
      {
        id: "course-selection:regular-withdrawal",
        semester: "11510",
      },
    ]);
  });
});
