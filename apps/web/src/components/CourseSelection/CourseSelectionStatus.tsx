import { CalendarClock, X } from "lucide-react";
import { cn } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import { fromTaipeiDateKey, TAIPEI_TIME_ZONE } from "@/helpers/dates";
import useCourseSelectionPeriods from "@/hooks/useCourseSelectionPeriods";
import {
  daysUntilCourseSelection,
  type CourseSelectionPeriod,
} from "@/lib/course-selection-periods";
import { formatInTimeZone } from "date-fns-tz";
import { useSettings } from "@/hooks/contexts/settings";
import { useLocalStorage } from "usehooks-ts";

const formatPeriodDate = (date: string, language: "en" | "zh") =>
  formatInTimeZone(
    fromTaipeiDateKey(date),
    TAIPEI_TIME_ZONE,
    language === "zh" ? "M月d日" : "MMM d",
    { locale: getLocale(language) },
  );

export const formatDateRange = (
  period: CourseSelectionPeriod,
  language: "en" | "zh",
) => {
  const start = formatPeriodDate(period.startDate, language);
  const end = formatPeriodDate(period.endDate, language);
  return start === end ? start : `${start}–${end}`;
};

const CourseSelectionStatus = ({
  semester,
  className,
}: {
  semester?: string;
  className?: string;
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const {
    periods: allPeriods,
    current,
    next,
    nowDateKey,
    isLoading,
  } = useCourseSelectionPeriods(semester);
  const [dismissedPeriodIds, setDismissedPeriodIds] = useLocalStorage<string[]>(
    "dismissed_course_selection_periods",
    [],
  );
  const periods = [...current, ...(next ? [next] : [])].filter(
    (period) =>
      current.includes(period) || !dismissedPeriodIds.includes(period.id),
  );

  if (isLoading || periods.length === 0) return null;

  const dismissPeriod = (periodId: string) => {
    setDismissedPeriodIds((ids) =>
      [...new Set([...ids, periodId])].filter((id) =>
        allPeriods.some(
          (period) => period.id === id && period.endDate >= nowDateKey,
        ),
      ),
    );
  };

  const renderPeriod = (period: CourseSelectionPeriod, isCurrent: boolean) => {
    const daysUntil = daysUntilCourseSelection(period.startDate, nowDateKey);
    const status = isCurrent
      ? dict.course.selection_period.open_now
      : daysUntil === 0
        ? dict.course.selection_period.opens_today
        : dict.course.selection_period.opens_in.replace(
            "{days}",
            String(daysUntil),
          );
    const audience =
      period.audience === "unspecified"
        ? null
        : dict.course.selection_period.audience[period.audience];

    return (
      <div
        className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"
        key={period.id}
      >
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            isCurrent ? "text-primary" : "text-muted-foreground",
          )}
        >
          {isCurrent
            ? dict.course.selection_period.current
            : dict.course.selection_period.next}
        </span>
        <span className="min-w-0 text-sm font-medium">
          {dict.course.selection_period.phases[period.phase]}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDateRange(period, language)}
        </span>
        <span
          className={cn(
            "text-xs",
            isCurrent ? "text-primary" : "text-muted-foreground",
          )}
        >
          {status}
        </span>
        {audience && (
          <span className="text-xs text-muted-foreground">{audience}</span>
        )}
        <button
          type="button"
          aria-label={dict.alerts.dismiss}
          className="shrink-0 rounded-sm p-0.5 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => dismissPeriod(period.id)}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <CalendarClock
        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-1">
        {periods.map((period) =>
          renderPeriod(period, current.includes(period)),
        )}
      </div>
    </div>
  );
};

export default CourseSelectionStatus;
