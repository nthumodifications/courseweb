/**
 * CalendarAppWithTimetable
 *
 * Wrapper around CalendarApp that integrates timetable sync
 */

"use client";

import React from "react";
import { CalendarApp } from "./CalendarApp";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useTimetableSync } from "@/lib/hooks/use-timetable-sync";

export function CalendarAppWithTimetable() {
  const { semesterCourses, colorMap, semester } = useUserTimetable();

  // Auto-sync timetable to calendar
  useTimetableSync(semesterCourses, colorMap, semester, true);

  return <CalendarApp />;
}
