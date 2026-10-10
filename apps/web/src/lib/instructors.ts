import { decode } from "html-entities";
import type { CourseDefinition } from "@/config/supabase";

/** The display form for an instructor name, without changing its identity. */
export const normaliseInstructorName = (value: string) =>
  decode(value).normalize("NFKC").replace(/\s+/gu, " ").trim();

export const encodeInstructorRouteParam = (value: string) =>
  encodeURIComponent(encodeURIComponent(value));

export const decodeInstructorRouteParam = (value: string | undefined) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Pair bilingual names only when the source arrays are index-aligned. */
export const pairInstructorNames = (
  teacherZh: readonly string[] | null | undefined,
  teacherEn: readonly string[] | null | undefined,
) => {
  if (!teacherZh || !teacherEn || teacherZh.length !== teacherEn.length) {
    return [];
  }

  return teacherZh.flatMap((nameZh, index) => {
    const nameEn = teacherEn[index];
    return nameZh.trim() && nameEn?.trim() ? [{ nameZh, nameEn }] : [];
  });
};

const NON_INSTRUCTOR_NAMES = new Set([
  "EMS境外專班",
  "清華學院學士班",
  "SNHCC Prog",
  "服科所全體教師",
]);

export const isInstructorPageName = (name: string) => {
  const normalized = normaliseInstructorName(name);
  return Boolean(normalized) && !NON_INSTRUCTOR_NAMES.has(normalized);
};

export interface InstructorSemesterGroup {
  semester: string;
  courses: CourseDefinition[];
}

const semesterSortValue = (semester: string) => {
  const match = /^(\d{3})([123])$/.exec(semester);
  if (!match) return Number.MIN_SAFE_INTEGER;

  return Number(match[1]) * 3 + Number(match[2]);
};

/** Group exact instructor matches by semester, newest semester first. */
export const groupInstructorCourses = (
  courses: readonly CourseDefinition[],
): InstructorSemesterGroup[] => {
  const groups = new Map<string, CourseDefinition[]>();
  for (const course of courses) {
    const current = groups.get(course.semester) ?? [];
    current.push(course);
    groups.set(course.semester, current);
  }

  return [...groups.entries()]
    .map(([semester, semesterCourses]) => ({
      semester,
      courses: [...semesterCourses].sort((left, right) =>
        right.raw_id.localeCompare(left.raw_id),
      ),
    }))
    .sort(
      (left, right) =>
        semesterSortValue(right.semester) - semesterSortValue(left.semester) ||
        right.semester.localeCompare(left.semester),
    );
};
