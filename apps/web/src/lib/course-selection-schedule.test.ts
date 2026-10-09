import { describe, expect, test } from "bun:test";
import {
  parseCourseSelectionPeriods,
  type AcademicCalendarEvent,
  type CourseSelectionPeriod,
} from "./course-selection-periods";
import {
  getCourseSelectionBarPeriod,
  getCompactCourseSelectionPeriods,
  getCourseSelectionPhaseToHighlight,
  getCourseSelectionPhaseStatus,
  getCourseSelectionSchedule,
  type CourseSelectionPhaseStatus,
} from "./course-selection-schedule";
import { COURSE_SELECTION_PHASE_COLORS } from "./course-selection-colors";
import { getTaipeiDateKey } from "@/helpers/dates";

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
  test("keeps the API-provided new-students phase in the 11510 schedule", () => {
    const event: AcademicCalendarEvent = {
      id: "475cegj8e9rkd5vr64db1ajik1",
      summary:
        "115學年度入學各級新生、轉學生選課(至20日止) Course Selection for New Students/Transfer Students in Fall 2026 (8/18-8/20)",
      date: "2026-08-18",
      courseSelectionPeriod: {
        id: "course-selection:475cegj8e9rkd5vr64db1ajik1",
        semester: "11510",
        phase: "new-students",
        audience: "new-students",
        startDate: "2026-08-18",
        endDate: "2026-08-20",
        sourceEventId: "475cegj8e9rkd5vr64db1ajik1",
        sourceSummary:
          "115學年度入學各級新生、轉學生選課(至20日止) Course Selection for New Students/Transfer Students in Fall 2026 (8/18-8/20)",
      },
    };
    const schedule = getCourseSelectionSchedule(
      [
        createPeriod({
          id: "course-selection:round-2",
          phase: "round-2",
          startDate: "2026-06-23",
          endDate: "2026-06-25",
        }),
        ...parseCourseSelectionPeriods([event]),
        createPeriod({
          id: "course-selection:round-3",
          phase: "round-3",
          startDate: "2026-08-25",
          endDate: "2026-08-27",
        }),
      ],
      "11510",
    );

    expect(schedule.periods.map(({ phase }) => phase)).toEqual([
      "round-2",
      "new-students",
      "round-3",
    ]);
  });

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

  test("highlights the in-progress phase that ends first", () => {
    const laterEnding = createPeriod({
      id: "course-selection:later-ending",
      startDate: "2026-09-01",
      endDate: "2026-09-20",
    });
    const earlierEnding = createPeriod({
      id: "course-selection:earlier-ending",
      startDate: "2026-09-03",
      endDate: "2026-09-10",
    });
    const upcoming = createPeriod({
      id: "course-selection:upcoming",
      startDate: "2026-09-07",
      endDate: "2026-09-09",
    });

    expect(
      getCourseSelectionPhaseToHighlight(
        [laterEnding, earlierEnding],
        "2026-09-05",
      ),
    ).toEqual(earlierEnding);
    expect(
      getCourseSelectionBarPeriod(
        [laterEnding, upcoming, earlierEnding],
        "2026-09-05",
      ),
    ).toEqual(earlierEnding);
  });

  test("shows the nearest phase through the inclusive seven-day window", () => {
    const nearest = createPeriod({
      id: "course-selection:nearest",
      startDate: "2026-09-17",
      endDate: "2026-09-20",
    });
    const outsideWindow = createPeriod({
      id: "course-selection:outside-window",
      startDate: "2026-09-19",
      endDate: "2026-09-20",
    });

    expect(getCourseSelectionBarPeriod([outsideWindow], "2026-09-11")).toBe(
      null,
    );
    expect(
      getCourseSelectionBarPeriod([outsideWindow, nearest], "2026-09-10"),
    ).toEqual(nearest);
  });

  test("lets the next phase show after dismissing one phase", () => {
    const current = createPeriod({
      id: "course-selection:current",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    });
    const next = createPeriod({
      id: "course-selection:next",
      startDate: "2026-09-15",
      endDate: "2026-09-17",
    });

    expect(
      getCourseSelectionBarPeriod([current, next], "2026-09-10", [current.id]),
    ).toEqual(next);
  });

  test("uses Taipei calendar boundaries for the seven-day window", () => {
    const next = createPeriod({
      id: "course-selection:taipei-boundary",
      startDate: "2026-10-16",
      endDate: "2026-10-18",
    });
    const beforeTaipeiMidnight = new Date("2026-10-08T15:59:59.999Z");
    const atTaipeiMidnight = new Date("2026-10-08T16:00:00.000Z");

    expect(getTaipeiDateKey(beforeTaipeiMidnight)).toBe("2026-10-08");
    expect(getTaipeiDateKey(atTaipeiMidnight)).toBe("2026-10-09");
    expect(
      getCourseSelectionBarPeriod(
        [next],
        getTaipeiDateKey(beforeTaipeiMidnight),
      ),
    ).toBeNull();
    expect(
      getCourseSelectionBarPeriod([next], getTaipeiDateKey(atTaipeiMidnight)),
    ).toEqual(next);
  });

  test("defines one colour for every selection phase", () => {
    expect(Object.keys(COURSE_SELECTION_PHASE_COLORS)).toEqual([
      "round-1",
      "round-2",
      "round-3",
      "new-students",
      "add-drop",
      "inter-school",
      "withdrawal",
    ]);
    expect(Object.values(COURSE_SELECTION_PHASE_COLORS)).toHaveLength(7);
    expect(
      Object.values(COURSE_SELECTION_PHASE_COLORS).every((color) =>
        /^#[0-9A-F]{6}$/i.test(color),
      ),
    ).toBe(true);
  });
});
