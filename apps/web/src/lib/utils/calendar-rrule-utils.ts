/**
 * Calendar RRULE Utilities
 *
 * Utilities for working with recurring events using the RRULE standard (RFC 5545).
 * These utilities make it easy to create, parse, and modify recurrence rules.
 */

import { RRule, Frequency, Weekday, rrulestr } from "rrule";

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RecurrenceEndMode = "never" | "count" | "until";

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g., every 2 weeks
  endMode: RecurrenceEndMode;
  count?: number; // number of occurrences
  until?: Date; // end date
  byWeekDay?: number[]; // 0-6 for Sun-Sat
  byMonthDay?: number; // 1-31
  byMonth?: number; // 1-12
}

export interface RecurrenceInfo {
  frequency: RecurrenceFrequency;
  interval: number;
  endMode: RecurrenceEndMode;
  count?: number;
  until?: Date;
  byWeekDay?: number[];
  byMonthDay?: number;
  byMonth?: number;
  summary: string; // Human-readable summary
}

/**
 * Convert frequency string to RRule frequency constant
 */
function getFrequencyConstant(frequency: RecurrenceFrequency): Frequency {
  switch (frequency) {
    case "DAILY":
      return RRule.DAILY;
    case "WEEKLY":
      return RRule.WEEKLY;
    case "MONTHLY":
      return RRule.MONTHLY;
    case "YEARLY":
      return RRule.YEARLY;
    default:
      return RRule.WEEKLY;
  }
}

/**
 * Convert weekday numbers to RRule weekday objects
 */
function getWeekdayObjects(weekdays: number[]): Weekday[] {
  const weekdayMap = [
    RRule.SU,
    RRule.MO,
    RRule.TU,
    RRule.WE,
    RRule.TH,
    RRule.FR,
    RRule.SA,
  ];

  return weekdays.map((day) => weekdayMap[day]);
}

/**
 * Create RRULE string from recurrence options
 */
export function createRRule(
  options: RecurrenceOptions,
  startDate: Date,
): string {
  const ruleOptions: any = {
    freq: getFrequencyConstant(options.frequency),
    interval: options.interval || 1,
    dtstart: startDate,
  };

  // Set end condition
  if (options.endMode === "count" && options.count) {
    ruleOptions.count = options.count;
  } else if (options.endMode === "until" && options.until) {
    ruleOptions.until = options.until;
  }

  // Set by-weekday for weekly recurrence
  if (options.byWeekDay && options.byWeekDay.length > 0) {
    ruleOptions.byweekday = getWeekdayObjects(options.byWeekDay);
  }

  // Set by-monthday for monthly recurrence
  if (options.byMonthDay) {
    ruleOptions.bymonthday = options.byMonthDay;
  }

  // Set by-month for yearly recurrence
  if (options.byMonth) {
    ruleOptions.bymonth = options.byMonth;
  }

  const rule = new RRule(ruleOptions);
  return rule.toString();
}

/**
 * Parse RRULE string to recurrence info
 */
export function parseRRule(rruleString: string): RecurrenceInfo | null {
  try {
    const rule = rrulestr(rruleString);
    const options = rule.origOptions;

    // Determine frequency
    let frequency: RecurrenceFrequency = "WEEKLY";
    switch (options.freq) {
      case RRule.DAILY:
        frequency = "DAILY";
        break;
      case RRule.WEEKLY:
        frequency = "WEEKLY";
        break;
      case RRule.MONTHLY:
        frequency = "MONTHLY";
        break;
      case RRule.YEARLY:
        frequency = "YEARLY";
        break;
    }

    // Determine end mode
    let endMode: RecurrenceEndMode = "never";
    if (options.count) {
      endMode = "count";
    } else if (options.until) {
      endMode = "until";
    }

    // Extract weekdays
    let byWeekDay: number[] | undefined;
    if (options.byweekday) {
      const weekdays = Array.isArray(options.byweekday)
        ? options.byweekday
        : [options.byweekday];
      byWeekDay = weekdays.map((wd: any) => {
        if (typeof wd === "number") return wd;
        return wd.weekday;
      });
    }

    const info: RecurrenceInfo = {
      frequency,
      interval: options.interval || 1,
      endMode,
      count: options.count ?? undefined,
      until: options.until ?? undefined,
      byWeekDay,
      byMonthDay: options.bymonthday as number | undefined,
      byMonth: options.bymonth as number | undefined,
      summary: rule.toText(),
    };

    return info;
  } catch (error) {
    console.error("Failed to parse RRULE:", error);
    return null;
  }
}

/**
 * Generate human-readable summary of recurrence
 */
export function getRecurrenceSummary(rruleString: string): string {
  try {
    const rule = rrulestr(rruleString);
    return rule.toText();
  } catch {
    return "Invalid recurrence rule";
  }
}

/**
 * Get next N occurrences of recurring event
 */
export function getNextOccurrences(
  rruleString: string,
  count: number = 10,
  after: Date = new Date(),
): Date[] {
  try {
    const rule = rrulestr(rruleString);
    return rule.after(after, true) ? rule.all((date, i) => i < count) : [];
  } catch {
    return [];
  }
}

/**
 * Get occurrences in date range
 */
export function getOccurrencesInRange(
  rruleString: string,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  try {
    const rule = rrulestr(rruleString);
    return rule.between(rangeStart, rangeEnd, true);
  } catch {
    return [];
  }
}

/**
 * Check if date is an occurrence of recurrence rule
 */
export function isOccurrence(rruleString: string, date: Date): boolean {
  try {
    const rule = rrulestr(rruleString);
    const occurrences = rule.between(
      new Date(date.getTime() - 1),
      new Date(date.getTime() + 1),
      true,
    );
    return occurrences.some(
      (occ) =>
        occ.getTime() === date.getTime() ||
        occ.toDateString() === date.toDateString(),
    );
  } catch {
    return false;
  }
}

/**
 * Create simple daily recurrence
 */
export function createDailyRRule(
  startDate: Date,
  interval: number = 1,
  endMode: RecurrenceEndMode = "never",
  endValue?: number | Date,
): string {
  const options: RecurrenceOptions = {
    frequency: "DAILY",
    interval,
    endMode,
  };

  if (endMode === "count" && typeof endValue === "number") {
    options.count = endValue;
  } else if (endMode === "until" && endValue instanceof Date) {
    options.until = endValue;
  }

  return createRRule(options, startDate);
}

/**
 * Create simple weekly recurrence
 */
export function createWeeklyRRule(
  startDate: Date,
  weekdays: number[], // 0-6 for Sun-Sat
  interval: number = 1,
  endMode: RecurrenceEndMode = "never",
  endValue?: number | Date,
): string {
  const options: RecurrenceOptions = {
    frequency: "WEEKLY",
    interval,
    endMode,
    byWeekDay: weekdays,
  };

  if (endMode === "count" && typeof endValue === "number") {
    options.count = endValue;
  } else if (endMode === "until" && endValue instanceof Date) {
    options.until = endValue;
  }

  return createRRule(options, startDate);
}

/**
 * Create simple monthly recurrence
 */
export function createMonthlyRRule(
  startDate: Date,
  dayOfMonth: number, // 1-31
  interval: number = 1,
  endMode: RecurrenceEndMode = "never",
  endValue?: number | Date,
): string {
  const options: RecurrenceOptions = {
    frequency: "MONTHLY",
    interval,
    endMode,
    byMonthDay: dayOfMonth,
  };

  if (endMode === "count" && typeof endValue === "number") {
    options.count = endValue;
  } else if (endMode === "until" && endValue instanceof Date) {
    options.until = endValue;
  }

  return createRRule(options, startDate);
}

/**
 * Create simple yearly recurrence
 */
export function createYearlyRRule(
  startDate: Date,
  month: number, // 1-12
  dayOfMonth: number, // 1-31
  interval: number = 1,
  endMode: RecurrenceEndMode = "never",
  endValue?: number | Date,
): string {
  const options: RecurrenceOptions = {
    frequency: "YEARLY",
    interval,
    endMode,
    byMonth: month,
    byMonthDay: dayOfMonth,
  };

  if (endMode === "count" && typeof endValue === "number") {
    options.count = endValue;
  } else if (endMode === "until" && endValue instanceof Date) {
    options.until = endValue;
  }

  return createRRule(options, startDate);
}

/**
 * Modify RRULE to change end condition
 */
export function modifyRRuleEnd(
  rruleString: string,
  endMode: RecurrenceEndMode,
  endValue?: number | Date,
): string | null {
  try {
    const rule = rrulestr(rruleString);
    const options = { ...rule.origOptions };

    // Remove existing end conditions
    delete options.count;
    delete options.until;

    // Set new end condition
    if (endMode === "count" && typeof endValue === "number") {
      options.count = endValue;
    } else if (endMode === "until" && endValue instanceof Date) {
      options.until = endValue;
    }

    const newRule = new RRule(options);
    return newRule.toString();
  } catch {
    return null;
  }
}

/**
 * Validate RRULE string
 */
export function isValidRRule(rruleString: string): boolean {
  try {
    rrulestr(rruleString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Common recurrence presets
 */
export const RECURRENCE_PRESETS = {
  daily: (startDate: Date) => createDailyRRule(startDate, 1, "never"),
  weekdays: (startDate: Date) =>
    createWeeklyRRule(startDate, [1, 2, 3, 4, 5], 1, "never"),
  weekly: (startDate: Date) =>
    createWeeklyRRule(startDate, [startDate.getDay()], 1, "never"),
  biweekly: (startDate: Date) =>
    createWeeklyRRule(startDate, [startDate.getDay()], 2, "never"),
  monthly: (startDate: Date) =>
    createMonthlyRRule(startDate, startDate.getDate(), 1, "never"),
  yearly: (startDate: Date) =>
    createYearlyRRule(
      startDate,
      startDate.getMonth() + 1,
      startDate.getDate(),
      1,
      "never",
    ),
};
