import type { CourseDefinition } from "@/config/supabase";
import type { FolderDocType } from "../rxdb";
import { normalizeSemesterId } from "./progress";

/** Parse the ROC entrance year encoded at the start of an NTHU student id. */
export function parseEnrollmentYearFromStudentId(
  studentId: string | null | undefined,
  currentRocYear = new Date().getFullYear() - 1911,
): string | undefined {
  const match = studentId?.match(/^(\d{3})/);
  if (!match) return undefined;
  const year = Number(match[1]);
  return year >= 100 && year <= currentRocYear ? match[1] : undefined;
}

export const defaultGraduationYear = (enrollmentYear: string | number) =>
  String(Number(enrollmentYear) + 4);

/** Enumerate ROC terms (including summer terms) from entry through `now`. */
export function enumerateTermsFromEnrollment(
  enrollmentYear: string | number,
  now: string,
): string[] {
  const startYear = Number(enrollmentYear);
  const endId = normalizeSemesterId(now);
  const match = endId.match(/^(\d{3})([1-3])0$/);
  if (!Number.isInteger(startYear) || startYear < 100 || !match) return [];

  const endYear = Number(match[1]);
  if (startYear > endYear) return [];

  const terms: string[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let term = 1; term <= 3; term += 1) {
      const id = `${String(year).padStart(3, "0")}${term}0`;
      if (id <= endId) terms.push(id);
    }
  }
  return terms;
}

/** Match course codes the same way as the planner's course search. */
export function normalizePlannerCourseCode(value?: string | null): string {
  if (!value) return "";
  const stripped = value.replace(/^\d{3}(?:[1-3]0|-[1-3])\s*/, "").trim();
  return stripped.toLowerCase().replace(/\s+/g, " ");
}

export function courseCodeFromRawId(rawId?: string | null): string {
  if (!rawId) return "";
  if (/^\d{5}/.test(rawId) || /^\d{3}-[1-3]/.test(rawId)) {
    return rawId.slice(5).trim();
  }
  return rawId;
}

type CourseIdentity = {
  raw_id?: string | null;
  id?: string | null;
  semester?: string | null;
};

/** Dedupe timetable rows, then omit courses already present in the planner. */
export function mergeTimetableCourses<T extends CourseIdentity>(
  incoming: T[],
  existing: CourseIdentity[],
): T[] {
  const existingRawIds = new Set(
    existing.map((course) => course.raw_id).filter(Boolean),
  );
  const existingCodes = new Set(
    existing
      .map((course) => normalizePlannerCourseCode(course.id))
      .filter(Boolean),
  );
  const seenRawIds = new Set<string>();
  const seenFallbackKeys = new Set<string>();

  return incoming.filter((course) => {
    const rawId = course.raw_id ?? "";
    const code = normalizePlannerCourseCode(
      course.id ?? courseCodeFromRawId(rawId),
    );
    if (rawId) {
      if (seenRawIds.has(rawId)) return false;
      seenRawIds.add(rawId);
      if (existingRawIds.has(rawId)) return false;
    } else {
      const fallbackKey = `${code}:${course.semester ?? ""}`;
      if (seenFallbackKeys.has(fallbackKey)) return false;
      seenFallbackKeys.add(fallbackKey);
    }
    return !code || !existingCodes.has(code);
  });
}

export type SetupCategoryKey =
  | "setup-general-education"
  | "setup-major-required"
  | "setup-major-elective";

const CATEGORY_TITLES: Record<SetupCategoryKey, string[]> = {
  "setup-general-education": ["通識", "General education"],
  "setup-major-required": ["系必修", "Major required"],
  "setup-major-elective": ["系選修", "Major elective"],
};

/** Conservatively map only known metadata to a category that actually exists. */
export function guessCourseCategory(
  course: Pick<CourseDefinition, "ge_type" | "compulsory_for" | "elective_for">,
  department: string,
  folders: Pick<FolderDocType, "id" | "title">[],
): string {
  const matchesDepartment = (departments: string[] | null) =>
    Boolean(
      department &&
        departments?.some(
          (entry) => entry === department || entry.includes(department),
        ),
    );
  let key: SetupCategoryKey | undefined;
  if (course.ge_type) key = "setup-general-education";
  else if (matchesDepartment(course.compulsory_for)) {
    key = "setup-major-required";
  } else if (matchesDepartment(course.elective_for)) {
    key = "setup-major-elective";
  }
  if (!key) return "_unsorted";

  const titles = CATEGORY_TITLES[key];
  return (
    folders.find((folder) => folder.id === key)?.id ??
    folders.find((folder) => titles.includes(folder.title))?.id ??
    "_unsorted"
  );
}

/** Dedupe by timetable raw id before inserting planner items. */
export function dedupeTimetableCourses<T extends CourseIdentity>(
  courses: T[],
): T[] {
  const seen = new Set<string>();
  return courses.filter((course) => {
    const rawId = course.raw_id;
    if (!rawId) return true;
    if (seen.has(rawId)) return false;
    seen.add(rawId);
    return true;
  });
}

/** Keep template placement while letting a timetable entry supply its real term. */
export function mergeTemplateAndTimetableItems<T extends CourseIdentity>(
  templateItems: T[],
  timetableItems: T[],
): T[] {
  const merged = [...templateItems];
  for (const timetableItem of timetableItems) {
    const timetableCode = normalizePlannerCourseCode(
      timetableItem.id ?? courseCodeFromRawId(timetableItem.raw_id),
    );
    const matchIndex = merged.findIndex((templateItem) => {
      const templateRawCode = normalizePlannerCourseCode(
        courseCodeFromRawId(templateItem.raw_id),
      );
      const timetableRawCode = normalizePlannerCourseCode(
        courseCodeFromRawId(timetableItem.raw_id),
      );
      if (templateRawCode && templateRawCode === timetableRawCode) {
        return true;
      }
      const templateCode = normalizePlannerCourseCode(
        templateItem.id ?? courseCodeFromRawId(templateItem.raw_id),
      );
      return Boolean(timetableCode && templateCode === timetableCode);
    });

    if (matchIndex < 0) {
      merged.push(timetableItem);
      continue;
    }

    const templateItem = merged[matchIndex]!;
    const mergedItem = { ...templateItem, ...timetableItem } as T & {
      uuid?: string;
      order?: number;
      dependson?: unknown[];
    };
    const original = templateItem as typeof mergedItem;
    if (original.uuid !== undefined) mergedItem.uuid = original.uuid;
    if (original.order !== undefined) mergedItem.order = original.order;
    if (original.dependson !== undefined)
      mergedItem.dependson = original.dependson;
    merged[matchIndex] = mergedItem;
  }
  return merged;
}
