/**
 * useTimetableSync hook
 *
 * Automatically syncs timetable courses to the calendar
 */

import { useEffect, useCallback } from "react";
import { useRxDB } from "rxdb-hooks";
import { createTimetableFromCourses } from "@/helpers/timetable";
import {
  syncTimetableToCalendar,
  clearTimetableEvents,
} from "@/lib/utils/timetable-calendar-sync";
import type { MinimalCourse } from "@/types/courses";

// Semester date ranges (these should ideally come from a config/API)
// For now, using approximate dates
const SEMESTER_DATES: { [semId: string]: { start: Date; end: Date } } = {
  "11310": { start: new Date("2024-09-01"), end: new Date("2025-01-31") },
  "11320": { start: new Date("2025-02-01"), end: new Date("2025-06-30") },
  "11410": { start: new Date("2025-09-01"), end: new Date("2026-01-31") },
  "11420": { start: new Date("2026-02-01"), end: new Date("2026-06-30") },
};

export function useTimetableSync(
  courses: MinimalCourse[],
  colorMap: { [courseId: string]: string },
  semester: string,
  enabled: boolean = true,
) {
  const db = useRxDB();

  const syncNow = useCallback(async () => {
    if (!db || !enabled || courses.length === 0) return;

    try {
      // Convert courses to timetable data
      const timetableData = createTimetableFromCourses(courses, colorMap);

      // Get semester dates
      const semesterDates = SEMESTER_DATES[semester] || {
        start: new Date(),
        end: new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
      };

      // Sync to calendar
      await syncTimetableToCalendar(
        db,
        timetableData,
        semesterDates.start,
        semesterDates.end,
      );

      console.log(
        "[TimetableSync] Synced",
        timetableData.length,
        "timeslots to calendar",
      );
    } catch (error) {
      console.error("[TimetableSync] Failed to sync:", error);
    }
  }, [db, enabled, courses, colorMap, semester]);

  const clearAll = useCallback(async () => {
    if (!db) return;
    try {
      await clearTimetableEvents(db);
      console.log("[TimetableSync] Cleared all timetable events");
    } catch (error) {
      console.error("[TimetableSync] Failed to clear:", error);
    }
  }, [db]);

  // Auto-sync when courses or colorMap changes
  useEffect(() => {
    if (!enabled) return;
    syncNow();
  }, [syncNow, enabled]);

  return {
    syncNow,
    clearAll,
  };
}
