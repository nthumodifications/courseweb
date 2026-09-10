import { addDays, format } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TAIPEI_TIME_ZONE = "Asia/Taipei";
const DATE_KEY_FORMAT = "yyyy-MM-dd";
const WALL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS";

/** A date-only value from an academic feed is a Taipei calendar date. */
export const fromTaipeiDateKey = (dateKey: string) =>
  fromZonedTime(`${dateKey}T00:00:00.000`, TAIPEI_TIME_ZONE);

export const getTaipeiDateKey = (date: Date) =>
  formatInTimeZone(date, TAIPEI_TIME_ZONE, DATE_KEY_FORMAT);

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

/**
 * The academic API truncates ISO inputs to their UTC date before querying
 * Google, so a Taipei date is sent as 08:00 Taipei — 00:00 UTC — which keeps
 * the intended calendar date on both sides.
 */
export const toAcademicCalendarBoundary = (dateKey: string) =>
  fromZonedTime(`${dateKey}T08:00:00.000`, TAIPEI_TIME_ZONE).toISOString();
