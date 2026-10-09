import { FC } from "react";
import { currentSemester, lastSemester } from "@courseweb/shared";
import { Button } from "@courseweb/ui";
import { WidgetShell } from "./WidgetShell";
import CourseSelectionScheduleDialog from "@/components/CourseSelection/CourseSelectionScheduleDialog";
import { CourseSelectionScheduleRows } from "@/components/CourseSelection/CourseSelectionSchedule";
import useDictionary from "@/dictionaries/useDictionary";
import useCourseSelectionPeriods from "@/hooks/useCourseSelectionPeriods";
import {
  getCompactCourseSelectionPeriods,
  getCourseSelectionSchedule,
} from "@/lib/course-selection-schedule";

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
  const semester = currentSemester?.id ?? lastSemester.id;
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
      <div className="flex flex-col gap-3 p-4">
        {error ? (
          <div className="py-4 text-sm text-muted-foreground">
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
              <Button variant="link" size="sm" className="h-auto justify-start">
                {dict.course.selection_period.view_schedule}
              </Button>
            </CourseSelectionScheduleDialog>
          </>
        )}
      </div>
    </WidgetShell>
  );
};

export default CourseSelectionWidget;
