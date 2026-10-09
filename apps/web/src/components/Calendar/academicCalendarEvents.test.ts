import { describe, expect, test } from "bun:test";
import {
  endOfTaipeiDay,
  fromTaipeiDateKey,
  getTaipeiDateKey,
} from "@/helpers/dates";
import type { EventData } from "@/types/calendar_event";
import { toAcademicCalendarEvents } from "./academicCalendarEvents";

const event = (
  overrides: Partial<EventData> & Record<string, unknown> = {},
): EventData => ({
  id: "semester-boundary",
  summary: "Semester boundary",
  date: "2026-09-14",
  ...overrides,
});

describe("academic calendar event rendering", () => {
  test("renders a course-selection period across its inclusive Taipei dates", () => {
    const [rendered] = toAcademicCalendarEvents(
      [
        event({
          courseSelectionPeriod: {
            id: "selection-1",
            semester: "11510",
            phase: "add-drop",
            audience: "unspecified",
            startDate: "2026-09-14",
            endDate: "2026-09-16",
            sourceEventId: "semester-boundary",
            sourceSummary: "Semester boundary",
          },
        } as EventData & { courseSelectionPeriod: unknown }),
      ],
      "#A973D9",
      (period) => `${period.semester}:${period.phase}`,
    );

    expect(rendered).toMatchObject({
      id: "nthu-semester-boundary",
      title: "11510:add-drop",
      start: fromTaipeiDateKey("2026-09-14"),
      end: endOfTaipeiDay(fromTaipeiDateKey("2026-09-16")),
      allDay: true,
      readonly: true,
    });
    expect(getTaipeiDateKey(rendered!.start)).toBe("2026-09-14");
    expect(getTaipeiDateKey(rendered!.end)).toBe("2026-09-16");
  });

  test("skips malformed academic event dates", () => {
    expect(
      toAcademicCalendarEvents([event({ date: "not-a-date" })], "#000"),
    ).toEqual([]);
  });

  test("keeps valid rows in order when malformed rows are mixed in", () => {
    const rendered = toAcademicCalendarEvents(
      [
        event({ id: "valid-first", date: "2026-09-14" }),
        event({ id: "invalid-start", date: "not-a-date" }),
        event({
          id: "invalid-end",
          date: "2026-09-15",
          courseSelectionPeriod: {
            id: "selection-invalid-end",
            semester: "11510",
            phase: "add-drop",
            audience: "unspecified",
            startDate: "2026-09-15",
            endDate: "not-a-date",
            sourceEventId: "invalid-end",
            sourceSummary: "Invalid end",
          },
        } as EventData & { courseSelectionPeriod: unknown }),
        event({ id: "valid-last", date: "2026-09-16" }),
      ],
      "#000",
    );

    expect(rendered.map(({ id }) => id)).toEqual([
      "nthu-valid-first",
      "nthu-valid-last",
    ]);
  });
});
