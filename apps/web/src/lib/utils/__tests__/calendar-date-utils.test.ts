/**
 * Tests for calendar date utilities
 *
 * Validates:
 * - Timezone conversions
 * - Date range calculations
 * - Event duration calculations
 * - Human-readable formatting
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getUserTimezone,
  timestampToDate,
  dateToTimestamp,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  formatDateInTimezone,
  formatTimeInTimezone,
  isAllDayEvent,
  getEventDuration,
  getEventDurationHours,
  getEventDurationDays,
  doEventsOverlap,
  getDatesInWeek,
  getDatesInMonth,
  getMonthGridDates,
  createAllDayTimestamps,
  createTimedEventTimestamps,
  parseTime,
  formatDuration,
} from "../calendar-date-utils";

describe("calendar-date-utils", () => {
  describe("timezone utilities", () => {
    it("should get user timezone", () => {
      const timezone = getUserTimezone();
      expect(timezone).toBeTruthy();
      expect(typeof timezone).toBe("string");
    });

    it("should convert timestamp to date", () => {
      const timestamp = new Date("2026-01-15T10:00:00Z").getTime();
      const date = timestampToDate(timestamp);
      expect(date).toBeInstanceOf(Date);
    });

    it("should convert date to timestamp", () => {
      const date = new Date("2026-01-15T10:00:00Z");
      const timestamp = dateToTimestamp(date);
      expect(timestamp).toBe(date.getTime());
    });
  });

  describe("date range utilities", () => {
    it("should get start of day", () => {
      const date = new Date("2026-01-15T14:30:00Z");
      const start = getStartOfDay(date);

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });

    it("should get end of day", () => {
      const date = new Date("2026-01-15T14:30:00Z");
      const end = getEndOfDay(date);

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it("should get start of week (Sunday)", () => {
      const date = new Date("2026-01-15T12:00:00Z"); // Thursday
      const start = getStartOfWeek(date, "Asia/Taipei", 0); // Sunday start

      expect(start.getDay()).toBe(0); // Sunday
    });

    it("should get start of week (Monday)", () => {
      const date = new Date("2026-01-15T12:00:00Z"); // Thursday
      const start = getStartOfWeek(date, "Asia/Taipei", 1); // Monday start

      expect(start.getDay()).toBe(1); // Monday
    });

    it("should get end of week", () => {
      const date = new Date("2026-01-15T12:00:00Z"); // Thursday
      const end = getEndOfWeek(date, "Asia/Taipei", 0); // Sunday start

      expect(end.getDay()).toBe(6); // Saturday
    });

    it("should get start of month", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const start = getStartOfMonth(date);

      expect(start.getDate()).toBe(1);
    });

    it("should get end of month", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const end = getEndOfMonth(date);

      expect(end.getDate()).toBe(31); // January has 31 days
    });
  });

  describe("date formatting", () => {
    it("should format date in timezone", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const formatted = formatDateInTimezone(date, "yyyy-MM-dd");

      expect(formatted).toMatch(/2026-01-\d{2}/);
    });

    it("should format time in timezone", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const formatted = formatTimeInTimezone(date, "HH:mm");

      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe("event duration calculations", () => {
    it("should detect all-day event", () => {
      const start = new Date("2026-01-15T00:00:00Z").getTime();
      const end = new Date("2026-01-16T00:00:00Z").getTime();

      expect(isAllDayEvent(start, end)).toBe(true);
    });

    it("should detect non-all-day event", () => {
      const start = new Date("2026-01-15T10:00:00Z").getTime();
      const end = new Date("2026-01-15T11:00:00Z").getTime();

      expect(isAllDayEvent(start, end)).toBe(false);
    });

    it("should calculate event duration in minutes", () => {
      const start = new Date("2026-01-15T10:00:00Z").getTime();
      const end = new Date("2026-01-15T11:30:00Z").getTime();

      expect(getEventDuration(start, end)).toBe(90);
    });

    it("should calculate event duration in hours", () => {
      const start = new Date("2026-01-15T10:00:00Z").getTime();
      const end = new Date("2026-01-15T13:00:00Z").getTime();

      expect(getEventDurationHours(start, end)).toBe(3);
    });

    it("should calculate event duration in days", () => {
      const start = new Date("2026-01-15T00:00:00Z").getTime();
      const end = new Date("2026-01-18T00:00:00Z").getTime();

      expect(getEventDurationDays(start, end)).toBe(3);
    });
  });

  describe("event overlap detection", () => {
    it("should detect overlapping events", () => {
      const event1Start = new Date("2026-01-15T10:00:00Z").getTime();
      const event1End = new Date("2026-01-15T11:00:00Z").getTime();
      const event2Start = new Date("2026-01-15T10:30:00Z").getTime();
      const event2End = new Date("2026-01-15T11:30:00Z").getTime();

      expect(
        doEventsOverlap(event1Start, event1End, event2Start, event2End),
      ).toBe(true);
    });

    it("should detect non-overlapping events", () => {
      const event1Start = new Date("2026-01-15T10:00:00Z").getTime();
      const event1End = new Date("2026-01-15T11:00:00Z").getTime();
      const event2Start = new Date("2026-01-15T12:00:00Z").getTime();
      const event2End = new Date("2026-01-15T13:00:00Z").getTime();

      expect(
        doEventsOverlap(event1Start, event1End, event2Start, event2End),
      ).toBe(false);
    });

    it("should detect adjacent events as non-overlapping", () => {
      const event1Start = new Date("2026-01-15T10:00:00Z").getTime();
      const event1End = new Date("2026-01-15T11:00:00Z").getTime();
      const event2Start = new Date("2026-01-15T11:00:00Z").getTime();
      const event2End = new Date("2026-01-15T12:00:00Z").getTime();

      expect(
        doEventsOverlap(event1Start, event1End, event2Start, event2End),
      ).toBe(false);
    });
  });

  describe("date array utilities", () => {
    it("should get all dates in a week", () => {
      const date = new Date("2026-01-15T12:00:00Z"); // Thursday
      const dates = getDatesInWeek(date, "Asia/Taipei", 0);

      expect(dates).toHaveLength(7);
      expect(dates[0].getDay()).toBe(0); // Sunday
      expect(dates[6].getDay()).toBe(6); // Saturday
    });

    it("should get all dates in a month", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const dates = getDatesInMonth(date);

      expect(dates.length).toBe(31); // January has 31 days
      expect(dates[0].getDate()).toBe(1);
      expect(dates[30].getDate()).toBe(31);
    });

    it("should get month grid dates including overflow", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const dates = getMonthGridDates(date, "Asia/Taipei", 0);

      // Grid should have 35 or 42 days (5 or 6 weeks)
      expect(dates.length).toBeGreaterThanOrEqual(35);
      expect(dates.length).toBeLessThanOrEqual(42);

      // First date should be a Sunday (if week starts on Sunday)
      expect(dates[0].getDay()).toBe(0);
    });
  });

  describe("event timestamp creation", () => {
    it("should create all-day event timestamps", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const { startTime, endTime } = createAllDayTimestamps(date);

      expect(isAllDayEvent(startTime, endTime)).toBe(true);
      expect(getEventDurationDays(startTime, endTime)).toBe(1);
    });

    it("should create timed event timestamps", () => {
      const date = new Date("2026-01-15T00:00:00Z");
      const { startTime, endTime } = createTimedEventTimestamps(
        date,
        14, // 2 PM
        30, // 30 minutes
        90, // 90 minutes duration
      );

      const start = new Date(startTime);
      expect(start.getHours()).toBeGreaterThanOrEqual(0);
      expect(start.getHours()).toBeLessThan(24);
      expect(getEventDuration(startTime, endTime)).toBe(90);
    });
  });

  describe("time parsing", () => {
    it("should parse 12-hour AM time", () => {
      const parsed = parseTime("9:30 AM");
      expect(parsed).toEqual({ hours: 9, minutes: 30 });
    });

    it("should parse 12-hour PM time", () => {
      const parsed = parseTime("2:30 PM");
      expect(parsed).toEqual({ hours: 14, minutes: 30 });
    });

    it("should parse 12:00 AM correctly", () => {
      const parsed = parseTime("12:00 AM");
      expect(parsed).toEqual({ hours: 0, minutes: 0 });
    });

    it("should parse 12:00 PM correctly", () => {
      const parsed = parseTime("12:00 PM");
      expect(parsed).toEqual({ hours: 12, minutes: 0 });
    });

    it("should parse 24-hour time", () => {
      const parsed = parseTime("14:30");
      expect(parsed).toEqual({ hours: 14, minutes: 30 });
    });

    it("should return null for invalid time", () => {
      expect(parseTime("invalid")).toBeNull();
      expect(parseTime("25:00")).toBeNull();
    });
  });

  describe("duration formatting", () => {
    it("should format minutes only", () => {
      expect(formatDuration(30)).toBe("30m");
      expect(formatDuration(45)).toBe("45m");
    });

    it("should format hours only", () => {
      expect(formatDuration(60)).toBe("1h");
      expect(formatDuration(120)).toBe("2h");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(90)).toBe("1h 30m");
      expect(formatDuration(150)).toBe("2h 30m");
    });
  });
});
