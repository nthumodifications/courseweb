import { CourseTimeslotData } from "@/types/timetable";
export interface RepeatDefinition {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  /** Total occurrence slots when mode is count; inclusive local date cutoff when mode is date. */
  value: number;
  mode: "count" | "date";
}

export interface CalendarEvent {
  id: string;
  title: string;
  details?: string;
  location?: string;
  allDay: boolean;
  start: Date;
  end: Date;
  repeat: null | RepeatDefinition;
  color: string;
  tag: string | "none";
  courseId?: string | null;
  excludedDates?: Date[];
  parentId?: string;
  readonly?: boolean;
}

export interface CalendarEventInternal extends CalendarEvent {
  /** Materialized recurrence bound written by getActualEndDate for storage/query compatibility. */
  actualEnd: Date | null;
}

export interface DisplayCalendarEvent extends CalendarEventInternal {
  displayStart: Date;
  displayEnd: Date;
}

export type TimetableSyncRequest = {
  semester: string;
  courses: CourseTimeslotData[];
  reason: "modified" | "new";
};
