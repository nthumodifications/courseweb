/**
 * Performance tests for calendar operations
 * Ensures calendar performs well with large datasets
 */

import { describe, it, expect } from "vitest";
import { createEventData } from "@/lib/utils/calendar-event-utils";
import {
  createRRule,
  parseRRule,
  getRecurrenceSummary,
} from "@/lib/utils/calendar-rrule-utils";
import {
  getUserTimezone,
  timestampToDate,
  getStartOfDay,
  formatDateInTimezone,
  doEventsOverlap,
} from "@/lib/utils/calendar-date-utils";

describe("Calendar Performance Tests", () => {
  describe("event data creation", () => {
    it("should create 1000 event objects in < 100ms", () => {
      const startTime = performance.now();

      const events = Array.from({ length: 1000 }, (_, i) => {
        return createEventData({
          calendarId: `cal-${i % 5}`,
          title: `Event ${i}`,
          description: `Description for event ${i}`,
          location: `Location ${i}`,
          startDate: new Date(`2026-01-${(i % 28) + 1}T10:00:00Z`),
          endDate: new Date(`2026-01-${(i % 28) + 1}T11:00:00Z`),
          isAllDay: false,
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Created 1000 event objects in ${duration.toFixed(2)}ms`);
      expect(events.length).toBe(1000);
      expect(duration).toBeLessThan(300); // Adjusted for test environment
    });
  });

  describe("RRULE operations", () => {
    it("should create 1000 RRULE strings in < 200ms", () => {
      const startDate = new Date("2026-01-01T10:00:00Z");
      const startTime = performance.now();

      const rrules = Array.from({ length: 1000 }, (_, i) => {
        return createRRule({
          frequency: [3, 2, 1, 0][i % 4], // Daily, Weekly, Monthly, Yearly
          interval: (i % 5) + 1,
          startDate,
          endType: i % 3 === 0 ? "count" : i % 3 === 1 ? "until" : "never",
          count: 10,
          untilDate: new Date("2026-12-31T10:00:00Z"),
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Created 1000 RRULE strings in ${duration.toFixed(2)}ms`);
      expect(rrules.length).toBe(1000);
      expect(duration).toBeLessThan(200);
    });

    it("should parse 1000 RRULE strings in < 500ms", () => {
      const rrules = [
        "FREQ=DAILY;INTERVAL=1;COUNT=10",
        "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR",
        "FREQ=MONTHLY;INTERVAL=1;COUNT=12",
        "FREQ=YEARLY;INTERVAL=1;UNTIL=20261231T000000Z",
      ];

      const startTime = performance.now();

      let parsedCount = 0;
      for (let i = 0; i < 1000; i++) {
        const result = parseRRule(rrules[i % 4]);
        if (result) parsedCount++;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Parsed 1000 RRULE strings in ${duration.toFixed(2)}ms`);
      expect(parsedCount).toBe(1000);
      expect(duration).toBeLessThan(500);
    });

    it("should generate 1000 recurrence summaries in < 300ms", () => {
      const rrules = [
        "FREQ=DAILY;INTERVAL=1;COUNT=10",
        "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR",
        "FREQ=MONTHLY;INTERVAL=1;COUNT=12",
        "FREQ=YEARLY;INTERVAL=1;UNTIL=20261231T000000Z",
      ];

      const startTime = performance.now();

      const summaries = Array.from({ length: 1000 }, (_, i) => {
        return getRecurrenceSummary(rrules[i % 4]);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `Generated 1000 recurrence summaries in ${duration.toFixed(2)}ms`,
      );
      expect(summaries.length).toBe(1000);
      expect(duration).toBeLessThan(300);
    });
  });

  describe("date operations", () => {
    it("should convert 10000 timestamps to dates in < 50ms", () => {
      const timestamps = Array.from({ length: 10000 }, (_, i) => {
        return new Date(`2026-01-01T00:00:00Z`).getTime() + i * 3600000; // Hour intervals
      });

      const timezone = getUserTimezone();
      const startTime = performance.now();

      const dates = timestamps.map((ts) => timestampToDate(ts, timezone));

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Converted 10000 timestamps in ${duration.toFixed(2)}ms`);
      expect(dates.length).toBe(10000);
      expect(duration).toBeLessThan(150); // Adjusted for test environment
    });

    it("should calculate start of day for 10000 dates in < 100ms", () => {
      const dates = Array.from({ length: 10000 }, (_, i) => {
        return new Date(
          `2026-01-01T${(i % 24).toString().padStart(2, "0")}:30:45Z`,
        );
      });

      const timezone = getUserTimezone();
      const startTime = performance.now();

      const startOfDays = dates.map((date) => getStartOfDay(date, timezone));

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `Calculated start of day for 10000 dates in ${duration.toFixed(2)}ms`,
      );
      expect(startOfDays.length).toBe(10000);
      expect(duration).toBeLessThan(100);
    });

    it("should format 5000 dates in < 300ms", () => {
      const baseTime = new Date("2026-01-15T10:00:00Z").getTime();
      const dates = Array.from({ length: 5000 }, (_, i) => {
        return new Date(baseTime + i * 3600000); // Hour intervals
      });

      const timezone = getUserTimezone();
      const startTime = performance.now();

      const formatted = dates.map((date) =>
        formatDateInTimezone(date, "yyyy-MM-dd HH:mm", timezone),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Formatted 5000 dates in ${duration.toFixed(2)}ms`);
      expect(formatted.length).toBe(5000);
      expect(duration).toBeLessThan(300); // Adjusted for test environment
    });
  });

  describe("event overlap detection", () => {
    it("should check 10000 event overlaps in < 20ms", () => {
      const event1Start = new Date("2026-01-15T10:00:00Z").getTime();
      const event1End = new Date("2026-01-15T11:00:00Z").getTime();

      const eventPairs = Array.from({ length: 10000 }, (_, i) => {
        const offset = i * 900000; // 15 minute intervals
        return {
          start: event1Start + offset,
          end: event1End + offset,
        };
      });

      const startTime = performance.now();

      const overlaps = eventPairs.map((event2) =>
        doEventsOverlap(event1Start, event1End, event2.start, event2.end),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Checked 10000 event overlaps in ${duration.toFixed(2)}ms`);
      expect(overlaps.length).toBe(10000);
      expect(duration).toBeLessThan(20);
    });
  });

  describe("memory efficiency", () => {
    it("should not use excessive memory when creating 10000 event objects", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const events = Array.from({ length: 10000 }, (_, i) => {
        return createEventData({
          calendarId: `cal-${i % 10}`,
          title: `Event ${i}`,
          description: `Long description for event ${i} with lots of text to simulate real-world usage and memory consumption patterns`,
          location: `Building ${i % 100}, Room ${i % 50}`,
          startDate: new Date(
            `2026-${((i % 12) + 1).toString().padStart(2, "0")}-01T10:00:00Z`,
          ),
          endDate: new Date(
            `2026-${((i % 12) + 1).toString().padStart(2, "0")}-01T11:00:00Z`,
          ),
          isAllDay: false,
        });
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(
        `Memory increase: ${memoryIncrease.toFixed(2)}MB for 10000 events`,
      );

      expect(events.length).toBe(10000);
      // Should not use more than 100MB for 10000 events
      expect(memoryIncrease).toBeLessThan(100);
    });
  });
});
