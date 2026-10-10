import { toPrettySemester } from "@/helpers/semester";

export type CourseStatistic = {
  rawId: string;
  courseCode: string;
  semester: string;
  enrollment: number;
  scale: "gpa" | "percent";
  average: number;
  stdDev: number;
};

export type FormattedCourseStatistic = CourseStatistic & {
  semesterLabel: string;
  averageLabel: string;
  stdDevLabel: string;
};

const isCourseStatistic = (row: CourseStatistic) =>
  row.semester.trim().length > 0 &&
  Number.isSafeInteger(row.enrollment) &&
  row.enrollment >= 0 &&
  Number.isFinite(row.average) &&
  Number.isFinite(row.stdDev) &&
  row.stdDev >= 0 &&
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
      stdDevLabel: statistic.stdDev.toFixed(2),
    }));
