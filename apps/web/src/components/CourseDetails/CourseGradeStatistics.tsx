import { Fragment } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@courseweb/ui";
import { InstructorLink } from "@/components/Courses/InstructorLink";
import {
  courseStatisticsKey,
  formatCourseStatistics,
  type CourseStatistic,
} from "./courseGradeStatisticsLogic";

export type CourseGradeStatisticsCopy = {
  title: string;
  semester: string;
  instructor: string;
  enrollment: string;
  average: string;
  standardDeviation: string;
  gpaScale: string;
  percentScale: string;
  contributed: string;
};

export type CourseGradeStatisticsResponse = {
  statistics: readonly CourseStatistic[];
};

type CourseGradeStatisticsProps = {
  lang: string;
  statistics?: readonly CourseStatistic[];
  error?: unknown;
  teacherByCourse: ReadonlyMap<string, readonly string[]>;
  copy: CourseGradeStatisticsCopy;
};

const CourseGradeStatistics = ({
  lang,
  statistics,
  error,
  teacherByCourse,
  copy,
}: CourseGradeStatisticsProps) => {
  if (error || !statistics) return null;

  const rows = formatCourseStatistics(statistics);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold" id="past-grade-statistics">
        {copy.title}
      </h3>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[76px] px-2">{copy.semester}</TableHead>
            <TableHead className="w-[100px] px-2">{copy.instructor}</TableHead>
            <TableHead className="w-[72px] px-2">{copy.enrollment}</TableHead>
            <TableHead className="w-[88px] px-2">{copy.average}</TableHead>
            <TableHead className="w-[88px] px-2">
              {copy.standardDeviation}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const teachers =
              teacherByCourse.get(
                courseStatisticsKey(row.semester, row.rawId),
              ) ?? [];
            const scaleLabel =
              row.scale === "gpa" ? copy.gpaScale : copy.percentScale;
            const formattedValues = [
              { key: "average", value: row.averageLabel },
              { key: "std-dev", value: row.stdDevLabel },
            ] as const;

            return (
              <TableRow key={`${row.semester}-${row.rawId}`}>
                <TableCell className="px-2">{row.semesterLabel}</TableCell>
                <TableCell className="px-2">
                  {teachers.map((teacher, index) => (
                    <Fragment key={`${teacher}-${index}`}>
                      {index > 0 ? "," : ""}
                      <InstructorLink lang={lang} name={teacher}>
                        {teacher}
                      </InstructorLink>
                    </Fragment>
                  ))}
                </TableCell>
                <TableCell className="px-2">{row.enrollment}</TableCell>
                {formattedValues.map(({ key, value }) => (
                  <TableCell key={key} className="px-2">
                    <div className="flex flex-col gap-1 text-xs">
                      <p>{value}</p>
                      <p className="text-muted-foreground">{scaleLabel}</p>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Link
        to={`/${lang}/contribute`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {copy.contributed}
      </Link>
    </div>
  );
};

export default CourseGradeStatistics;
