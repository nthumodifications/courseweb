import { X } from "lucide-react";
import { currentSemester, lastSemester } from "@courseweb/shared";
import { cn } from "@courseweb/ui";
import { useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useCourseSelectionPeriods from "@/hooks/useCourseSelectionPeriods";
import { toPrettySemester } from "@/helpers/semester";
import {
  daysUntilCourseSelection,
  type CourseSelectionPeriod,
} from "@/lib/course-selection-periods";
import {
  getCourseSelectionBarPeriod,
  getCourseSelectionPhaseStatus,
} from "@/lib/course-selection-schedule";
import {
  getCourseSelectionPhaseColor,
  getCourseSelectionPhaseTint,
} from "@/lib/course-selection-colors";
import { formatCourseSelectionBarDate } from "@/components/CourseSelection/CourseSelectionSchedule";
import CourseSelectionScheduleDialog from "@/components/CourseSelection/CourseSelectionScheduleDialog";

const replaceDate = (template: string, date: string) =>
  template.replace("{date}", date);

const getBarAnswer = (
  period: CourseSelectionPeriod,
  nowDateKey: string,
  language: "en" | "zh",
  dict: ReturnType<typeof useDictionary>,
  compact: boolean,
) => {
  const status = getCourseSelectionPhaseStatus(period, nowDateKey);
  const date = formatCourseSelectionBarDate(
    status === "in-progress" ? period.endDate : period.startDate,
    language,
  );

  if (status === "in-progress") {
    return replaceDate(
      compact
        ? dict.course.selection_period.bar_in_progress_until_compact
        : dict.course.selection_period.bar_in_progress_until,
      date,
    );
  }

  const days = daysUntilCourseSelection(period.startDate, nowDateKey);
  if (days === 1) {
    return replaceDate(
      compact
        ? dict.course.selection_period.bar_starts_tomorrow_compact
        : dict.course.selection_period.bar_starts_tomorrow,
      date,
    );
  }
  if (days === 0) {
    return replaceDate(
      compact
        ? dict.course.selection_period.bar_starts_today_compact
        : dict.course.selection_period.bar_starts_today,
      date,
    );
  }
  return replaceDate(
    (compact
      ? dict.course.selection_period.bar_starts_in_days_compact
      : dict.course.selection_period.bar_starts_in_days
    ).replace("{days}", String(days)),
    date,
  );
};

const CourseSelectionBar = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const semester = currentSemester?.id ?? lastSemester.id;
  const { periods, nowDateKey, isLoading, error } =
    useCourseSelectionPeriods(semester);
  const [dismissedPeriodIds, setDismissedPeriodIds] = useLocalStorage<string[]>(
    "dismissed_course_selection_phases",
    [],
  );
  const period = useMemo(
    () => getCourseSelectionBarPeriod(periods, nowDateKey, dismissedPeriodIds),
    [dismissedPeriodIds, nowDateKey, periods],
  );

  if (isLoading || error || !period) return null;

  const phaseColor = getCourseSelectionPhaseColor(period.phase);

  // At 375px: 375 - 32px bar padding - 16px outer gaps - 56px link -
  // 24px dismiss control = 247px for the phase and compact answer.
  return (
    <div
      role="status"
      className={cn(
        "relative flex w-full items-center gap-2 border-b px-4 py-1 text-sm",
        "whitespace-nowrap",
      )}
      style={{
        backgroundColor: getCourseSelectionPhaseTint(period.phase),
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: phaseColor }}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap">
        <span className="shrink-0 font-medium sm:hidden">
          {dict.course.selection_period.bar_phases[period.phase]}
        </span>
        <span className="hidden shrink-0 font-medium sm:inline">
          {dict.course.selection_period.phases[period.phase]}
        </span>
        <span className="min-w-0 sm:hidden">
          {getBarAnswer(period, nowDateKey, language, dict, true)}
        </span>
        <span className="hidden min-w-0 sm:inline">
          {getBarAnswer(period, nowDateKey, language, dict, false)}
        </span>
      </div>
      <span className="hidden shrink-0 sm:inline">
        {toPrettySemester(period.semester)}
      </span>
      <CourseSelectionScheduleDialog
        periods={periods}
        semester={period.semester}
        nowDateKey={nowDateKey}
        isLoading={isLoading}
      >
        <button type="button" className="shrink-0 underline underline-offset-2">
          <span className="sm:hidden">
            {dict.course.selection_period.bar_link_compact}
          </span>
          <span className="hidden sm:inline">
            {dict.course.selection_period.bar_link}
          </span>
        </button>
      </CourseSelectionScheduleDialog>
      <button
        type="button"
        aria-label={dict.alerts.dismiss}
        className="shrink-0 rounded-sm p-1 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() =>
          setDismissedPeriodIds((ids) => [...new Set([...ids, period.id])])
        }
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default CourseSelectionBar;
