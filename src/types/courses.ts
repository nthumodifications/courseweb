import { CourseDefinition } from "@/config/supabase";
import { Database } from "./supabase";

export type CourseTimeslotData = {
    course: CourseDefinition,
    dayOfWeek: number,
    startTime: number,
    endTime: number,
    color: string
};