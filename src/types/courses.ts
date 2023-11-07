import { type } from "os";

export type Department = { code: string; name_zh: string; name_en: string; };

export type RawCourseID = string;
export type DepartmentCode = string;
export type CourseCode = string;
export type ClassCode = string;
export type Credits = number;
export type Venue = string;
export type Time = string;
export type TeacherZH = string;
export type Language = '中' | '英';

export interface MinimalCourse {
    raw_id: RawCourseID;
    name_zh: string;
    name_en: string;
    department: DepartmentCode;
    course: CourseCode;
    class: ClassCode;
    credits: Credits;
    venues: Venue[];
    times: Time[];
    teacher_zh: TeacherZH[];
    language: Language;
}
