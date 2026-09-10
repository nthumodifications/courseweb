import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  set,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TAIPEI_TIME_ZONE = "Asia/Taipei";
const DATE_KEY_FORMAT = "yyyy-MM-dd";
const WALL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS";

/** A date-only value from an academic feed is a Taipei calendar date. */
export const fromTaipeiDateKey = (dateKey: string) =>
  fromZonedTime(`${dateKey}T00:00:00.000`, TAIPEI_TIME_ZONE);

export const getTaipeiDateKey = (date: Date) =>
  formatInTimeZone(date, TAIPEI_TIME_ZONE, DATE_KEY_FORMAT);

/**
 * Convert a date picker value, whose local fields are a date without a time,
 * to the corresponding Taipei midnight instant.
 */
export const fromTaipeiCalendarDate = (date: Date) =>
  fromTaipeiDateKey(format(date, DATE_KEY_FORMAT));

export const isTaipeiDateKey = (dateKey: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const date = fromTaipeiDateKey(dateKey);
  return !Number.isNaN(date.getTime()) && getTaipeiDateKey(date) === dateKey;
};

/** Add calendar days in Taipei, preserving the Taipei wall-clock time. */
export const addTaipeiDays = (date: Date, days: number) =>
  fromZonedTime(
    format(
      addDays(toZonedTime(date, TAIPEI_TIME_ZONE), days),
      WALL_DATE_TIME_FORMAT,
    ),
    TAIPEI_TIME_ZONE,
  );

/** Add calendar months while preserving the Taipei wall-clock fields. */
export const addTaipeiMonths = (date: Date, months: number) =>
  fromTaipeiWallClock(addMonths(toTaipeiWallClock(date), months));

/** Return the beginning of the date in Taipei, as an instant. */
export const startOfTaipeiDay = (date: Date) =>
  fromTaipeiDateKey(getTaipeiDateKey(date));

/** Return the final millisecond of the date in Taipei, as an instant. */
export const endOfTaipeiDay = (date: Date) =>
  new Date(addTaipeiDays(startOfTaipeiDay(date), 1).getTime() - 1);

/** Difference between calendar dates in Taipei, independent of browser TZ. */
export const differenceInTaipeiCalendarDays = (
  laterDate: Date,
  earlierDate: Date,
) => {
  const later = toTaipeiWallClock(laterDate);
  const earlier = toTaipeiWallClock(earlierDate);
  return Math.round(
    (Date.UTC(later.getFullYear(), later.getMonth(), later.getDate()) -
      Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())) /
      (24 * 60 * 60 * 1000),
  );
};

/** Read the weekday of an instant using Taipei's calendar day. */
export const getTaipeiDay = (date: Date) => toTaipeiWallClock(date).getDay();

/** Compare month membership using Taipei wall-clock fields. */
export const isSameTaipeiMonth = (left: Date, right: Date) => {
  const leftWall = toTaipeiWallClock(left);
  const rightWall = toTaipeiWallClock(right);
  return (
    leftWall.getFullYear() === rightWall.getFullYear() &&
    leftWall.getMonth() === rightWall.getMonth()
  );
};

/** Compare week membership using Sunday-starting Taipei calendar weeks. */
export const isSameTaipeiWeek = (left: Date, right: Date) =>
  getTaipeiDateKey(getTaipeiWeek(left)[0]) ===
  getTaipeiDateKey(getTaipeiWeek(right)[0]);

export type TaipeiDateRange = {
  start: Date;
  /** Exclusive instant immediately after the inclusive end date. */
  end: Date;
  startDateKey: string;
  endDateKey: string;
};

/** Convert an inclusive Taipei date range to an exclusive instant range. */
export const getTaipeiDateRange = (
  startDateKey: string,
  inclusiveEndDateKey = startDateKey,
): TaipeiDateRange | null => {
  if (
    !isTaipeiDateKey(startDateKey) ||
    !isTaipeiDateKey(inclusiveEndDateKey) ||
    inclusiveEndDateKey < startDateKey
  ) {
    return null;
  }

  return {
    start: fromTaipeiDateKey(startDateKey),
    end: addTaipeiDays(fromTaipeiDateKey(inclusiveEndDateKey), 1),
    startDateKey,
    endDateKey: inclusiveEndDateKey,
  };
};

export const getRangeOfDays = (start: Date, end: Date) => {
  const days = [];
  let date = fromTaipeiDateKey(getTaipeiDateKey(start));
  const endDateKey = getTaipeiDateKey(end);
  while (getTaipeiDateKey(date) <= endDateKey) {
    days.push(date);
    date = addTaipeiDays(date, 1);
  }
  return days;
};

/** Return a Sunday-starting week as Taipei midnight instants. */
export const getTaipeiWeek = (date: Date) => {
  const wallDate = toTaipeiWallClock(date);
  return eachDayOfInterval({
    start: startOfWeek(wallDate, { weekStartsOn: 0 }),
    end: endOfWeek(wallDate, { weekStartsOn: 0 }),
  }).map(fromTaipeiCalendarDate);
};

/** Return the month grid, including adjacent days, as Taipei instants. */
export const getTaipeiMonthForDisplay = (date: Date) => {
  const wallDate = toTaipeiWallClock(date);
  const firstDay = startOfWeek(startOfMonth(wallDate), { weekStartsOn: 0 });
  const lastDay = endOfWeek(endOfMonth(wallDate), { weekStartsOn: 0 });
  return eachDayOfInterval({ start: firstDay, end: lastDay }).map(
    fromTaipeiCalendarDate,
  );
};

/**
 * The academic API truncates ISO inputs to their UTC date before querying
 * Google, so a Taipei date is sent as 08:00 Taipei — 00:00 UTC — which keeps
 * the intended calendar date on both sides.
 */
export const toAcademicCalendarBoundary = (dateKey: string) =>
  fromZonedTime(`${dateKey}T08:00:00.000`, TAIPEI_TIME_ZONE).toISOString();

/**
 * Build the academic API's half-open range from inclusive Taipei date keys.
 * The API truncates each ISO input to its UTC date, so the end key is the
 * Taipei date immediately after the final day to keep that day in the query.
 */
export const getTaipeiAcademicCalendarQuery = (
  startDateKey: string,
  inclusiveEndDateKey: string,
) => {
  const range = getTaipeiDateRange(startDateKey, inclusiveEndDateKey);
  if (!range) return null;

  return {
    start: toAcademicCalendarBoundary(range.startDateKey),
    end: toAcademicCalendarBoundary(getTaipeiDateKey(range.end)),
  };
};

/**
 * True when `date` falls on the same Taipei calendar day as `now`.
 *
 * date-fns `isToday` compares against the browser's local day, so a user
 * outside Taiwan sees the wrong column highlighted while the rest of the app
 * — which is Taipei-based throughout — disagrees with it.
 */
export const isTaipeiToday = (date: Date, now: Date = new Date()) =>
  getTaipeiDateKey(date) === getTaipeiDateKey(now);

/**
 * The same instant expressed so the local getters (`getHours`, `getMinutes`,
 * `getMonth`, …) read Taipei wall-clock values. Use it for positioning and
 * formatting the clock, never for storing or comparing instants.
 */
export const toTaipeiWallClock = (date: Date) =>
  toZonedTime(date, TAIPEI_TIME_ZONE);

/** Interpret a Date's local fields as Taipei wall-clock fields. */
export const fromTaipeiWallClock = (date: Date) =>
  fromZonedTime(format(date, WALL_DATE_TIME_FORMAT), TAIPEI_TIME_ZONE);

/** Set time fields in Taipei and return the resulting instant. */
export const setTaipeiWallClock = (
  date: Date,
  values: {
    hours: number;
    minutes: number;
    seconds?: number;
    milliseconds?: number;
  },
) =>
  fromTaipeiWallClock(
    set(toTaipeiWallClock(date), {
      ...values,
      seconds: values.seconds ?? 0,
      milliseconds: values.milliseconds ?? 0,
    }),
  );

/** Format an instant using Taipei wall-clock fields. */
export const formatTaipei = (
  date: Date,
  formatString: string,
  options?: Parameters<typeof format>[2],
) => format(toTaipeiWallClock(date), formatString, options);
