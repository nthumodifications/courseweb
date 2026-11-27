import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import CourseSelectionScheduleDialog from "@/components/CourseSelection/CourseSelectionScheduleDialog";
import { CourseSelectionScheduleRows } from "@/components/CourseSelection/CourseSelectionSchedule";
import useDictionary from "@/dictionaries/useDictionary";
import useCourseSelectionPeriods from "@/hooks/useCourseSelectionPeriods";
import {
  getCompactCourseSelectionPeriods,
  getCourseSelectionSchedule,
} from "@/lib/course-selection-schedule";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

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
  const semester = useDefaultSemesterId();
  const { periods, nowDateKey, isLoading, error } =
    useCourseSelectionPeriods(semester);
  const schedule = getCourseSelectionSchedule(periods, semester);
  const compactPeriods = getCompactCourseSelectionPeriods(
    schedule.periods,
    nowDateKey,
  );

  return (
    <WidgetShell
      title={dict.course.selection_period.title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 px-4 py-2">
        {error ? (
          <div className="text-sm text-muted-foreground">
            {dict.common.load_error}
          </div>
        ) : (
          <>
            <CourseSelectionScheduleRows
              periods={compactPeriods}
              nowDateKey={nowDateKey}
              isLoading={isLoading}
              compact
            />
            <CourseSelectionScheduleDialog
              periods={periods}
              semester={semester}
              nowDateKey={nowDateKey}
              isLoading={isLoading}
            >
              <button
                type="button"
                className="self-start text-sm font-medium text-primary hover:underline"
              >
                {dict.course.selection_period.view_schedule}
              </button>
            </CourseSelectionScheduleDialog>
          </>
        )}
      </div>
    </WidgetShell>
  );
};

export default CourseSelectionWidget;
