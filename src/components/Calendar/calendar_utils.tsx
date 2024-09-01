import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  compareAsc,
  differenceInDays,
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
    const repeatedDays = getRepeatedStartDays(event);
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
          }).some((d) => isWithinInterval(d, { start: newStart, end: newEnd }))
        ) {
          newEvents.push({
            ...event,
            displayStart: newStart,
            displayEnd: newEnd,
          });
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

export function* getRepeatedStartDays(event: CalendarEvent) {
  const days = [event.start];
  yield event.start;
  if (event.repeat) {
    let currDay = new Date(event.start);
    const { type, interval } = event.repeat;

    while (true) {
      //check if count is reached, if so, break
      if (event.repeat.mode == "count" && days.length >= event.repeat.value) {
        break;
      }
      currDay = getAddFunc(event.repeat.type)(currDay, interval ?? 1);
      //check if date is later than end date, if so, break
      if (
        event.repeat.mode == "date" &&
        currDay > new Date(event.repeat.value)
      ) {
        break;
      }
      days.push(new Date(currDay));
      yield new Date(currDay);
    }
  }

  return days;
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
  // from count, calculate the end date
  else if (event.repeat.mode === "count") {
    const endDate = getAddFunc(event.repeat.type)(
      event.end,
      event.repeat.value,
    );
    return endDate;
  }
  // from date, calculate the end date
  else if (event.repeat.mode == "date") {
    // if daily, just return the end date with time set to the same as end
    if (event.repeat.type === "daily") {
      return set(event.repeat.value, {
        hours: event.end.getHours(),
        minutes: event.end.getMinutes(),
      });
    }
    // if weekly, find the same day of the week as the end date
    if (event.repeat.type === "weekly") {
      //check if the day of the week is the same
      const diff = new Date(event.repeat.value).getDay() - event.end.getDay();
      const newDate = addDays(event.repeat.value, -diff);
      return set(newDate, {
        hours: event.end.getHours(),
        minutes: event.end.getMinutes(),
      });
    }
    // if monthly, find the same day of the month as the end date
    if (event.repeat.type === "monthly") {
      // set the date to the same day of the month, before the repeat date
      const newDate = set(event.repeat.value, { date: event.end.getDate() });
      // if the date is later than the repeat date, subtract a mon
      if (newDate > new Date(event.repeat.value)) {
        return addMonths(newDate, -1);
      }
      return newDate;
    }
    // if yearly, find the same day of the year as the end date
    if (event.repeat.type === "yearly") {
      // set the date to the same day of the year, before the repeat date
      const newDate = set(event.repeat.value, {
        date: event.end.getDate(),
        month: event.end.getMonth(),
      });
      // if the date is later than the repeat date, subtract a year
      if (newDate > new Date(event.repeat.value)) {
        return addYears(newDate, -1);
      }
      return newDate;
    }
  }
  return null;
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
  // convert dates to ISO string
  console.log("ser", {
    ...event,
    ...(event.start && { start: event.start.toISOString() }),
    ...(event.end && { end: event.end.toISOString() }),
    ...(event.repeat && {
      repeat: event.repeat,
    }),
    ...(event.actualEnd && { actualEnd: event.actualEnd.toISOString() }),
    ...(event.excludedDates && {
      excludedDates: event.excludedDates
        .filter((m) => m && m instanceof Date)
        .map((d) => d.toISOString()),
    }),
  });
  return {
    ...event,
    ...(event.start && { start: event.start.toISOString() }),
    ...(event.end && { end: event.end.toISOString() }),
    ...(event.repeat && {
      repeat: event.repeat,
    }),
    ...(event.actualEnd && { actualEnd: event.actualEnd.toISOString() }),
    ...(event.excludedDates && {
      excludedDates: event.excludedDates.map((d) => d.toISOString()),
    }),
  };
};
