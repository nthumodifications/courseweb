import { CourseDefinition } from "@/config/supabase";
import { MinimalCourse } from "@/types/courses";
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
};

export type CourseTimeslotDataWithFraction = CourseTimeslotData & {
  fraction: number;
  fractionIndex: number;
  timeSlots: string[];
};
