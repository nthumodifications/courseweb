import { lastSemester } from "@courseweb/shared";

export const MAX_TIMETABLE_SHARE_QUERY_LENGTH = 100_000;

export type DecodedTimetableShareQuery = {
  courseCodes: Record<string, string[]>;
  colorMap: Record<string, string>;
  initialSemester: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const decodeLegacyCourseId = (value: string) => {
  try {
    return decodeURI(value);
  } catch {
    return null;
  }
};

const parseColorMap = (value: string | null): Record<string, string> => {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(
          ([courseId, color]) =>
            courseId.length > 0 && typeof color === "string",
        )
        .map(([courseId, color]) => [courseId, color as string]),
    );
  } catch {
    return {};
  }
};

/** Decode both current and pre-URLSearchParams timetable share links safely. */
export const decodeTimetableShareQuery = (
  searchParams: URLSearchParams,
): DecodedTimetableShareQuery | null => {
  if (searchParams.toString().length > MAX_TIMETABLE_SHARE_QUERY_LENGTH) {
    return null;
  }

  const courseCodes: Record<string, string[]> = {};
  let lastSerializedSemester: string | undefined;
  searchParams.forEach((value, key) => {
    if (!key.startsWith("semester_")) return;
    const semester = key.slice("semester_".length);
    if (!semester) return;
    const ids = value.split(",").filter(Boolean).map(decodeLegacyCourseId);
    if (ids.includes(null)) return;
    courseCodes[semester] = ids as string[];
    lastSerializedSemester = semester;
  });

  const initialSemester = courseCodes[lastSemester.id]
    ? lastSemester.id
    : lastSerializedSemester;
  if (!initialSemester) return null;

  return {
    courseCodes,
    colorMap: parseColorMap(searchParams.get("colorMap")),
    initialSemester,
  };
};
