import { type } from "os";

export type Department = { code: string; name_zh: string; name_en: string };

export type RawCourseID = string;
export type Semester = string;
export type DepartmentCode = string;
export type CourseCode = string;
export type ClassCode = string;
export type Credits = number;
export type Venue = string;
export type Time = string;
export type TeacherZH = string;
export type TeacherEN = string;
export type Language = "中" | "英";

export interface MinimalCourse {
  raw_id: RawCourseID;
  name_zh: string;
  name_en: string;
  semester: Semester;
  department: DepartmentCode;
  course: CourseCode;
  class: ClassCode;
  credits: Credits;
  venues: Venue[];
  times: Time[];
  teacher_zh: TeacherZH[];
  teacher_en: TeacherEN[];
  language: Language;
}

export const selectMinimalStr = `raw_id, name_zh, name_en, semester, department, course, class, credits, venues, times, teacher_zh, teacher_en, language`;
