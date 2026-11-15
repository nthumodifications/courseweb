/**
 * Bundled semester dates are the offline fallback. The API refreshes these
 * dates from the academic calendar and annotates each row with course data.
 * Keep known dates here so the app and Worker still work before that refresh.
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

const bundledSemesters: SemesterInfo[] = [
  {
    id: "10810",
    year: 2019,
    semester: 1,
    begins: new Date(2019, 8, 9),
    ends: new Date(2020, 0, 12),
    hasCourses: true,
  },
  {
    id: "10820",
    year: 2019,
    semester: 2,
    begins: new Date(2020, 1, 17),
    ends: new Date(2020, 5, 21),
    hasCourses: true,
  },
  {
    id: "10910",
    year: 2020,
    semester: 1,
    begins: new Date(2020, 8, 14),
    ends: new Date(2021, 0, 29),
    hasCourses: true,
  },
  {
    id: "10920",
    year: 2020,
    semester: 2,
    begins: new Date(2021, 1, 22),
    ends: new Date(2021, 5, 25),
    hasCourses: true,
  },
  {
    id: "11010",
    year: 2021,
    semester: 1,
    begins: new Date(2021, 8, 13),
    ends: new Date(2022, 0, 14),
    hasCourses: true,
  },
  {
    id: "11020",
    year: 2021,
    semester: 2,
    begins: new Date(2022, 1, 14),
    ends: new Date(2022, 5, 17),
    hasCourses: true,
  },
  {
    id: "11110",
    year: 2022,
    semester: 1,
    begins: new Date(2022, 8, 12),
    ends: new Date(2023, 0, 13),
    hasCourses: true,
  },
  {
    id: "11120",
    year: 2022,
    semester: 2,
    begins: new Date(2023, 1, 13),
    ends: new Date(2023, 5, 16),
    hasCourses: true,
  },
  {
    id: "11210",
    year: 2023,
    semester: 1,
    begins: new Date(2023, 8, 11),
    ends: new Date(2024, 0, 12),
    hasCourses: true,
  },
  {
    id: "11220",
    year: 2023,
    semester: 2,
    begins: new Date(2024, 1, 19),
    ends: new Date(2024, 5, 23),
    hasCourses: true,
  },
  {
    id: "11310",
    year: 2024,
    semester: 1,
    begins: new Date(2024, 8, 2),
    ends: new Date(2024, 11, 22),
    hasCourses: true,
  },
  {
    id: "11320",
    year: 2024,
    semester: 2,
    begins: new Date(2025, 1, 17),
    ends: new Date(2025, 5, 8),
    hasCourses: true,
  },
  {
    id: "11410",
    year: 2025,
    semester: 1,
    begins: new Date(2025, 8, 1),
    ends: new Date(2025, 11, 21),
    hasCourses: true,
  },
  {
    id: "11420",
    year: 2025,
    semester: 2,
    begins: new Date(2026, 1, 23),
    ends: new Date(2026, 5, 14),
    hasCourses: true,
  },
  {
    id: "11510",
    year: 2026,
    semester: 1,
    begins: new Date(2026, 8, 7),
    ends: new Date(2026, 11, 27),
    hasCourses: true,
  },
  // The next date is known from the 115 academic calendar. The API can
  // replace it if the official calendar changes and reports course presence.
  {
    id: "11520",
    year: 2026,
    semester: 2,
    begins: new Date(2027, 1, 15),
    ends: new Date(2027, 5, 6),
    hasCourses: false,
  },
];

export let semesterInfo: SemesterInfo[] = [...bundledSemesters];

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
  const id = typeof row.id === "string" ? row.id : "";
  if (!/^\d{3}(10|20|30)$/.test(id)) return undefined;
  const begins = dateFromValue(row.begins);
  const ends = dateFromValue(row.ends);
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
  const maxDuration = 180;
  if (!plausibleMonths || duration < minDuration || duration > maxDuration) {
    return undefined;
  }
  return {
    id,
    year,
    semester,
    begins,
    ends,
    hasCourses: row.hasCourses === true,
    estimated: row.estimated === true,
  };
};

/** Merge an API snapshot over the fallback while keeping past fallback dates authoritative. */
export const mergeSemesterRows = (
  rows: readonly unknown[],
  now = new Date(),
): SemesterInfo[] => {
  const merged = new Map(bundledSemesters.map((row) => [row.id, row]));
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

const sameSemesterRows = (
  left: readonly SemesterInfo[],
  right: readonly SemesterInfo[],
) =>
  left.length === right.length &&
  left.every((row, index) => {
    const other = right[index];
    return (
      row.id === other?.id &&
      row.begins.getTime() === other.begins.getTime() &&
      row.ends.getTime() === other.ends.getTime() &&
      row.hasCourses === other.hasCourses &&
      row.estimated === other.estimated
    );
  });

let semesterRevision = 0;
const semesterListeners = new Set<() => void>();

/** Update the live semester bindings from the API or a cached API response. */
export const hydrateSemesters = (rows: readonly unknown[]): boolean => {
  const next = mergeSemesterRows(rows);
  if (sameSemesterRows(semesterInfo, next)) return false;
  semesterInfo = next;
  currentSemester = getSemester(new Date());
  lastSemester = getLastSemester(semesterInfo);
  semesterRevision += 1;
  semesterListeners.forEach((listener) => listener());
  return true;
};

export const getSemesterRevision = () => semesterRevision;

export const subscribeSemesters = (listener: () => void) => {
  semesterListeners.add(listener);
  return () => {
    semesterListeners.delete(listener);
  };
};

export const getSemester = (
  date: Date,
  semesters: readonly SemesterInfo[] = semesterInfo,
) =>
  semesters.find(
    (semester) => date >= semester.begins && date <= semester.ends,
  );

export const getLastSemester = (
  semesters: readonly SemesterInfo[] = semesterInfo,
) =>
  [...semesters].reverse().find((semester) => semester.hasCourses) ??
  semesters[0]!;

/**
 * Pick the default date/course semester. Within a semester it stays selected;
 * after its end it advances to the next semester with course data, even during
 * the break before classes begin. Before the first known semester it picks the
 * earliest semester with course data.
 */
export const getDefaultSemester = (
  date = new Date(),
  semesters: readonly SemesterInfo[] = semesterInfo,
) => {
  const academicSemesters = semesters.filter((semester) =>
    /(?:10|20)$/.test(semester.id),
  );
  const current = getSemester(date, academicSemesters);
  if (current) return current;
  const withCourses = academicSemesters.filter(
    (semester) => semester.hasCourses,
  );
  const firstFuture = withCourses.find((semester) => semester.begins > date);
  if (!academicSemesters.some((semester) => semester.begins <= date)) {
    return (
      firstFuture ?? withCourses[0] ?? academicSemesters[0] ?? semesters[0]!
    );
  }
  return (
    firstFuture ??
    [...withCourses].reverse().find((semester) => semester.ends < date) ??
    withCourses.at(-1) ??
    academicSemesters[0] ??
    semesters[0]!
  );
};

/** Return the next course-bearing semester while the current one is active. */
export const getNextCourseSemester = (
  date = new Date(),
  semesters: readonly SemesterInfo[] = semesterInfo,
) => {
  const academicSemesters = semesters.filter((semester) =>
    /(?:10|20)$/.test(semester.id),
  );
  const current = getSemester(date, academicSemesters);
  if (!current) return undefined;
  return academicSemesters.find(
    (semester) => semester.id > current.id && semester.hasCourses,
  );
};

export let currentSemester = getSemester(new Date());
export let lastSemester = getLastSemester(semesterInfo);
