import type { SyncResult } from "./types";

export type AutoSyncSemester = {
  id: string;
  begins: string;
  ends: string;
  hasCourses?: boolean;
};

export type SyncSemester = (
  semester: string,
  options?: { skipIfEmpty?: boolean },
) => Promise<SyncResult>;

const taipeiDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
};

export const nextSemesterId = (semester: string): string | undefined => {
  const match = /^(\d{3})(10|20|30)$/.exec(semester);
  if (!match) return undefined;
  if (match[2] === "10") return `${match[1]}20`;
  if (match[2] === "20") return `${match[1]}30`;
  return `${String(Number(match[1]) + 1).padStart(3, "0")}10`;
};

const fallbackCurrentId = (dateKey: string) => {
  const [gregorianYear, month] = dateKey.split("-").map(Number);
  const rocYear = gregorianYear! - 1911;
  if (month! >= 9) return `${rocYear}10`;
  if (month === 1) return `${rocYear - 1}10`;
  return `${rocYear - 1}20`;
};

export const chooseSemestersToSync = (
  now: Date,
  semesters: readonly AutoSyncSemester[],
): string[] => {
  const date = taipeiDateKey(now);
  const ordered = [...semesters].sort((left, right) =>
    left.begins.localeCompare(right.begins),
  );
  const current =
    ordered.find(
      (semester) => semester.begins <= date && semester.ends >= date,
    ) ??
    [...ordered].reverse().find((semester) => semester.begins <= date) ??
    ordered[0];
  const currentId = current?.id ?? fallbackCurrentId(date);
  const next = nextSemesterId(currentId);
  const afterNext = next ? nextSemesterId(next) : undefined;
  const sequentialCandidates = [next, afterNext].filter(
    (id): id is string => id !== undefined && id !== currentId,
  );
  const datedCandidates = ordered
    .filter((semester) => semester.id > currentId && semester.begins > date)
    .map((semester) => semester.id);
  const upcoming = [
    ...new Set([...sequentialCandidates, ...datedCandidates]),
  ].slice(0, 3);
  return [currentId, ...upcoming];
};

export const fetchAutoSyncSemesters = async (
  fetcher: typeof fetch = fetch,
  apiUrl = process.env.COURSEWEB_API_URL ?? "https://api.nthumods.com",
): Promise<AutoSyncSemester[]> => {
  const response = await fetcher(`${apiUrl.replace(/\/$/, "")}/semesters`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Semester API returned HTTP ${response.status}`);
  const value: unknown = await response.json();
  if (!Array.isArray(value))
    throw new Error("Semester API response was not a list");
  return value.flatMap((row): AutoSyncSemester[] => {
    if (!row || typeof row !== "object") return [];
    const semester = row as Record<string, unknown>;
    if (
      typeof semester.id !== "string" ||
      !/^\d{3}(10|20|30)$/.test(semester.id) ||
      typeof semester.begins !== "string" ||
      typeof semester.ends !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(semester.begins) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(semester.ends) ||
      semester.begins > semester.ends
    ) {
      return [];
    }
    return [
      {
        id: semester.id,
        begins: semester.begins,
        ends: semester.ends,
        hasCourses: semester.hasCourses === true,
      },
    ];
  });
};

export const runAutoSync = async (options: {
  now?: Date;
  semesters?: readonly AutoSyncSemester[];
  fetcher?: typeof fetch;
  apiUrl?: string;
  syncSemester: SyncSemester;
}): Promise<SyncResult & { semesters?: string[] }> => {
  const now = options.now ?? new Date();
  let semesters = options.semesters;
  if (!semesters) {
    try {
      semesters = await fetchAutoSyncSemesters(options.fetcher, options.apiUrl);
    } catch (error) {
      console.warn(
        "Semester API unavailable; selecting by Taipei calendar date",
        error,
      );
      semesters = [];
    }
  }

  const semesterIds = chooseSemestersToSync(now, semesters);
  const stats: NonNullable<SyncResult["stats"]> = {
    coursesScraped: 0,
    syllabusDownloaded: 0,
    algoliaRecordsUpdated: 0,
  };
  const attemptedSemesters: string[] = [];
  for (const [index, semester] of semesterIds.entries()) {
    attemptedSemesters.push(semester);
    const result = await options.syncSemester(semester, {
      skipIfEmpty: index > 0,
    });
    if (!result.success) return { ...result, semesters: attemptedSemesters };
    stats.coursesScraped! += result.stats?.coursesScraped ?? 0;
    stats.syllabusDownloaded! += result.stats?.syllabusDownloaded ?? 0;
    stats.algoliaRecordsUpdated! += result.stats?.algoliaRecordsUpdated ?? 0;
    // Upcoming terms are checked in order. Once the first published term has
    // been fully synchronized, defer later terms to the next scheduled run.
    if (index > 0 && !result.skipped) break;
  }
  return { success: true, stats, semesters: attemptedSemesters };
};
