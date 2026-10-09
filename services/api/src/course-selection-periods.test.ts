import { describe, expect, test } from "bun:test";
import {
  parseCourseSelectionPeriod,
  parseCourseSelectionPeriods,
  type AcademicCalendarEvent,
} from "./course-selection-periods";

const parserCases: Array<{
  name: string;
  event: AcademicCalendarEvent;
  expected: Record<string, string>;
}> = [
  {
    name: "an English date range and semester round",
    event: {
      id: "round-3",
      date: "2026-08-25",
      summary:
        "115學年度第1學期第3次選課開始(至27日止) 3rd Course Selection Period (8/25-8/27)",
    },
    expected: {
      semester: "11510",
      phase: "round-3",
      startDate: "2026-08-25",
      endDate: "2026-08-27",
      audience: "unspecified",
    },
  },
  {
    name: "new students and Chinese-only end dates",
    event: {
      id: "new-students",
      date: "2026-08-18",
      summary:
        "115學年度入學各級新生、轉學生選課(至20日止) Course Selection for New Students/Transfer Students in Fall 2026 (8/18-8/20)",
    },
    expected: {
      semester: "11510",
      phase: "new-students",
      startDate: "2026-08-18",
      endDate: "2026-08-20",
      audience: "new-students",
    },
  },
  {
    name: "spring events without an academic year",
    event: {
      id: "inter-school",
      date: "2027-02-12",
      summary: "受理校際選課(至26日止）Inter-School Selection (2/12-2/26)",
    },
    expected: {
      semester: "11520",
      phase: "inter-school",
      startDate: "2027-02-12",
      endDate: "2027-02-26",
      audience: "inter-school",
    },
  },
  {
    name: "withdrawal events",
    event: {
      id: "withdrawal",
      date: "2026-11-02",
      summary: "115學年度第1學期申請課程停修開始(至20日止)",
    },
    expected: {
      semester: "11510",
      phase: "withdrawal",
      startDate: "2026-11-02",
      endDate: "2026-11-20",
      audience: "unspecified",
    },
  },
];

describe("course selection period source parsing", () => {
  test.each(parserCases)("parses $name", ({ event, expected }) => {
    expect(parseCourseSelectionPeriod(event)).toMatchObject(expected);
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

  test("keeps broad selection summaries for overlap filtering", () => {
    expect(
      parseCourseSelectionPeriods([
        {
          id: "generic-selection",
          date: "2026-08-25",
          summary: "115學年度第1學期選課(8/25-8/27)",
        },
      ]),
    ).toMatchObject([
      { id: "course-selection:generic-selection", endDate: "2026-08-27" },
    ]);
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
        parserCases[3]!.event,
      ]),
    ).toMatchObject([{ id: "course-selection:withdrawal" }]);
  });
});
