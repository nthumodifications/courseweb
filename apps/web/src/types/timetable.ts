import { CourseDefinition } from "@/config/supabase";
import { MinimalCourse } from "@/types/courses";

export const CUSTOM_TIMETABLE_DAYS = [
  "M",
  "T",
  "W",
  "R",
  "F",
  "S",
  "U",
] as const;
export type CustomTimetableDay = (typeof CUSTOM_TIMETABLE_DAYS)[number];

export type CustomTimetableSlot = {
  /** 0 = Monday through 6 = Sunday. */
  day: number;
  /** Asia/Taipei wall-clock time in stable 24-hour HH:mm form. */
  start: string;
  /** Asia/Taipei wall-clock time in stable 24-hour HH:mm form. */
  end: string;
};

export type CustomTimetableItem = {
  id: string;
  title: string;
  shortCode?: string;
  venue?: string;
  note?: string;
  color: string;
  slots: CustomTimetableSlot[];
};

/** Read-only compatibility shape accepted from pre-freeform shares. */
export type LegacyCustomTimetableItem = Omit<CustomTimetableItem, "slots"> & {
  schedule: string[];
};

export type CustomTimetableItemInput =
  | CustomTimetableItem
  | LegacyCustomTimetableItem;

export type CustomTimetableStorage = Record<string, CustomTimetableItem[]>;
export type CustomTimetableStorageInput = Record<
  string,
  CustomTimetableItemInput[]
>;
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
  customSlot?: CustomTimetableSlot;
};

export type CourseTimeslotDataWithFraction = CourseTimeslotData & {
  fraction: number;
  fractionIndex: number;
  timeSlots: string[];
};
