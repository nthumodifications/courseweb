import { toPrettySemester } from "@/helpers/semester";
import {
  summarizeCourseStatistics,
  type CourseStatistic,
} from "./courseGradeStatisticsLogic";

export type CourseOverallGradeSummaryCopy = {
  title: string;
  average: string;
  enrollmentSummary: string;
  trendUp: string;
  trendDown: string;
  trendFlat: string;
  gpaScale: string;
  percentScale: string;
  source: string;
};

type CourseOverallGradeSummaryProps = {
  statistics?: readonly CourseStatistic[];
  error?: unknown;
  copy: CourseOverallGradeSummaryCopy;
};

export const hasCourseOverallGradeSummary = (
  statistics: readonly CourseStatistic[] | undefined,
  error?: unknown,
) =>
  Boolean(!error && statistics && summarizeCourseStatistics(statistics).length);

const replaceSummaryValues = (
  template: string,
  values: { count: number; semesters: number },
) =>
  template
    .replace("{count}", String(values.count))
    .replace("{semesters}", String(values.semesters));

const formatTrend = (
  trend: NonNullable<
    ReturnType<typeof summarizeCourseStatistics>[number]["trend"]
  >,
  copy: CourseOverallGradeSummaryCopy,
) => {
  const semester = toPrettySemester(trend.fromSemester);
  const difference = Math.abs(trend.difference).toFixed(2);
  const template =
    trend.difference > 0
      ? copy.trendUp
      : trend.difference < 0
        ? copy.trendDown
        : copy.trendFlat;

  return template
    .replace("{difference}", difference)
    .replace("{semester}", semester);
};

const CourseOverallGradeSummary = ({
  statistics,
  error,
  copy,
}: CourseOverallGradeSummaryProps) => {
  if (error || !statistics) return null;

  const summaries = summarizeCourseStatistics(statistics);
  if (summaries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" id="overall-grade-summary">
      <h3 className="font-bold">{copy.title}</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {summaries.map((summary) => {
          const scaleLabel =
            summary.scale === "gpa" ? copy.gpaScale : copy.percentScale;
          const trendLabel = summary.trend
            ? formatTrend(summary.trend, copy)
            : null;

          return (
            <div key={summary.scale} className="flex flex-col gap-1">
              <p className="text-sm">
                <span className="font-bold">{scaleLabel}:</span> {copy.average}{" "}
                {summary.average.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {replaceSummaryValues(copy.enrollmentSummary, {
                  count: summary.enrollment,
                  semesters: summary.semesterCount,
                })}
              </p>
              {trendLabel && (
                <p className="text-xs text-muted-foreground">{trendLabel}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{copy.source}</p>
    </div>
  );
};

export default CourseOverallGradeSummary;
