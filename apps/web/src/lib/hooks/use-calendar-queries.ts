/**
 * View-specific calendar query hooks
 *
 * These hooks provide optimized queries for different calendar views.
 * They handle date range calculation and event prefetching for smooth navigation.
 */

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  addDays,
} from "date-fns";
import {
  useCalendarEvents,
  type UseCalendarEventsResult,
} from "./use-calendar-events";

/**
 * Fetch events for week view
 *
 * Loads the current week plus one week before and after for smooth navigation
 */
export function useWeekViewEvents(
  date: Date,
  calendarIds: string[],
): UseCalendarEventsResult {
  // Load 1 week before and 1 week after for smooth scrolling
  const start = startOfWeek(addWeeks(date, -1), { weekStartsOn: 0 }); // Sunday
  const end = endOfWeek(addWeeks(date, 1), { weekStartsOn: 0 });

  return useCalendarEvents({
    calendarIds,
    rangeStart: start,
    rangeEnd: end,
  });
}

/**
 * Fetch events for month view
 *
 * Loads the current month plus previous and next month for navigation
 */
export function useMonthViewEvents(
  date: Date,
  calendarIds: string[],
): UseCalendarEventsResult {
  // Load previous month, current month, and next month
  const start = startOfMonth(addMonths(date, -1));
  const end = endOfMonth(addMonths(date, 1));

  return useCalendarEvents({
    calendarIds,
    rangeStart: start,
    rangeEnd: end,
  });
}

/**
 * Fetch events for day view
 *
 * Loads the current day plus one day before and after
 */
export function useDayViewEvents(
  date: Date,
  calendarIds: string[],
): UseCalendarEventsResult {
  // Load 1 day before and after for smooth navigation
  const start = addDays(date, -1);
  const end = addDays(date, 1);

  // Set to start/end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return useCalendarEvents({
    calendarIds,
    rangeStart: start,
    rangeEnd: end,
  });
}

/**
 * Fetch upcoming events for agenda view
 *
 * Loads events for the next 3 months
 */
export function useAgendaViewEvents(
  calendarIds: string[],
): UseCalendarEventsResult {
  const start = new Date();
  const end = addMonths(start, 3);

  return useCalendarEvents({
    calendarIds,
    rangeStart: start,
    rangeEnd: end,
  });
}

/**
 * Search events across all time
 *
 * For search functionality, we need to query all events
 * but we can still filter by calendar IDs
 */
export function useSearchEvents(
  query: string,
  calendarIds: string[],
): UseCalendarEventsResult {
  // For search, load a wide range (past year to next year)
  const start = addMonths(new Date(), -12);
  const end = addMonths(new Date(), 12);

  const result = useCalendarEvents({
    calendarIds,
    rangeStart: start,
    rangeEnd: end,
  });

  // Client-side filtering by search query
  const filteredEvents = result.events.filter((event) => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();
    return (
      event.title.toLowerCase().includes(lowerQuery) ||
      event.description?.toLowerCase().includes(lowerQuery) ||
      event.location?.toLowerCase().includes(lowerQuery) ||
      event.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });

  return {
    events: filteredEvents,
    isFetching: result.isFetching,
  };
}
