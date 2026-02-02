"use client";

/**
 * Test component for Calendar V2
 *
 * This component tests the new calendar hooks and displays basic event data.
 * Use this to verify the migration and event fetching work correctly.
 */

import { useRxDB } from "rxdb-hooks";
import { useEffect, useState } from "react";
import { useWeekViewEvents } from "@/lib/hooks/use-calendar-queries";
import { useCalendarUIStore } from "@/lib/store/calendar-ui-store";
import { Button } from "@courseweb/ui";
import { format } from "date-fns";

export function CalendarV2Test() {
  const db = useRxDB();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, visible: 0 });

  const selectedDate = useCalendarUIStore((state) => state.selectedDate);
  const visibleCalendarIds = useCalendarUIStore(
    (state) => state.visibleCalendarIds,
  );

  // Fetch all calendars
  useEffect(() => {
    if (!db?.calendars) return;

    const subscription = db.calendars
      .find({
        selector: {
          isDeleted: false,
        },
      })
      .$.subscribe((calendars: any) => {
        setCalendars(calendars.map((c: any) => c.toJSON()));
      });

    return () => subscription.unsubscribe();
  }, [db]);

  // Fetch events for week view
  const { events, isFetching } = useWeekViewEvents(
    selectedDate,
    visibleCalendarIds.length > 0
      ? visibleCalendarIds
      : calendars.map((c) => c.id),
  );

  // Calculate stats
  useEffect(() => {
    if (!db?.calendar_events) return;

    db.calendar_events
      .find({
        selector: {
          isDeleted: false,
        },
      })
      .exec()
      .then((allEvents: any) => {
        setStats({
          total: allEvents.length,
          visible: events.length,
        });
      });
  }, [db, events.length]);

  if (!db) {
    return <div className="p-4">Loading database...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900 rounded-lg shadow">
      <div>
        <h2 className="text-2xl font-bold mb-2">Calendar V2 Test</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Testing new calendar implementation
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {calendars.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Calendars
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded">
          <div className="text-2xl font-bold text-green-600">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Events
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded">
          <div className="text-2xl font-bold text-purple-600">
            {stats.visible}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Visible Events
          </div>
        </div>
      </div>

      {/* Calendars List */}
      <div>
        <h3 className="font-semibold mb-2">Calendars</h3>
        <div className="space-y-2">
          {calendars.map((calendar) => (
            <div
              key={calendar.id}
              className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: calendar.color }}
              />
              <div className="flex-1">
                <div className="font-medium">{calendar.name}</div>
                <div className="text-xs text-gray-500">
                  {calendar.source} • {calendar.isDefault ? "Default" : ""}
                </div>
              </div>
            </div>
          ))}
          {calendars.length === 0 && (
            <div className="text-gray-500 text-sm">
              No calendars found. Migration may be needed.
            </div>
          )}
        </div>
      </div>

      {/* Events List */}
      <div>
        <h3 className="font-semibold mb-2">
          Events for {format(selectedDate, "MMM d, yyyy")}
          {isFetching && " (Loading...)"}
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.slice(0, 10).map((event, idx) => (
            <div
              key={`${event.id}-${idx}`}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div className="font-medium">{event.title}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(event.instanceStart), "MMM d, h:mm a")} -{" "}
                {format(new Date(event.instanceEnd), "h:mm a")}
              </div>
              {event.isRecurringInstance && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Recurring Event
                </div>
              )}
              {event.rrule && (
                <div className="text-xs text-gray-500 mt-1">
                  RRULE: {event.rrule}
                </div>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-gray-500 text-sm">
              No events in this date range
            </div>
          )}
          {events.length > 10 && (
            <div className="text-sm text-gray-500">
              ... and {events.length - 10} more events
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            const today = new Date();
            useCalendarUIStore.getState().setSelectedDate(today);
          }}
        >
          Go to Today
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload Page
        </Button>
      </div>

      {/* Debug Info */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500">
          Debug Information
        </summary>
        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
          {JSON.stringify(
            {
              selectedDate: selectedDate.toISOString(),
              visibleCalendarIds,
              calendarCount: calendars.length,
              eventCount: events.length,
              isFetching,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
