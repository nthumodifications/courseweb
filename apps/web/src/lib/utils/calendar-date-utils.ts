/**
 * Calendar Date Utilities
 *
 * Timezone-aware date manipulation utilities using date-fns and date-fns-tz.
 * All functions handle timezone conversions properly to avoid date shifting bugs.
 */

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isWithinInterval,
  format,
  parseISO,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Default timezone (can be overridden per user)
 */
export const DEFAULT_TIMEZONE = "Asia/Taipei";

/**
 * Get user's timezone (from browser or default)
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Convert Unix timestamp to Date in specific timezone
 */
export function timestampToDate(
  timestamp: number,
  timezone: string = getUserTimezone(),
): Date {
  const date = new Date(timestamp);
  return toZonedTime(date, timezone);
}

/**
 * Convert Date to Unix timestamp
 */
export function dateToTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Get start of day in timezone
 */
export function getStartOfDay(
  date: Date,
  timezone: string = getUserTimezone(),
): Date {
  const zonedDate = toZonedTime(date, timezone);
  return startOfDay(zonedDate);
}

/**
 * Get end of day in timezone
 */
export function getEndOfDay(
  date: Date,
  timezone: string = getUserTimezone(),
): Date {
  const zonedDate = toZonedTime(date, timezone);
  return endOfDay(zonedDate);
}

/**
 * Get start of week in timezone
 */
export function getStartOfWeek(
  date: Date,
  timezone: string = getUserTimezone(),
  weekStartsOn: 0 | 1 = 0, // 0 = Sunday, 1 = Monday
): Date {
  const zonedDate = toZonedTime(date, timezone);
  return startOfWeek(zonedDate, { weekStartsOn });
}

/**
 * Get end of week in timezone
 */
export function getEndOfWeek(
  date: Date,
  timezone: string = getUserTimezone(),
  weekStartsOn: 0 | 1 = 0,
): Date {
  const zonedDate = toZonedTime(date, timezone);
  return endOfWeek(zonedDate, { weekStartsOn });
}

/**
 * Get start of month in timezone
 */
export function getStartOfMonth(
  date: Date,
  timezone: string = getUserTimezone(),
): Date {
  const zonedDate = toZonedTime(date, timezone);
  return startOfMonth(zonedDate);
}

/**
 * Get end of month in timezone
 */
export function getEndOfMonth(
  date: Date,
  timezone: string = getUserTimezone(),
): Date {
  const zonedDate = toZonedTime(date, timezone);
  return endOfMonth(zonedDate);
}

/**
 * Format date for display in specific timezone
 */
export function formatDateInTimezone(
  date: Date,
  formatString: string = "PPP",
  timezone: string = getUserTimezone(),
): string {
  return formatInTimeZone(date, timezone, formatString);
}

/**
 * Format time for display in specific timezone
 */
export function formatTimeInTimezone(
  date: Date,
  formatString: string = "p",
  timezone: string = getUserTimezone(),
): string {
  return formatInTimeZone(date, timezone, formatString);
}

/**
 * Format date and time for display in specific timezone
 */
export function formatDateTimeInTimezone(
  date: Date,
  formatString: string = "PPp",
  timezone: string = getUserTimezone(),
): string {
  return formatInTimeZone(date, timezone, formatString);
}

/**
 * Check if event is all-day event
 */
export function isAllDayEvent(startTime: number, endTime: number): boolean {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // All-day events start at midnight and end at midnight
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const endHours = end.getHours();
  const endMinutes = end.getMinutes();

  return (
    startHours === 0 && startMinutes === 0 && endHours === 0 && endMinutes === 0
  );
}

/**
 * Get duration of event in minutes
 */
export function getEventDuration(startTime: number, endTime: number): number {
  return differenceInMinutes(endTime, startTime);
}

/**
 * Get duration of event in hours
 */
export function getEventDurationHours(
  startTime: number,
  endTime: number,
): number {
  return differenceInHours(endTime, startTime);
}

/**
 * Get duration of event in days
 */
export function getEventDurationDays(
  startTime: number,
  endTime: number,
): number {
  return differenceInDays(endTime, startTime);
}

/**
 * Check if event is happening on specific date
 */
export function isEventOnDate(
  eventStart: number,
  eventEnd: number,
  date: Date,
  timezone: string = getUserTimezone(),
): boolean {
  const start = timestampToDate(eventStart, timezone);
  const end = timestampToDate(eventEnd, timezone);
  const zonedDate = toZonedTime(date, timezone);

  return isWithinInterval(zonedDate, { start, end });
}

/**
 * Check if two events overlap
 */
export function doEventsOverlap(
  event1Start: number,
  event1End: number,
  event2Start: number,
  event2End: number,
): boolean {
  return event1Start < event2End && event2Start < event1End;
}

/**
 * Get week number of year
 */
export function getWeekNumber(
  date: Date,
  timezone: string = getUserTimezone(),
): number {
  const zonedDate = toZonedTime(date, timezone);
  const start = getStartOfWeek(
    startOfMonth(new Date(zonedDate.getFullYear(), 0, 1)),
    timezone,
  );
  const diff = differenceInDays(zonedDate, start);
  return Math.ceil((diff + 1) / 7);
}

/**
 * Get all dates in a week
 */
export function getDatesInWeek(
  date: Date,
  timezone: string = getUserTimezone(),
  weekStartsOn: 0 | 1 = 0,
): Date[] {
  const start = getStartOfWeek(date, timezone, weekStartsOn);
  const dates: Date[] = [];

  for (let i = 0; i < 7; i++) {
    dates.push(addDays(start, i));
  }

  return dates;
}

/**
 * Get all dates in a month
 */
export function getDatesInMonth(
  date: Date,
  timezone: string = getUserTimezone(),
): Date[] {
  const start = getStartOfMonth(date, timezone);
  const end = getEndOfMonth(date, timezone);
  const dates: Date[] = [];

  let current = start;
  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Get calendar grid dates for month view
 * Includes dates from previous and next month to fill the grid
 */
export function getMonthGridDates(
  date: Date,
  timezone: string = getUserTimezone(),
  weekStartsOn: 0 | 1 = 0,
): Date[] {
  const monthStart = getStartOfMonth(date, timezone);
  const monthEnd = getEndOfMonth(date, timezone);

  // Get the start of the week containing the first day of the month
  const gridStart = getStartOfWeek(monthStart, timezone, weekStartsOn);

  // Get the end of the week containing the last day of the month
  const gridEnd = getEndOfWeek(monthEnd, timezone, weekStartsOn);

  const dates: Date[] = [];
  let current = gridStart;

  while (current <= gridEnd) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Create all-day event timestamps
 */
export function createAllDayTimestamps(
  date: Date,
  timezone: string = getUserTimezone(),
): { startTime: number; endTime: number } {
  const start = getStartOfDay(date, timezone);
  const end = addDays(start, 1);

  return {
    startTime: dateToTimestamp(start),
    endTime: dateToTimestamp(end),
  };
}

/**
 * Create timed event timestamps
 */
export function createTimedEventTimestamps(
  date: Date,
  startHour: number,
  startMinute: number,
  durationMinutes: number,
  timezone: string = getUserTimezone(),
): { startTime: number; endTime: number } {
  const zonedDate = toZonedTime(date, timezone);
  const start = new Date(zonedDate);
  start.setHours(startHour, startMinute, 0, 0);

  const end = addDays(start, 0);
  end.setTime(start.getTime() + durationMinutes * 60 * 1000);

  return {
    startTime: dateToTimestamp(start),
    endTime: dateToTimestamp(end),
  };
}

/**
 * Parse human-readable time (e.g., "2:30 PM") to hours and minutes
 */
export function parseTime(
  timeString: string,
): { hours: number; minutes: number } | null {
  const time12HourFormat = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
  const time24HourFormat = /^(\d{1,2}):(\d{2})$/;

  let match = timeString.match(time12HourFormat);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  }

  match = timeString.match(time24HourFormat);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    // Validate ranges
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return { hours, minutes };
  }

  return null;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}
