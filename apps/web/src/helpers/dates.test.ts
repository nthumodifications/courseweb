import { describe, expect, test } from "bun:test";
import {
  fromTaipeiDateKey,
  getTaipeiDateKey,
  getTaipeiDateRange,
  toAcademicCalendarBoundary,
} from "./dates";

describe("Taipei academic date helpers", () => {
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
});
