import { lastSemester } from "@courseweb/shared";

export const MAX_CCXP_COURSE_IDS = 60;
export const MAX_CCXP_QUERY_PARTS = 200;
export const MAX_CCXP_UNKNOWN_IDS = 20;

const SEMESTER_ID_PATTERN = /^\d{3}(?:10|20)$/;
const COURSE_ID_PATTERN = /^(\d{5})([a-z]{2,6})\s*(\d{6})$/i;

export type CcXpUnknownCourseId = {
  id: string;
  reason: "malformed" | "semester" | "unknown" | "limit";
};

export type DecodedCcXpImportQuery = {
  courseCodes: Record<string, string[]>;
  colorMap: Record<string, string>;
  initialSemester: string;
  unknownCourseIds: Record<string, CcXpUnknownCourseId[]>;
  unknownCourseIdOverflow: Record<string, number>;
};

export type TimetableImportDiff = {
  added: string[];
  alreadyPresent: string[];
  removed: string[];
};

export type CcXpImportRowStatus = "new" | "already" | "removed";

export type CcXpImportRow<TCourse extends { raw_id: string }> = {
  id: string;
  status: CcXpImportRowStatus;
  course: TCourse | null;
};

/** Converts the course number printed by CCXP into the NTHUMods shape. */
export const normalizeCcxpCourseId = (value: string): string | null => {
  const match = COURSE_ID_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, semester, department, course] = match;
  return `${semester}${department.toUpperCase()} ${course}`;
};

/**
 * CCXP and the course database do not always preserve the same padding
 * between a department and its six-digit course number. Query the common
 * representations, then normalize the returned raw_id before storing it.
 */
export const getCcXpCourseLookupIds = (normalizedId: string): string[] => {
  const match = COURSE_ID_PATTERN.exec(normalizedId);
  if (!match) return [];

  const [, semester, department, course] = match;
  const fixedWidth = `${semester}${department.toUpperCase()}${" ".repeat(
    Math.max(0, 4 - department.length),
  )}${course}`;
  const compact = `${semester}${department.toUpperCase()}${course}`;
  return [...new Set([normalizedId, fixedWidth, compact])];
};

const addUnknown = (
  unknownCourseIds: Record<string, CcXpUnknownCourseId[]>,
  unknownCourseIdOverflow: Record<string, number>,
  semester: string,
  item: CcXpUnknownCourseId,
) => {
  const current = unknownCourseIds[semester] ?? [];
  if (current.some((unknown) => unknown.id === item.id)) return;
  if (current.length >= MAX_CCXP_UNKNOWN_IDS) {
    unknownCourseIdOverflow[semester] =
      (unknownCourseIdOverflow[semester] ?? 0) + 1;
    return;
  }
  unknownCourseIds[semester] = [...current, item];
};

const addUnknownOverflow = (
  unknownCourseIdOverflow: Record<string, number>,
  semester: string,
) => {
  unknownCourseIdOverflow[semester] =
    (unknownCourseIdOverflow[semester] ?? 0) + 1;
};

export const decodeCcXpImportQuery = (
  searchParams: URLSearchParams,
): DecodedCcXpImportQuery | null => {
  const courseCodes: Record<string, string[]> = {};
  const unknownCourseIds: Record<string, CcXpUnknownCourseId[]> = {};
  const unknownCourseIdOverflow: Record<string, number> = {};
  const acceptedNormalizedIds = new Set<string>();
  let processedPartCount = 0;
  let acceptedCount = 0;
  let lastSerializedSemester: string | undefined;

  searchParams.forEach((value, key) => {
    if (!key.startsWith("semester_")) return;

    const semester = key.slice("semester_".length);
    if (!SEMESTER_ID_PATTERN.test(semester)) return;

    lastSerializedSemester = semester;
    const ids: string[] = [];
    const seenNormalized = new Set<string>();
    let partStart = 0;
    for (let index = 0; index <= value.length; index += 1) {
      if (index !== value.length && value[index] !== ",") continue;

      const rawId = value.slice(partStart, index).trim();
      partStart = index + 1;
      if (!rawId) continue;
      if (processedPartCount >= MAX_CCXP_QUERY_PARTS) {
        addUnknownOverflow(unknownCourseIdOverflow, semester);
        continue;
      }
      processedPartCount += 1;

      const normalized = normalizeCcxpCourseId(rawId);
      if (!normalized) {
        addUnknown(unknownCourseIds, unknownCourseIdOverflow, semester, {
          id: rawId,
          reason: "malformed",
        });
        continue;
      }
      if (seenNormalized.has(normalized)) continue;
      seenNormalized.add(normalized);
      if (normalized.slice(0, 5) !== semester) {
        addUnknown(unknownCourseIds, unknownCourseIdOverflow, semester, {
          id: rawId,
          reason: "semester",
        });
        continue;
      }
      if (acceptedNormalizedIds.has(normalized)) continue;

      if (acceptedCount >= MAX_CCXP_COURSE_IDS) {
        addUnknown(unknownCourseIds, unknownCourseIdOverflow, semester, {
          id: rawId,
          reason: "limit",
        });
        continue;
      }

      acceptedCount += 1;
      acceptedNormalizedIds.add(normalized);
      ids.push(normalized);
    }

    courseCodes[semester] = ids;
  });

  const initialSemester = courseCodes[lastSemester.id]
    ? lastSemester.id
    : lastSerializedSemester;
  if (!initialSemester) return null;

  return {
    courseCodes,
    colorMap: {},
    initialSemester,
    unknownCourseIds,
    unknownCourseIdOverflow,
  };
};

export const isCcXpImportReady = (input: {
  coursesLoading: boolean;
  hasCourseQueryError: boolean;
  importedCourseCount: number;
  timetableDataReady: boolean;
  customItemsDataReady: boolean;
}) =>
  !input.coursesLoading &&
  !input.hasCourseQueryError &&
  input.importedCourseCount > 0 &&
  input.timetableDataReady &&
  input.customItemsDataReady;

export const calculateTimetableImportDiff = (
  currentIds: readonly string[],
  incomingIds: readonly string[],
  mode: "merge" | "replace",
): TimetableImportDiff => {
  const current = [...new Set(currentIds)];
  const incoming = [...new Set(incomingIds)];
  const currentSet = new Set(current);
  const incomingSet = new Set(incoming);

  return {
    added: incoming.filter((id) => !currentSet.has(id)),
    alreadyPresent: incoming.filter((id) => currentSet.has(id)),
    removed:
      mode === "replace" ? current.filter((id) => !incomingSet.has(id)) : [],
  };
};

/** Orders every course involved in the import by the answer shown to the user. */
export const getCcXpImportRows = <TCourse extends { raw_id: string }>(
  currentIds: readonly string[],
  incomingIds: readonly string[],
  courses: readonly TCourse[],
): CcXpImportRow<TCourse>[] => {
  const courseByCanonicalId = new Map<string, TCourse>();
  courses.forEach((course) => {
    courseByCanonicalId.set(course.raw_id, course);
    courseByCanonicalId.set(
      normalizeCcxpCourseId(course.raw_id) ?? course.raw_id,
      course,
    );
  });

  const canonicalCurrentIds = new Set(
    currentIds.map((id) => normalizeCcxpCourseId(id) ?? id),
  );
  const seenIncomingIds = new Set<string>();
  const rows: CcXpImportRow<TCourse>[] = [];

  incomingIds.forEach((id) => {
    const canonicalId = normalizeCcxpCourseId(id) ?? id;
    if (seenIncomingIds.has(canonicalId)) return;
    seenIncomingIds.add(canonicalId);
    rows.push({
      id: courseByCanonicalId.get(canonicalId)?.raw_id ?? id,
      status: canonicalCurrentIds.has(canonicalId) ? "already" : "new",
      course: courseByCanonicalId.get(canonicalId) ?? null,
    });
  });

  currentIds.forEach((id) => {
    const canonicalId = normalizeCcxpCourseId(id) ?? id;
    if (seenIncomingIds.has(canonicalId)) return;
    seenIncomingIds.add(canonicalId);
    rows.push({
      id,
      status: "removed",
      course: courseByCanonicalId.get(canonicalId) ?? null,
    });
  });

  return rows.sort(
    (a, b) =>
      ["new", "already", "removed"].indexOf(a.status) -
      ["new", "already", "removed"].indexOf(b.status),
  );
};
