import { CourseDefinition } from "@/config/supabase";
import { MinimalCourse } from "@/types/courses";

export const CUSTOM_TIMETABLE_DAYS = ["M", "T", "W", "R", "F", "S"] as const;
export type CustomTimetableDay = (typeof CUSTOM_TIMETABLE_DAYS)[number];

/**
 * A user-owned timetable item. `schedule` deliberately uses the same encoded
 * day/period strings as a course's `times` field (for example, `M1M2`).
 */
export type CustomTimetableItem = {
  id: string;
  title: string;
  shortCode?: string;
  venue?: string;
  note?: string;
  color: string;
  schedule: string[];
};

export type CustomTimetableStorage = Record<string, CustomTimetableItem[]>;
export type TimeSlot = {
  time: string;
  start: string;
  end: string;
};

export type TimetableDim = {
  header: {
    width: number;
    height: number;
  };
  timetable: {
    width: number;
    height: number;
  };
};

export type CourseTimeslotData = {
  course: MinimalCourse;
  venue: string;
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  color: string;
  textColor: string;
  customItem?: CustomTimetableItem;
};

export type CourseTimeslotDataWithFraction = CourseTimeslotData & {
  fraction: number;
  fractionIndex: number;
  timeSlots: string[];
};
