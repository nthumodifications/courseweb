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
  status?: string | null;
};

/** Dedupe timetable rows, then omit courses with a non-failed planner copy. */
export function mergeTimetableCourses<T extends CourseIdentity>(
  incoming: T[],
  existing: CourseIdentity[],
): T[] {
  const existingActiveCourses = existing.filter(
    (course) => course.status !== "failed",
  );
  const existingRawIds = new Set(
    existingActiveCourses.map((course) => course.raw_id).filter(Boolean),
  );
  const existingCodes = new Set(
    existingActiveCourses
      .map((course) =>
        normalizePlannerCourseCode(
          course.id || courseCodeFromRawId(course.raw_id),
        ),
      )
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

type CourseAudience = Pick<CourseDefinition, "compulsory_for" | "elective_for">;

type DepartmentTagEntry = { prefix: string; year?: string };

function parseDepartmentTagEntry(entry: string): DepartmentTagEntry {
  const match = entry.match(/^(.+?)(\d{3})([A-Z]*)$/);
  return match ? { prefix: match[1]!, year: match[2]! } : { prefix: entry };
}

/**
 * Infer the department abbreviation used by course audience tags. Prefer the
 * student's cohort, then fall back to the most common tag across all cohorts.
 */
export function detectDepartmentTag(
  courses: CourseAudience[],
  enrollmentYear: string | number,
): string | undefined {
  const allCompulsory = courses.flatMap((course) =>
    (course.compulsory_for ?? []).map((entry) => ({
      entry,
      parsed: parseDepartmentTagEntry(entry),
    })),
  );
  const matchingYear = String(enrollmentYear).padStart(3, "0");
  const cohortEntries = allCompulsory.filter(
    ({ parsed }) => parsed.year === matchingYear,
  );
  const candidates = cohortEntries.length ? cohortEntries : allCompulsory;
  const counts = new Map<string, number>();
  for (const { parsed } of candidates) {
    // Only audience tags carrying a ROC year are useful for inferring a tag.
    if (!parsed.year) continue;
    counts.set(parsed.prefix, (counts.get(parsed.prefix) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;

  const highestCount = Math.max(...counts.values());
  const mostFrequent = [...counts.entries()]
    .filter(([, count]) => count === highestCount)
    .map(([prefix]) => prefix);
  if (mostFrequent.length === 1) return mostFrequent[0];

  const electivePrefixes = new Set(
    courses.flatMap((course) =>
      (course.elective_for ?? [])
        .map((entry) => parseDepartmentTagEntry(entry))
        .map((entry) => entry.prefix),
    ),
  );
  const tieBreak = mostFrequent.filter((prefix) =>
    electivePrefixes.has(prefix),
  );
  return tieBreak.length === 1 ? tieBreak[0] : undefined;
}

/** Conservatively map only known metadata to a category that actually exists. */
export function guessCourseCategory(
  course: Pick<CourseDefinition, "ge_type" | "compulsory_for" | "elective_for">,
  department: string,
  folders: Pick<FolderDocType, "id" | "title">[],
  enrollmentYear: string | number,
  detectedTag?: string,
): string {
  const matchingDepartmentEntries = (entries: string[] | null) =>
    (entries ?? []).filter((entry) => {
      const { prefix } = parseDepartmentTagEntry(entry);
      return Boolean(
        (detectedTag && prefix === detectedTag) ||
          (department && prefix === department),
      );
    });
  let key: SetupCategoryKey | undefined;
  if (course.ge_type) key = "setup-general-education";
  else {
    const matchingCompulsory = matchingDepartmentEntries(course.compulsory_for);
    const year = String(enrollmentYear).padStart(3, "0");
    const currentOrUnspecifiedCohort = matchingCompulsory.some((entry) => {
      const parsed = parseDepartmentTagEntry(entry);
      return !parsed.year || parsed.year === year;
    });
    const otherCohortCompulsory = matchingCompulsory.some((entry) => {
      const parsed = parseDepartmentTagEntry(entry);
      return Boolean(parsed.year && parsed.year !== year);
    });

    if (currentOrUnspecifiedCohort) key = "setup-major-required";
    else if (otherCohortCompulsory) return "_unsorted";
    else if (matchingDepartmentEntries(course.elective_for).length) {
      key = "setup-major-elective";
    }
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
