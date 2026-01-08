/**
 * useCalendars hook - Fetch all calendars from RxDB
 *
 * This hook fetches all calendars with reactive updates.
 */

import { useRxQuery } from "rxdb-hooks";
import { useMemo } from "react";
import type { Calendar } from "@/config/rxdb-calendar-v2";

export interface UseCalendarsResult {
  calendars: Calendar[];
  loading: boolean;
}

/**
 * Fetch all calendars
 *
 * @example
 * ```tsx
 * const { calendars, loading } = useCalendars();
 * ```
 */
export function useCalendars(): UseCalendarsResult {
  const { result: calendars, isFetching } = useRxQuery(
    "calendar_calendars",
    (collection) =>
      collection.find({
        selector: {
          deleted: { $ne: true },
        },
        sort: [{ createdAt: "asc" }],
      }),
  );

  const calendarsList = useMemo(() => {
    return calendars ?? [];
  }, [calendars]);

  return {
    calendars: calendarsList,
    loading: isFetching,
  };
}
