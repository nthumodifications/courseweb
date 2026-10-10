import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { describe, expect, test } from "bun:test";
import CourseGradeStatistics, {
  type CourseGradeStatisticsCopy,
} from "./CourseGradeStatistics";
import {
  formatCourseStatistics,
  type CourseStatistic,
} from "./courseGradeStatisticsLogic";

const statistic = (values: Partial<CourseStatistic> = {}): CourseStatistic => ({
  rawId: "11510EECS205000",
  courseCode: "EECS205000",
  semester: "11510",
  enrollment: 10,
  scale: "gpa",
  average: 3.4,
  stdDev: 0.66,
  ...values,
});

test.each([
  {
    name: "sorts semesters newest first and formats both scales",
    input: [
      statistic({
        rawId: "11430CSR 100100",
        courseCode: "CSR100100",
        semester: "11430",
        scale: "percent",
        average: 85.59,
        stdDev: 12.81,
      }),
      statistic({
        rawId: "11510EECS205000",
        semester: "11510",
        average: 3.4,
      }),
      statistic({
        rawId: "11420EECS205000",
        semester: "11420",
        average: 3,
        stdDev: 1,
      }),
    ],
    expected: [
      {
        semesterLabel: "115-1",
        averageLabel: "3.40",
        stdDevLabel: "0.66",
        scale: "gpa",
      },
      {
        semesterLabel: "114-3",
        averageLabel: "85.59",
        stdDevLabel: "12.81",
        scale: "percent",
      },
      {
        semesterLabel: "114-2",
        averageLabel: "3.00",
        stdDevLabel: "1.00",
        scale: "gpa",
      },
    ],
  },
  {
    name: "keeps zero values and drops malformed rows",
    input: [
      statistic({
        semester: "11520",
        enrollment: 0,
        average: 0,
        stdDev: 0,
      }),
      statistic({ semester: "", average: Number.NaN }),
    ],
    expected: [
      {
        semesterLabel: "115-2",
        averageLabel: "0.00",
        stdDevLabel: "0.00",
        scale: "gpa",
      },
    ],
  },
] as const)("$name", ({ input, expected }) => {
  expect(
    formatCourseStatistics(input).map(
      ({ semesterLabel, averageLabel, stdDevLabel, scale }) => ({
        semesterLabel,
        averageLabel,
        stdDevLabel,
        scale,
      }),
    ),
  ).toEqual(expected);
});

const copy: CourseGradeStatisticsCopy = {
  title: "Past Grade Statistics",
  semester: "Semester",
  instructor: "Instructor",
  enrollment: "Enrollment",
  average: "Average",
  standardDeviation: "Std. Deviation",
  gpaScale: "GPA / 4.3",
  percentScale: "Percentage",
  contributed: "Data contributed by students through the school system.",
};

test.each([
  { name: "empty data", statistics: [] as CourseStatistic[], error: undefined },
  { name: "failed request", statistics: undefined, error: new Error("failed") },
])("renders nothing for $name", ({ statistics, error }) => {
  const markup = renderToStaticMarkup(
    <StaticRouter location="/en/courses/EECS205000">
      <CourseGradeStatistics
        lang="en"
        statistics={statistics}
        error={error}
        teacherBySemester={new Map()}
        copy={copy}
      />
    </StaticRouter>,
  );

  expect(markup).toBe("");
});
