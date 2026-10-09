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
                "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 px-4",
                compact ? "py-2" : "py-3",
                status === "finished" && "text-muted-foreground",
                "sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center",
              )}
              key={period.id}
            >
              <span
                className={cn(
                  "min-w-0 whitespace-nowrap text-sm font-medium",
                  compact && "text-xs",
                )}
              >
                {dict.course.selection_period.phases[period.phase]}
              </span>
              <span
                className={cn(
                  "col-span-2 row-start-2 whitespace-nowrap text-sm text-muted-foreground sm:col-start-2 sm:col-span-1 sm:row-start-1 sm:text-left",
                  compact && "text-xs",
                )}
              >
                {formatCourseSelectionDateRange(period, language)}
              </span>
              {(status === "in-progress" ||
                (status === "upcoming" && isNext)) && (
                <span className="col-start-2 row-start-1 min-w-max whitespace-nowrap text-right text-xs sm:col-start-3 sm:row-start-1">
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
              )}
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
