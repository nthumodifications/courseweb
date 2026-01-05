/**
 * Tests for calendar RRULE utilities
 *
 * Validates:
 * - RRULE creation for different frequencies
 * - RRULE parsing and validation
 * - Occurrence generation
 * - Recurrence presets
 */

import { describe, it, expect } from "vitest";
import {
  createRRule,
  parseRRule,
  getRecurrenceSummary,
  getNextOccurrences,
  getOccurrencesInRange,
  isOccurrence,
  createDailyRRule,
  createWeeklyRRule,
  createMonthlyRRule,
  createYearlyRRule,
  modifyRRuleEnd,
  isValidRRule,
  RECURRENCE_PRESETS,
} from "../calendar-rrule-utils";

describe("calendar-rrule-utils", () => {
  describe("RRULE creation", () => {
    it("should create daily recurrence", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createRRule(
        {
          frequency: "DAILY",
          interval: 1,
          endMode: "count",
          count: 5,
        },
        startDate,
      );

      expect(rrule).toContain("FREQ=DAILY");
      expect(rrule).toContain("COUNT=5");
    });

    it("should create weekly recurrence", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createRRule(
        {
          frequency: "WEEKLY",
          interval: 1,
          endMode: "count",
          count: 10,
          byWeekDay: [1, 3, 5], // Mon, Wed, Fri
        },
        startDate,
      );

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("COUNT=10");
      expect(rrule).toContain("BYDAY=MO,WE,FR");
    });

    it("should create monthly recurrence", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createRRule(
        {
          frequency: "MONTHLY",
          interval: 1,
          endMode: "count",
          count: 12,
          byMonthDay: 15,
        },
        startDate,
      );

      expect(rrule).toContain("FREQ=MONTHLY");
      expect(rrule).toContain("BYMONTHDAY=15");
    });

    it("should create yearly recurrence", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createRRule(
        {
          frequency: "YEARLY",
          interval: 1,
          endMode: "count",
          count: 5,
          byMonth: 1,
          byMonthDay: 15,
        },
        startDate,
      );

      expect(rrule).toContain("FREQ=YEARLY");
      expect(rrule).toContain("BYMONTH=1");
    });

    it("should create recurrence with until date", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const untilDate = new Date("2026-12-31T23:59:59Z");
      const rrule = createRRule(
        {
          frequency: "WEEKLY",
          interval: 1,
          endMode: "until",
          until: untilDate,
        },
        startDate,
      );

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("UNTIL");
    });

    it("should create never-ending recurrence", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createRRule(
        {
          frequency: "DAILY",
          interval: 1,
          endMode: "never",
        },
        startDate,
      );

      expect(rrule).toContain("FREQ=DAILY");
      expect(rrule).not.toContain("COUNT");
      expect(rrule).not.toContain("UNTIL");
    });

    it("should create recurrence with custom interval", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createRRule(
        {
          frequency: "WEEKLY",
          interval: 2, // Every 2 weeks
          endMode: "count",
          count: 10,
        },
        startDate,
      );

      expect(rrule).toContain("INTERVAL=2");
    });
  });

  describe("RRULE parsing", () => {
    it("should parse daily recurrence", () => {
      const rrule = "FREQ=DAILY;COUNT=5";
      const info = parseRRule(rrule);

      expect(info).not.toBeNull();
      expect(info?.frequency).toBe("DAILY");
      expect(info?.endMode).toBe("count");
      expect(info?.count).toBe(5);
    });

    it("should parse weekly recurrence with weekdays", () => {
      const rrule = "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10";
      const info = parseRRule(rrule);

      expect(info).not.toBeNull();
      expect(info?.frequency).toBe("WEEKLY");
      expect(info?.byWeekDay).toContain(0); // Monday
      expect(info?.byWeekDay).toContain(2); // Wednesday
      expect(info?.byWeekDay).toContain(4); // Friday
    });

    it("should parse recurrence with interval", () => {
      const rrule = "FREQ=WEEKLY;INTERVAL=2;COUNT=10";
      const info = parseRRule(rrule);

      expect(info).not.toBeNull();
      expect(info?.interval).toBe(2);
    });

    it("should return null for invalid RRULE", () => {
      const info = parseRRule("INVALID RRULE");
      expect(info).toBeNull();
    });
  });

  describe("RRULE validation", () => {
    it("should validate correct RRULE", () => {
      expect(isValidRRule("FREQ=DAILY;COUNT=5")).toBe(true);
      expect(isValidRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe(true);
    });

    it("should invalidate incorrect RRULE", () => {
      expect(isValidRRule("INVALID")).toBe(false);
      expect(isValidRRule("")).toBe(false);
    });
  });

  describe("recurrence summary", () => {
    it("should generate human-readable summary", () => {
      const rrule = "FREQ=DAILY;COUNT=5";
      const summary = getRecurrenceSummary(rrule);

      expect(summary).toBeTruthy();
      expect(summary.toLowerCase()).toContain("day");
    });

    it("should handle invalid RRULE", () => {
      const summary = getRecurrenceSummary("INVALID");
      expect(summary).toBe("Invalid recurrence rule");
    });
  });

  describe("occurrence generation", () => {
    it("should get next occurrences", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createDailyRRule(startDate, 1, "count", 10);
      const occurrences = getNextOccurrences(rrule, 5, startDate);

      expect(occurrences.length).toBeGreaterThan(0);
      expect(occurrences.length).toBeLessThanOrEqual(5);
    });

    it("should get occurrences in date range", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createDailyRRule(startDate, 1, "count", 30);
      const rangeStart = new Date("2026-01-15T00:00:00Z");
      const rangeEnd = new Date("2026-01-20T23:59:59Z");

      const occurrences = getOccurrencesInRange(rrule, rangeStart, rangeEnd);

      expect(occurrences.length).toBeGreaterThan(0);
      occurrences.forEach((occ) => {
        expect(occ.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
        expect(occ.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
      });
    });

    it("should check if date is an occurrence", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createDailyRRule(startDate, 1, "count", 10);

      expect(isOccurrence(rrule, startDate)).toBe(true);

      const nextDay = new Date("2026-01-16T10:00:00Z");
      expect(isOccurrence(rrule, nextDay)).toBe(true);

      const differentTime = new Date("2026-01-15T14:00:00Z");
      expect(isOccurrence(rrule, differentTime)).toBe(false);
    });
  });

  describe("helper functions", () => {
    it("should create daily RRULE with count", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createDailyRRule(startDate, 1, "count", 5);

      expect(rrule).toContain("FREQ=DAILY");
      expect(rrule).toContain("COUNT=5");
    });

    it("should create weekly RRULE with specific weekdays", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createWeeklyRRule(startDate, [1, 3, 5], 1, "count", 10);

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("BYDAY=MO,WE,FR");
    });

    it("should create monthly RRULE", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createMonthlyRRule(startDate, 15, 1, "count", 12);

      expect(rrule).toContain("FREQ=MONTHLY");
      expect(rrule).toContain("BYMONTHDAY=15");
    });

    it("should create yearly RRULE", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = createYearlyRRule(startDate, 1, 15, 1, "count", 5);

      expect(rrule).toContain("FREQ=YEARLY");
      expect(rrule).toContain("BYMONTH=1");
    });
  });

  describe("RRULE modification", () => {
    it("should modify RRULE to add count", () => {
      const original = "FREQ=DAILY";
      const modified = modifyRRuleEnd(original, "count", 10);

      expect(modified).toContain("COUNT=10");
      expect(modified).not.toContain("UNTIL");
    });

    it("should modify RRULE to add until date", () => {
      const original = "FREQ=DAILY;COUNT=10";
      const untilDate = new Date("2026-12-31T23:59:59Z");
      const modified = modifyRRuleEnd(original, "until", untilDate);

      expect(modified).toContain("UNTIL");
      expect(modified).not.toContain("COUNT");
    });

    it("should modify RRULE to never-ending", () => {
      const original = "FREQ=DAILY;COUNT=10";
      const modified = modifyRRuleEnd(original, "never");

      expect(modified).not.toContain("COUNT");
      expect(modified).not.toContain("UNTIL");
    });
  });

  describe("recurrence presets", () => {
    it("should have daily preset", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = RECURRENCE_PRESETS.daily(startDate);

      expect(rrule).toContain("FREQ=DAILY");
    });

    it("should have weekdays preset", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = RECURRENCE_PRESETS.weekdays(startDate);

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("BYDAY=MO,TU,WE,TH,FR");
    });

    it("should have weekly preset", () => {
      const startDate = new Date("2026-01-15T10:00:00Z"); // Thursday
      const rrule = RECURRENCE_PRESETS.weekly(startDate);

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("BYDAY=TH");
    });

    it("should have biweekly preset", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = RECURRENCE_PRESETS.biweekly(startDate);

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("INTERVAL=2");
    });

    it("should have monthly preset", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = RECURRENCE_PRESETS.monthly(startDate);

      expect(rrule).toContain("FREQ=MONTHLY");
      expect(rrule).toContain("BYMONTHDAY=15");
    });

    it("should have yearly preset", () => {
      const startDate = new Date("2026-01-15T10:00:00Z");
      const rrule = RECURRENCE_PRESETS.yearly(startDate);

      expect(rrule).toContain("FREQ=YEARLY");
      expect(rrule).toContain("BYMONTH=1");
    });
  });
});
