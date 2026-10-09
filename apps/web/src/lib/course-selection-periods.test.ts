import { describe, expect, test } from "bun:test";
import {
  daysUntilCourseSelection,
  getCourseSelectionState,
  parseCourseSelectionPeriod,
  parseCourseSelectionPeriods,
} from "./course-selection-periods";

describe("course selection period parsing", () => {
  test("parses an English date range and semester round", () => {
    const period = parseCourseSelectionPeriod({
      id: "round-3",
      date: "2026-08-25",
      summary:
        "115學年度第1學期第3次選課開始(至27日止) 3rd Course Selection Period (8/25-8/27)",
    });

    expect(period).toMatchObject({
      semester: "11510",
      phase: "round-3",
      startDate: "2026-08-25",
      endDate: "2026-08-27",
      audience: "unspecified",
    });
  });

  test("parses audiences and Chinese-only end dates", () => {
    const periods = parseCourseSelectionPeriods([
      {
        id: "new-students",
        date: "2026-08-18",
        summary:
          "115學年度入學各級新生、轉學生選課(至20日止) Course Selection for New Students/Transfer Students in Fall 2026 (8/18-8/20)",
      },
      {
        id: "withdrawal",
        date: "2026-11-02",
        summary: "115學年度第1學期申請課程停修開始(至20日止)",
      },
      {
        id: "inter-school",
        date: "2027-02-12",
        summary: "受理校際選課(至26日止）Inter-School Selection (2/12-2/26)",
      },
    ]);

    expect(
      periods.map(({ phase, audience, semester, endDate }) => [
        phase,
        audience,
        semester,
        endDate,
      ]),
    ).toEqual([
      ["new-students", "new-students", "11510", "2026-08-20"],
      ["withdrawal", "unspecified", "11510", "2026-11-20"],
      ["inter-school", "inter-school", "11520", "2027-02-26"],
    ]);
  });

  test("ignores academic events unrelated to course selection", () => {
    expect(
      parseCourseSelectionPeriod({
        id: "semester-start",
        date: "2026-08-01",
        summary: "115學年度第1學期開始 2026 Fall Semester Begins",
      }),
    ).toBeNull();
  });

  test("does not assign summer-session entries to a regular semester", () => {
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
        sourceEventId: "regular-withdrawal",
        semester: "11510",
      },
    ]);
  });
});

describe("course selection state", () => {
  const periods = parseCourseSelectionPeriods([
    {
      id: "round-3",
      date: "2026-08-25",
      summary: "115學年度第1學期第3次選課開始(至27日止)",
    },
    {
      id: "add-drop",
      date: "2026-09-03",
      summary: "115學年度第1學期加退選開始(至20日止)",
    },
  ]);

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
