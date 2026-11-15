/**
 * Worker-local semester data and merge logic. The package export points at
 * packages/shared/dist, which is not built in the direct Wrangler deploy job.
 * Keep the bundled rows aligned with packages/shared via timetable-ics.test.ts.
 */
export type SemesterInfo = {
  id: string;
  year: number;
  semester: number;
  begins: Date;
  ends: Date;
  hasCourses: boolean;
  estimated?: boolean;
};

type BundledSemesterRow = readonly [
  id: string,
  begins: string,
  ends: string,
  hasCourses?: boolean,
];

const parseBundledDate = (value: string) =>
  new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );

const parseBundledSemester = ([
  id,
  begins,
  ends,
  hasCourses = true,
]: BundledSemesterRow): SemesterInfo => ({
  id,
  year: Number(id.slice(0, 3)) + 1911,
  semester: Number(id.slice(3, 4)),
  begins: parseBundledDate(begins),
  ends: parseBundledDate(ends),
  hasCourses,
});

const bundledSemesterRows: BundledSemesterRow[] = [
  ["10810", "2019-09-09", "2020-01-12"],
  ["10820", "2020-02-17", "2020-06-21"],
  ["10910", "2020-09-14", "2021-01-29"],
  ["10920", "2021-02-22", "2021-06-25"],
  ["11010", "2021-09-13", "2022-01-14"],
  ["11020", "2022-02-14", "2022-06-17"],
  ["11110", "2022-09-12", "2023-01-13"],
  ["11120", "2023-02-13", "2023-06-16"],
  ["11210", "2023-09-11", "2024-01-12"],
  ["11220", "2024-02-19", "2024-06-23"],
  ["11310", "2024-09-02", "2024-12-22"],
  ["11320", "2025-02-17", "2025-06-08"],
  ["11410", "2025-09-01", "2025-12-21"],
  ["11420", "2026-02-23", "2026-06-14"],
  ["11510", "2026-09-07", "2026-12-27"],
  ["11520", "2027-02-15", "2027-06-06", false],
];

const bundledSemesterInfo = bundledSemesterRows.map(parseBundledSemester);

export const semesterInfo: SemesterInfo[] = [...bundledSemesterInfo];

const dayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dateFromValue = (value: unknown): Date | undefined => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month! - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
};

const parseSemesterRow = (value: unknown): SemesterInfo | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const id = typeof row["id"] === "string" ? row["id"] : "";
  if (!/^\d{3}(10|20|30)$/.test(id)) return undefined;
  const begins = dateFromValue(row["begins"]);
  const ends = dateFromValue(row["ends"]);
  if (!begins || !ends || begins > ends) return undefined;
  const year = Number(id.slice(0, 3)) + 1911;
  const semester = Number(id.slice(3, 4));
  const startMonth = begins.getMonth() + 1;
  const endMonth = ends.getMonth() + 1;
  const duration =
    (Date.UTC(ends.getFullYear(), ends.getMonth(), ends.getDate()) -
      Date.UTC(begins.getFullYear(), begins.getMonth(), begins.getDate())) /
      86_400_000 +
    1;
  const plausibleMonths =
    (semester === 1 &&
      startMonth >= 8 &&
      startMonth <= 10 &&
      (endMonth >= 11 || endMonth === 1)) ||
    (semester === 2 &&
      startMonth >= 1 &&
      startMonth <= 4 &&
      endMonth >= 5 &&
      endMonth <= 8) ||
    (semester === 3 &&
      startMonth >= 5 &&
      startMonth <= 8 &&
      endMonth >= 6 &&
      endMonth <= 10);
  const minDuration = semester === 3 ? 14 : 70;
  if (!plausibleMonths || duration < minDuration || duration > 180) {
    return undefined;
  }
  return {
    id,
    year,
    semester,
    begins,
    ends,
    hasCourses: row["hasCourses"] === true,
    estimated: row["estimated"] === true,
  };
};

/** Merge an API snapshot while keeping dates for past bundled rows authoritative. */
export const mergeSemesterRows = (
  rows: readonly unknown[],
  now = new Date(),
): SemesterInfo[] => {
  const merged = new Map(bundledSemesterInfo.map((row) => [row.id, row]));
  const today = dayStart(now);
  for (const value of rows) {
    const row = parseSemesterRow(value);
    if (!row) continue;
    const bundled = merged.get(row.id);
    if (bundled && bundled.ends < today) {
      merged.set(row.id, { ...bundled, hasCourses: row.hasCourses });
    } else {
      const overlaps = [...merged.values()].some(
        (neighbor) =>
          neighbor.id !== row.id &&
          row.begins <= neighbor.ends &&
          neighbor.begins <= row.ends,
      );
      if (overlaps) continue;
      merged.set(row.id, row);
    }
  }
  return [...merged.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
};
