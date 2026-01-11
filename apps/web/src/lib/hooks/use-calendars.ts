/**
 * useCalendars hook - Fetch all calendars from RxDB
 *
 * This hook fetches all calendars with reactive updates.
 */

import { useRxQuery, useRxCollection } from "rxdb-hooks";
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
  const collection = useRxCollection("calendar_calendars");

  const query = useMemo(() => {
    if (!collection) return null;
    // Type assertion needed due to RxDB's generic MangoQuery typing
    return collection.find({
      selector: {
        deleted: { $ne: true },
      },
      sort: [{ createdAt: "asc" }],
    } as any);
  }, [collection]);

  const { result: calendarDocs, isFetching } = useRxQuery(query ?? undefined);

  const calendarsList = useMemo(() => {
    if (!calendarDocs) return [];
    return calendarDocs.map((doc) => (doc as any).toJSON() as Calendar);
  }, [calendarDocs]);

  return {
    calendars: calendarsList,
    loading: isFetching,
  };
}
