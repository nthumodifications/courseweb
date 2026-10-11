import { toPrettySemester } from "@/helpers/semester";

export type CourseStatistic = {
  rawId: string;
  courseCode: string;
  semester: string;
  enrollment: number;
  scale: "gpa" | "percent";
  average: number;
  stdDev: number | null;
};

export type CourseStatisticSummary = {
  scale: CourseStatistic["scale"];
  average: number;
  enrollment: number;
  semesterCount: number;
  trend: {
    difference: number;
    fromSemester: string;
    toSemester: string;
  } | null;
};

export type FormattedCourseStatistic = CourseStatistic & {
  semesterLabel: string;
  averageLabel: string;
  stdDevLabel: string | null;
};

export const normalizeCourseCode = (value: string) =>
  value.normalize("NFKC").replace(/\s+/g, "").toUpperCase();

export const courseCodeFromRawId = (rawId: string) =>
  normalizeCourseCode(rawId.slice(5));

const normalizeRawCourseId = (rawId: string) =>
  rawId.normalize("NFKC").replace(/\s+/g, "").toUpperCase();

export const courseStatisticsKey = (semester: string, rawId: string) =>
  `${semester}:${normalizeRawCourseId(rawId)}`;

const isCourseStatistic = (row: CourseStatistic) =>
  row.semester.trim().length > 0 &&
  Number.isSafeInteger(row.enrollment) &&
  row.enrollment >= 0 &&
  Number.isFinite(row.average) &&
  (row.stdDev === null || (Number.isFinite(row.stdDev) && row.stdDev >= 0)) &&
  (row.scale === "gpa" || row.scale === "percent");

export const formatCourseStatistics = (
  statistics: readonly CourseStatistic[],
): FormattedCourseStatistic[] =>
  statistics
    .filter(isCourseStatistic)
    .toSorted(
      (left, right) =>
        right.semester.localeCompare(left.semester, undefined, {
          numeric: true,
        }) || left.rawId.localeCompare(right.rawId),
    )
    .map((statistic) => ({
      ...statistic,
      semesterLabel: toPrettySemester(statistic.semester),
      averageLabel: statistic.average.toFixed(2),
      stdDevLabel:
        statistic.stdDev === null ? null : statistic.stdDev.toFixed(2),
    }));

const statisticScales: CourseStatistic["scale"][] = ["gpa", "percent"];

export const summarizeCourseStatistics = (
  statistics: readonly CourseStatistic[],
): CourseStatisticSummary[] =>
  statisticScales.flatMap((scale) => {
    const rows = statistics.filter(
      (row) =>
        isCourseStatistic(row) && row.scale === scale && row.enrollment > 0,
    );
    if (rows.length === 0) return [];

    const enrollment = rows.reduce((total, row) => total + row.enrollment, 0);
    if (enrollment === 0) return [];

    const average =
      rows.reduce((total, row) => total + row.average * row.enrollment, 0) /
      enrollment;
    const semesterTotals = new Map<
      string,
      { enrollment: number; weightedTotal: number }
    >();

    for (const row of rows) {
      const semester = semesterTotals.get(row.semester) ?? {
        enrollment: 0,
        weightedTotal: 0,
      };
      semester.enrollment += row.enrollment;
      semester.weightedTotal += row.average * row.enrollment;
      semesterTotals.set(row.semester, semester);
    }

    const semesters = [...semesterTotals.entries()]
      .map(([semester, values]) => ({
        semester,
        average: values.weightedTotal / values.enrollment,
      }))
      .toSorted((left, right) =>
        left.semester.localeCompare(right.semester, undefined, {
          numeric: true,
        }),
      );
    const latest = semesters.at(-1)!;
    const previous = semesters.at(-2);

    return [
      {
        scale,
        average,
        enrollment,
        semesterCount: semesters.length,
        trend: previous
          ? {
              difference: latest.average - previous.average,
              fromSemester: previous.semester,
              toSemester: latest.semester,
            }
          : null,
      },
    ];
  });
