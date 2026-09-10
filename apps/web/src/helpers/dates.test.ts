import { describe, expect, test } from "bun:test";
import {
  fromTaipeiDateKey,
  formatTaipei,
  getTaipeiAcademicCalendarQuery,
  getTaipeiDateKey,
  getTaipeiDateRange,
  getTaipeiWeek,
  setTaipeiWallClock,
  toAcademicCalendarBoundary,
  isTaipeiToday,
  toTaipeiWallClock,
} from "./dates";

describe("Taipei academic date helpers", () => {
  test("formats an instant in Taipei instead of browser-local time", () => {
    expect(
      formatTaipei(new Date("2026-09-10T01:00:00.000Z"), "yyyy-MM-dd HH:mm"),
    ).toBe("2026-09-10 09:00");
  });

  test("stores a selected Taipei wall-clock time as the Taipei instant", () => {
    const selectedDate = new Date("2026-09-10T00:00:00.000Z");
    const start = setTaipeiWallClock(selectedDate, {
      hours: 9,
      minutes: 0,
    });

    expect(start.toISOString()).toBe("2026-09-10T01:00:00.000Z");
  });

  test("keeps a date-only value on its Taipei calendar day", () => {
    const dateKey = "2026-09-14";
    const taipeiMidnight = fromTaipeiDateKey(dateKey);

    // Taipei midnight is the previous UTC date. A UTC-date representation
    // would therefore lose the intended academic calendar date.
    expect(taipeiMidnight.toISOString()).toBe("2026-09-13T16:00:00.000Z");
    expect(taipeiMidnight.toISOString().slice(0, 10)).not.toBe(dateKey);
    expect(getTaipeiDateKey(taipeiMidnight)).toBe(dateKey);
  });

  test("makes an inclusive multi-day range end-exclusive after the final day", () => {
    const range = getTaipeiDateRange("2026-09-14", "2026-09-16");

    expect(range).not.toBeNull();
    if (!range) return;

    expect(getTaipeiDateKey(range.start)).toBe("2026-09-14");
    expect(getTaipeiDateKey(new Date(range.end.getTime() - 1))).toBe(
      "2026-09-16",
    );
    expect(getTaipeiDateKey(range.end)).toBe("2026-09-17");
  });

  test("preserves both Taipei query date boundaries for the academic feed", () => {
    expect(toAcademicCalendarBoundary("2026-09-14")).toBe(
      "2026-09-14T00:00:00.000Z",
    );
    // The end boundary is the next Taipei date for a range ending on Sep 16.
    expect(toAcademicCalendarBoundary("2026-09-17")).toBe(
      "2026-09-17T00:00:00.000Z",
    );
  });

  test("keeps the final Taipei week day in the academic query", () => {
    const week = getTaipeiWeek(new Date("2026-09-10T01:00:00.000Z"));
    const query = getTaipeiAcademicCalendarQuery(
      getTaipeiDateKey(week[0]),
      getTaipeiDateKey(week[6]),
    );

    expect(query).toEqual({
      start: "2026-09-06T00:00:00.000Z",
      end: "2026-09-13T00:00:00.000Z",
    });
  });
});

describe("Taipei today marker", () => {
  // 2026-09-10T20:25:00Z is still Sep 10 in Los Angeles but already Sep 11
  // in Taipei — the exact case that made the calendar grid disagree with the
  // rest of the app.
  const now = new Date("2026-09-10T20:25:00.000Z");

  test("marks the Taipei day, not the browser's local day", () => {
    expect(isTaipeiToday(new Date("2026-09-11T00:00:00.000Z"), now)).toBe(true);
    expect(isTaipeiToday(new Date("2026-09-10T12:00:00.000Z"), now)).toBe(
      false,
    );
  });

  test("reads Taipei wall-clock hours", () => {
    const wall = toTaipeiWallClock(now);
    expect(wall.getHours()).toBe(4);
    expect(wall.getMinutes()).toBe(25);
  });
});
