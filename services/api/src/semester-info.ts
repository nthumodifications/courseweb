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

const bundledSemesterInfo: SemesterInfo[] = `
10810|2019|1|2019-09-09|2020-01-12|true
10820|2019|2|2020-02-17|2020-06-21|true
10910|2020|1|2020-09-14|2021-01-29|true
10920|2020|2|2021-02-22|2021-06-25|true
11010|2021|1|2021-09-13|2022-01-14|true
11020|2021|2|2022-02-14|2022-06-17|true
11110|2022|1|2022-09-12|2023-01-13|true
11120|2022|2|2023-02-13|2023-06-16|true
11210|2023|1|2023-09-11|2024-01-12|true
11220|2023|2|2024-02-19|2024-06-23|true
11310|2024|1|2024-09-02|2024-12-22|true
11320|2024|2|2025-02-17|2025-06-08|true
11410|2025|1|2025-09-01|2025-12-21|true
11420|2025|2|2026-02-23|2026-06-14|true
11510|2026|1|2026-09-07|2026-12-27|true
11520|2026|2|2027-02-15|2027-06-06|false
`
  .trim()
  .split("\n")
  .map((line) => {
    const [id, year, semester, begins, ends, hasCourses] = line.split("|");
    return {
      id: id!,
      year: Number(year),
      semester: Number(semester),
      begins: new Date(`${begins}T00:00:00`),
      ends: new Date(`${ends}T00:00:00`),
      hasCourses: hasCourses === "true",
    };
  });

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
