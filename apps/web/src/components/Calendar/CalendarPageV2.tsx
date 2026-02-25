/**
 * CalendarPageV2 - Main calendar page using v2 implementation
 * Drop-in replacement for the old calendar
 */

"use client";

import React, { useEffect, useState } from "react";
import { CalendarAppWithTimetable } from "./v2/CalendarAppWithTimetable";
import { CalendarMigrationDialog } from "./CalendarMigrationDialog";
import { useRxDB } from "rxdb-hooks";
import { useCalendars } from "@/lib/hooks/use-calendars";
import { useCalendarUIStore } from "@/lib/store/calendar-ui-store";

export default function CalendarPageV2() {
  const db = useRxDB();
  const { calendars, loading } = useCalendars();
  const { visibleCalendarIds, setVisibleCalendars } = useCalendarUIStore();
  const [initialized, setInitialized] = useState(false);

  // Initialize visible calendars when they load
  useEffect(() => {
    if (!loading && calendars.length > 0 && !initialized) {
      // Set all calendars as visible by default
      const allCalendarIds = calendars
        .filter((cal) => !cal.isDeleted)
        .map((cal) => cal.id);

      if (visibleCalendarIds.length === 0) {
        setVisibleCalendars(allCalendarIds);
      }

      setInitialized(true);
    }
  }, [
    calendars,
    loading,
    initialized,
    visibleCalendarIds,
    setVisibleCalendars,
  ]);

  // Create default calendar if none exist
  useEffect(() => {
    const createDefaultCalendar = async () => {
      if (!db || loading) return;

      if (calendars.length === 0) {
        try {
          await db.calendars.insert({
            id: "default-calendar",
            name: "My Calendar",
            description: "Default calendar for personal events",
            color: "#3b82f6",
            isDefault: true,
            isVisible: true,
            source: "user",
            isDeleted: false,
            lastModified: Date.now(),
          });
        } catch (error) {
          console.error("Failed to create default calendar:", error);
        }
      }
    };

    createDefaultCalendar();
  }, [db, calendars, loading]);

  if (!db) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Initializing database...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden -mt-4 md:-ml-2 h-[calc(100vh-var(--header-height))]">
      <CalendarMigrationDialog />
      <CalendarAppWithTimetable />
    </div>
  );
}
