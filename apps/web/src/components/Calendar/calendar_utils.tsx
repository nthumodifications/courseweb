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
  endOfDay,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
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
      const newStart = set(event.start, {
        year: day.getFullYear(),
        month: day.getMonth(),
        date: day.getDate(),
      });
      //get original difference
      const diff = event.end.getTime() - event.start.getTime();
      const newEnd = new Date(newStart.getTime() + diff);

      if (event.allDay) {
        // if any day of start to end is within newStart and newEnd, add the event
        if (
          eachDayOfInterval({
            start: startOfDay(start),
            end: endOfDay(end),
          }).some((d) =>
            isWithinInterval(d, { start: newStart, end: newEnd }),
          ) &&
          (event.excludedDates ?? []).every((d) => !isSameDay(d, newStart))
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
          newStart >= start &&
          newStart <= end &&
          (event.excludedDates ?? [])?.every((d) => !isSameDay(d, newStart))
        ) {
          newEvents.push({
            ...event,
            displayStart: newStart,
            displayEnd: newEnd,
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

const setTimeOfDay = (date: Date, source: Date) =>
  set(date, {
    hours: source.getHours(),
    minutes: source.getMinutes(),
    seconds: source.getSeconds(),
    milliseconds: source.getMilliseconds(),
  });

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
  switch (event.repeat?.type) {
    case "daily":
      return addDays(event.start, index * interval);
    case "weekly":
      return addWeeks(event.start, index * interval);
    case "monthly": {
      const targetMonth = addMonths(
        startOfMonth(event.start),
        index * interval,
      );
      const targetDay = Math.min(
        event.start.getDate(),
        endOfMonth(targetMonth).getDate(),
      );
      return setTimeOfDay(set(targetMonth, { date: targetDay }), event.start);
    }
    case "yearly": {
      const targetYear = addYears(startOfYear(event.start), index * interval);
      const targetMonth = set(targetYear, {
        month: event.start.getMonth(),
        date: 1,
      });
      const targetDay = Math.min(
        event.start.getDate(),
        endOfMonth(targetMonth).getDate(),
      );
      return setTimeOfDay(set(targetMonth, { date: targetDay }), event.start);
    }
    default:
      return new Date(event.start);
  }
};

const compareCalendarDates = (left: Date, right: Date) =>
  startOfDay(left).getTime() - startOfDay(right).getTime();

const getEstimatedOccurrenceIndex = (event: CalendarEvent, date: Date) => {
  const interval = getRepeatInterval(event);
  switch (event.repeat?.type) {
    case "daily":
      return Math.floor(differenceInCalendarDays(date, event.start) / interval);
    case "weekly":
      return Math.floor(
        differenceInCalendarDays(date, event.start) / (7 * interval),
      );
    case "monthly":
      return Math.floor(
        ((date.getFullYear() - event.start.getFullYear()) * 12 +
          date.getMonth() -
          event.start.getMonth()) /
          interval,
      );
    case "yearly":
      return Math.floor(
        (date.getFullYear() - event.start.getFullYear()) / interval,
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
    value: addDays(startOfDay(occurrenceStart), -1).getTime(),
  };
};

/** Re-anchor an edit-all payload to the root series date. */
export const reanchorSeriesEdit = <T extends CalendarEvent>(
  rootEvent: CalendarEvent,
  editedEvent: T,
) => {
  const start = setTimeOfDay(rootEvent.start, editedEvent.start);
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
