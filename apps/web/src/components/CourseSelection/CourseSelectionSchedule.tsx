import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@courseweb/ui";
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
  getCourseSelectionPhaseToHighlight,
  sortCourseSelectionPeriods,
  type CourseSelectionPhaseStatus,
} from "@/lib/course-selection-schedule";
import {
  getCourseSelectionPhaseColor,
  getCourseSelectionPhaseTint,
} from "@/lib/course-selection-colors";
import { toPrettySemester } from "@/helpers/semester";

export type CourseSelectionDateFormats = {
  date_format_short: string;
  date_format_bar: string;
  date_weekday_template: string;
  date_weekday_prefix: string;
};

const formatPeriodDate = (
  date: string,
  language: "en" | "zh",
  dateFormat: string,
) =>
  formatInTimeZone(fromTaipeiDateKey(date), TAIPEI_TIME_ZONE, dateFormat, {
    locale: getLocale(language),
  });

export const formatCourseSelectionDateRange = (
  period: CourseSelectionPeriod,
  language: "en" | "zh",
  formats: CourseSelectionDateFormats,
  withWeekday = true,
) => {
  const start = withWeekday
    ? formatCourseSelectionBarDate(period.startDate, language, formats)
    : formatPeriodDate(period.startDate, language, formats.date_format_short);
  const end = withWeekday
    ? formatCourseSelectionBarDate(period.endDate, language, formats)
    : formatPeriodDate(period.endDate, language, formats.date_format_short);
  if (start === end) return start;
  return language === "zh" ? `${start}– ${end}` : `${start} – ${end}`;
};

export const formatCourseSelectionCompactDate = (
  date: string,
  language: "en" | "zh",
  formats: CourseSelectionDateFormats,
) => formatPeriodDate(date, language, formats.date_format_short);

export const formatCourseSelectionBarDate = (
  date: string,
  language: "en" | "zh",
  formats: CourseSelectionDateFormats,
) => {
  const dateLabel = formatInTimeZone(
    fromTaipeiDateKey(date),
    TAIPEI_TIME_ZONE,
    formats.date_format_bar,
    { locale: getLocale(language) },
  );
  const weekday = formatInTimeZone(
    fromTaipeiDateKey(date),
    TAIPEI_TIME_ZONE,
    "EEE",
    { locale: getLocale(language) },
  ).replace(new RegExp(`^${formats.date_weekday_prefix}`), "");
  return formats.date_weekday_template
    .replace("{date}", dateLabel)
    .replace("{weekday}", weekday);
};

export const getCourseSelectionScheduleTitle = (
  semester: string,
  template: string,
) => template.replace("{semester}", toPrettySemester(semester));

export const getCourseSelectionStatusLabel = (
  period: CourseSelectionPeriod,
  nowDateKey: string,
  status: CourseSelectionPhaseStatus,
  labels: {
    inProgress: string;
    finished: string;
    startsInDays: string;
    startsTomorrow: string;
    startsToday: string;
  },
) => {
  if (status === "in-progress") return labels.inProgress;
  if (status === "finished") return labels.finished;

  const days = daysUntilCourseSelection(period.startDate, nowDateKey);
  if (days === 1) return labels.startsTomorrow;
  if (days === 0) return labels.startsToday;
  return labels.startsInDays.replace("{days}", String(days));
};

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
  const highlightedPeriod = getCourseSelectionPhaseToHighlight(
    sortedPeriods,
    nowDateKey,
  );

  return (
    <div className="flex flex-col divide-y divide-border">
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
          const isHighlighted = highlightedPeriod?.id === period.id;
          const phaseColor = getCourseSelectionPhaseColor(period.phase);
          const statusLabel = getCourseSelectionStatusLabel(
            period,
            nowDateKey,
            status,
            {
              inProgress: dict.course.selection_period.in_progress,
              finished: dict.course.selection_period.finished,
              startsInDays: dict.course.selection_period.starts_in_days,
              startsTomorrow: dict.course.selection_period.starts_tomorrow,
              startsToday: dict.course.selection_period.starts_today,
            },
          );

          return (
            <div
              className={cn(
                "relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 px-4",
                compact ? "py-2" : "py-4",
                status === "finished" && "text-muted-foreground",
              )}
              key={period.id}
              style={
                isHighlighted
                  ? {
                      backgroundColor: getCourseSelectionPhaseTint(
                        period.phase,
                      ),
                    }
                  : undefined
              }
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: phaseColor }}
              />
              <span
                className={cn(
                  "min-w-0 whitespace-nowrap font-bold",
                  status === "finished"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {dict.course.selection_period.phases[period.phase]}
              </span>
              <span className="col-start-1 row-start-2 whitespace-nowrap text-right font-bold sm:col-start-2 sm:row-start-1">
                {formatCourseSelectionDateRange(
                  period,
                  language,
                  dict.course.selection_period,
                )}
              </span>
              <span className="col-start-2 row-start-2 whitespace-nowrap text-right text-sm text-muted-foreground sm:col-span-2 sm:col-start-1">
                {statusLabel}
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
    <section className={cn("flex flex-col", className)}>
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
