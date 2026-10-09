import { formatInTimeZone } from "date-fns-tz";
import { Badge, cn } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import { fromTaipeiDateKey, TAIPEI_TIME_ZONE } from "@/helpers/dates";
import { useSettings } from "@/hooks/contexts/settings";
import {
  daysUntilCourseSelection,
  type CourseSelectionPeriod,
} from "@/lib/course-selection-periods";
import {
  getCourseSelectionPhaseStatus,
  sortCourseSelectionPeriods,
} from "@/lib/course-selection-schedule";
import { toPrettySemester } from "@/helpers/semester";

const formatPeriodDate = (
  date: string,
  language: "en" | "zh",
  withWeekday: boolean,
) =>
  formatInTimeZone(
    fromTaipeiDateKey(date),
    TAIPEI_TIME_ZONE,
    withWeekday ? (language === "zh" ? "M月d日 (EEE)" : "MMM d (EEE)") : "M/d",
    { locale: getLocale(language) },
  );

export const formatCourseSelectionDateRange = (
  period: CourseSelectionPeriod,
  language: "en" | "zh",
  withWeekday = true,
) => {
  const start = formatPeriodDate(period.startDate, language, withWeekday);
  const end = formatPeriodDate(period.endDate, language, withWeekday);
  return start === end ? start : `${start}–${end}`;
};

export const formatCourseSelectionCompactDate = (
  date: string,
  language: "en" | "zh",
) => formatPeriodDate(date, language, false);

export const getCourseSelectionScheduleTitle = (
  semester: string,
  template: string,
) => template.replace("{semester}", toPrettySemester(semester));

type CourseSelectionScheduleRowsProps = {
  periods: CourseSelectionPeriod[];
  nowDateKey: string;
  isLoading?: boolean;
  compact?: boolean;
};

export const CourseSelectionScheduleRows = ({
  periods,
  nowDateKey,
  isLoading = false,
  compact = false,
}: CourseSelectionScheduleRowsProps) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const sortedPeriods = sortCourseSelectionPeriods(periods);
  const nextPeriod = sortedPeriods.find(
    (period) =>
      getCourseSelectionPhaseStatus(period, nowDateKey) === "upcoming",
  );

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {isLoading && (
        <div className="px-4 py-4 text-sm text-muted-foreground">
          {dict.common.loading}
        </div>
      )}
      {!isLoading && sortedPeriods.length === 0 && (
        <div className="px-4 py-4 text-sm text-muted-foreground">
          {dict.course.selection_period.no_data}
        </div>
      )}
      {!isLoading &&
        sortedPeriods.map((period) => {
          const status = getCourseSelectionPhaseStatus(period, nowDateKey);
          const isNext = nextPeriod?.id === period.id;
          const statusLabel = isNext
            ? dict.course.selection_period.starts_in_days.replace(
                "{days}",
                String(daysUntilCourseSelection(period.startDate, nowDateKey)),
              )
            : null;

          return (
            <div
              className={cn(
                "flex min-w-0 flex-col gap-1 px-4",
                compact ? "py-2" : "py-3",
                status === "finished" && "text-muted-foreground",
                "sm:flex-row sm:items-center sm:gap-4",
              )}
              key={period.id}
            >
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm font-medium",
                  compact && "text-xs",
                )}
              >
                {dict.course.selection_period.phases[period.phase]}
              </span>
              <span
                className={cn(
                  "text-sm text-muted-foreground sm:w-48 sm:shrink-0 sm:text-left",
                  compact && "text-xs",
                )}
              >
                {formatCourseSelectionDateRange(period, language)}
              </span>
              <span className="shrink-0 text-xs sm:min-w-28 sm:text-right">
                {status === "in-progress" && (
                  <Badge
                    variant="outline"
                    className="px-2 py-0 leading-5 text-primary"
                  >
                    {dict.today.upcoming.in_progress}
                  </Badge>
                )}
                {status === "upcoming" && isNext && (
                  <span className="text-muted-foreground">{statusLabel}</span>
                )}
              </span>
            </div>
          );
        })}
    </div>
  );
};

type CourseSelectionScheduleProps = CourseSelectionScheduleRowsProps & {
  className?: string;
};

const CourseSelectionSchedule = ({
  periods,
  nowDateKey,
  isLoading,
  compact,
  className,
}: CourseSelectionScheduleProps) => {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <CourseSelectionScheduleRows
        periods={periods}
        nowDateKey={nowDateKey}
        isLoading={isLoading}
        compact={compact}
      />
    </section>
  );
};

export default CourseSelectionSchedule;
