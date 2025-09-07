import { CourseTimeslotData } from "@/types/timetable";
export interface RepeatDefinition {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
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
  excludedDates?: Date[];
  parentId?: string;
  readonly?: boolean;
}

export interface CalendarEventInternal extends CalendarEvent {
  actualEnd: Date | null; // actual end of the event, used to determine repeating events
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
