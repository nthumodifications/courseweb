import { FC } from "react";
import { CalendarClock } from "lucide-react";
import { currentSemester, lastSemester } from "@courseweb/shared";
import { WidgetShell } from "./WidgetShell";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useCourseSelectionPeriods from "@/hooks/useCourseSelectionPeriods";
import { daysUntilCourseSelection } from "@/lib/course-selection-periods";
import { formatDateRange } from "@/components/CourseSelection/CourseSelectionStatus";

interface CourseSelectionWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const CourseSelectionWidget: FC<CourseSelectionWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { current, next, nowDateKey, isLoading } = useCourseSelectionPeriods(
    currentSemester?.id ?? lastSemester.id,
  );
  const periods = next ? [...current, next] : current;

  return (
    <WidgetShell
      title={dict.course.selection_period.title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col divide-y divide-border px-4">
        {isLoading && (
          <div className="py-4 text-sm text-muted-foreground">
            {dict.common.loading}
          </div>
        )}
        {!isLoading && periods.length === 0 && (
          <div className="py-4 text-sm text-muted-foreground">
            {dict.course.selection_period.no_data}
          </div>
        )}
        {periods.map((period) => {
          const isCurrent = current.includes(period);
          const daysUntil = daysUntilCourseSelection(
            period.startDate,
            nowDateKey,
          );
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
            <div className="flex flex-col gap-1 py-3" key={period.id}>
              <div className="flex items-start gap-2">
                <CalendarClock
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {isCurrent
                        ? dict.course.selection_period.current
                        : dict.course.selection_period.next}
                    </span>
                    <span className="text-sm font-medium">
                      {dict.course.selection_period.phases[period.phase]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span>{formatDateRange(period, language)}</span>
                    <span className={isCurrent ? "text-primary" : undefined}>
                      {status}
                    </span>
                    {audience && <span>{audience}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
};

export default CourseSelectionWidget;
