import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInCalendarDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  set,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TAIPEI_TIME_ZONE } from "@/helpers/dates";
import {
  CalendarEvent,
  CalendarEventInternal,
  DisplayCalendarEvent,
} from "./calendar.types";

export const eventsToDisplay = (
  events: CalendarEventInternal[],
  start: Date,
  end: Date,
) => {
  // keep events that are within the range, if repeated events, create new events for each repeated day, change the start and end date
  const newEvents = [] as DisplayCalendarEvent[];
  for (const event of events) {
    // use getRepeatedStartDays to see if matches the range, if over end date, break
    const repeatedDays = getRepeatedStartDays(event, start, end);
    for (const day of repeatedDays) {
      const newStart = day;
      //get original difference
      const diff = event.end.getTime() - event.start.getTime();
      const newEnd = new Date(newStart.getTime() + diff);

      if (event.allDay) {
        if (
          newStart < end &&
          newEnd > start &&
          !isExcludedOccurrence(event, newStart)
        ) {
          newEvents.push({
            ...event,
            displayStart: newStart,
            displayEnd: newEnd,
          });
        }
        if (newStart > end) {
          break;
        }
      } else {
        if (
          newStart < end &&
          newEnd > start &&
          !isExcludedOccurrence(event, newStart)
        ) {
          newEvents.push({
            ...event,
            displayStart: new Date(
              Math.max(newStart.getTime(), start.getTime()),
            ),
            displayEnd: new Date(Math.min(newEnd.getTime(), end.getTime())),
          });
        }
        // if later than end, break
        if (newStart > end) {
          break;
        }
      }
    }
  }
  return newEvents;
};

export const getAddFunc = (type: "daily" | "weekly" | "monthly" | "yearly") => {
  switch (type) {
    case "daily":
      return addDays;
    case "weekly":
      return addWeeks;
    case "monthly":
      return addMonths;
    case "yearly":
      return addYears;
  }
};

export const getDiffFunction = (
  type: "daily" | "weekly" | "monthly" | "yearly",
) => {
  switch (type) {
    case "daily":
      return differenceInDays;
    case "weekly":
      return differenceInWeeks;
    case "monthly":
      return differenceInMonths;
    case "yearly":
      return differenceInYears;
  }
};

const getRepeatInterval = (event: CalendarEvent) =>
  Math.max(1, Math.trunc(event.repeat?.interval ?? 1));

const WALL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS";

/** Convert an instant to a Date whose local fields represent Taipei time. */
const toTaipeiWallClock = (date: Date) => toZonedTime(date, TAIPEI_TIME_ZONE);

/** Convert a Taipei wall-clock Date back to its real instant. */
const fromTaipeiWallClock = (date: Date) =>
  fromZonedTime(format(date, WALL_DATE_TIME_FORMAT), TAIPEI_TIME_ZONE);

const setTaipeiTimeOfDay = (date: Date, source: Date) => {
  const targetWall = toTaipeiWallClock(date);
  const sourceWall = toTaipeiWallClock(source);
  return fromTaipeiWallClock(
    set(targetWall, {
      hours: sourceWall.getHours(),
      minutes: sourceWall.getMinutes(),
      seconds: sourceWall.getSeconds(),
      milliseconds: sourceWall.getMilliseconds(),
    }),
  );
};

const addTaipeiCalendarDays = (date: Date, days: number) =>
  fromTaipeiWallClock(addDays(toTaipeiWallClock(date), days));

const taipeiDateKey = (date: Date) =>
  format(toTaipeiWallClock(date), "yyyy-MM-dd");

const isExcludedOccurrence = (event: CalendarEvent, start: Date) =>
  (event.excludedDates ?? []).some(
    (excludedDate) => taipeiDateKey(excludedDate) === taipeiDateKey(start),
  );

/**
 * Return the occurrence at a zero-based series index.
 *
 * Monthly and yearly rules are anchored to the original start. If the anchor
 * day does not exist in the target month, the occurrence is clamped to that
 * month's last day. The same policy makes Feb 29 yearly rules recover their
 * leap-day anchor in the next leap year instead of drifting permanently.
 */
const getOccurrenceStart = (event: CalendarEvent, index: number) => {
  if (index === 0) return new Date(event.start);

  const interval = getRepeatInterval(event);
  const anchorWall = toTaipeiWallClock(event.start);
  switch (event.repeat?.type) {
    case "daily":
      return fromTaipeiWallClock(addDays(anchorWall, index * interval));
    case "weekly":
      return fromTaipeiWallClock(addWeeks(anchorWall, index * interval));
    case "monthly": {
      const targetMonth = addMonths(startOfMonth(anchorWall), index * interval);
      const targetDay = Math.min(
        anchorWall.getDate(),
        endOfMonth(targetMonth).getDate(),
      );
      return fromTaipeiWallClock(
        set(targetMonth, {
          date: targetDay,
          hours: anchorWall.getHours(),
          minutes: anchorWall.getMinutes(),
          seconds: anchorWall.getSeconds(),
          milliseconds: anchorWall.getMilliseconds(),
        }),
      );
    }
    case "yearly": {
      const targetYear = addYears(startOfYear(anchorWall), index * interval);
      const targetMonth = set(targetYear, {
        month: anchorWall.getMonth(),
        date: 1,
      });
      const targetDay = Math.min(
        anchorWall.getDate(),
        endOfMonth(targetMonth).getDate(),
      );
      return fromTaipeiWallClock(
        set(targetMonth, {
          date: targetDay,
          hours: anchorWall.getHours(),
          minutes: anchorWall.getMinutes(),
          seconds: anchorWall.getSeconds(),
          milliseconds: anchorWall.getMilliseconds(),
        }),
      );
    }
    default:
      return new Date(event.start);
  }
};

const compareCalendarDates = (left: Date, right: Date) =>
  taipeiDateKey(left).localeCompare(taipeiDateKey(right));

const getEstimatedOccurrenceIndex = (event: CalendarEvent, date: Date) => {
  const interval = getRepeatInterval(event);
  const anchorWall = toTaipeiWallClock(event.start);
  const dateWall = toTaipeiWallClock(date);
  switch (event.repeat?.type) {
    case "daily":
      return Math.floor(
        differenceInCalendarDays(dateWall, anchorWall) / interval,
      );
    case "weekly":
      return Math.floor(
        differenceInCalendarDays(dateWall, anchorWall) / (7 * interval),
      );
    case "monthly":
      return Math.floor(
        ((dateWall.getFullYear() - anchorWall.getFullYear()) * 12 +
          dateWall.getMonth() -
          anchorWall.getMonth()) /
          interval,
      );
    case "yearly":
      return Math.floor(
        (dateWall.getFullYear() - anchorWall.getFullYear()) / interval,
      );
    default:
      return 0;
  }
};

const getLastOccurrenceIndexAtOrBefore = (
  event: CalendarEvent,
  date: Date,
  compareByCalendarDate = false,
) => {
  let index = getEstimatedOccurrenceIndex(event, date);
  if (index < 0) return -1;

  const isAfter = (occurrence: Date) =>
    compareByCalendarDate
      ? compareCalendarDates(occurrence, date) > 0
      : occurrence.getTime() > date.getTime();

  while (index >= 0 && isAfter(getOccurrenceStart(event, index))) index -= 1;
  while (!isAfter(getOccurrenceStart(event, index + 1))) index += 1;
  return index;
};

const getFirstOccurrenceIndexAtOrBefore = (
  event: CalendarEvent,
  date: Date,
) => {
  let index = Math.max(0, getEstimatedOccurrenceIndex(event, date));
  while (
    index > 0 &&
    getOccurrenceStart(event, index).getTime() > date.getTime()
  ) {
    index -= 1;
  }
  while (getOccurrenceStart(event, index + 1).getTime() <= date.getTime()) {
    index += 1;
  }
  return index;
};

const getLastRuleOccurrenceIndex = (event: CalendarEvent) => {
  if (!event.repeat) return 0;
  if (event.repeat.mode === "count") {
    return Math.trunc(event.repeat.value) - 1;
  }
  const cutoff = new Date(event.repeat.value);
  if (Number.isNaN(cutoff.getTime())) return -1;
  return getLastOccurrenceIndexAtOrBefore(event, cutoff, true);
};

const getExactOccurrenceIndex = (
  event: CalendarEvent,
  occurrenceStart: Date,
) => {
  if (!event.repeat) {
    return event.start.getTime() === occurrenceStart.getTime() ? 0 : null;
  }

  let index = Math.max(0, getEstimatedOccurrenceIndex(event, occurrenceStart));
  while (
    index > 0 &&
    getOccurrenceStart(event, index).getTime() > occurrenceStart.getTime()
  ) {
    index -= 1;
  }
  while (
    getOccurrenceStart(event, index).getTime() < occurrenceStart.getTime()
  ) {
    index += 1;
  }
  return getOccurrenceStart(event, index).getTime() ===
    occurrenceStart.getTime()
    ? index
    : null;
};

/**
 * Return the rule that keeps occurrences before the selected occurrence.
 * Count rules retain count mode and set the count to the number of remaining
 * slots. Date rules use the preceding calendar date as their cutoff.
 */
export const getRepeatDefinitionBefore = (
  event: CalendarEvent,
  occurrenceStart: Date,
) => {
  if (!event.repeat) return null;
  const index = getExactOccurrenceIndex(event, occurrenceStart);
  if (index === null) return event.repeat;
  if (index === 0) return null;
  if (event.repeat.mode === "count") {
    return { ...event.repeat, value: index };
  }
  return {
    ...event.repeat,
    mode: "date" as const,
    value: addTaipeiCalendarDays(
      fromTaipeiWallClock(
        set(toTaipeiWallClock(occurrenceStart), {
          hours: 0,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        }),
      ),
      -1,
    ).getTime(),
  };
};

/** Re-anchor an edit-all payload to the root series date. */
export const reanchorSeriesEdit = <T extends CalendarEvent>(
  rootEvent: CalendarEvent,
  editedEvent: T,
) => {
  const start = setTaipeiTimeOfDay(rootEvent.start, editedEvent.start);
  const duration = editedEvent.end.getTime() - editedEvent.start.getTime();
  return {
    ...editedEvent,
    start,
    end: new Date(start.getTime() + duration),
  };
};

export function* getRepeatedStartDays(
  event: CalendarEvent,
  rangeStart = event.start,
  rangeEnd = event.repeat ? (getDisplayEndDate(event) ?? event.end) : event.end,
) {
  const lastRuleIndex = getLastRuleOccurrenceIndex(event);
  if (lastRuleIndex < 0) return;

  const firstIndex = event.repeat
    ? getFirstOccurrenceIndexAtOrBefore(event, rangeStart)
    : 0;
  const lastRangeIndex = event.repeat
    ? getLastOccurrenceIndexAtOrBefore(event, rangeEnd)
    : 0;
  const lastIndex = Math.min(lastRuleIndex, lastRangeIndex);

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    yield getOccurrenceStart(event, index);
  }
}

export const getActualEndDate = (event: CalendarEvent) => {
  const date = getDisplayEndDate(event);
  return date ? date.toISOString() : null;
};

export const getDisplayEndDate = (event: CalendarEvent) => {
  // if event is not bounded, return null
  if (!event.repeat) {
    return event.end;
  }
  const lastIndex = getLastRuleOccurrenceIndex(event);
  if (lastIndex < 0) return null;
  const lastStart = getOccurrenceStart(event, lastIndex);
  return new Date(
    lastStart.getTime() + (event.end.getTime() - event.start.getTime()),
  );
};

export const getWeek = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return eachDayOfInterval({
    start: start,
    end: end,
  });
};

export const getMonthForDisplay = (date: Date) => {
  // get all weeks in the month, including the days from the previous and next month
  const firstDay = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const lastDay = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  return eachDayOfInterval({
    start: firstDay,
    end: lastDay,
  });
};

export const serializeEvent = (event: Partial<CalendarEventInternal>) => {
  return {
    ...event,
    ...(event.start && { start: event.start.toISOString() }),
    ...(event.end && { end: event.end.toISOString() }),
    ...(event.repeat && { repeat: event.repeat }),
    ...(event.actualEnd && { actualEnd: event.actualEnd.toISOString() }),
    ...(event.excludedDates && {
      excludedDates: event.excludedDates
        .filter((m) => m && m instanceof Date)
        .map((d) => d.toISOString()),
    }),
  };
};
