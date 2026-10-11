import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { getCourseSelectionSchedule } from "@/lib/course-selection-schedule";
import type { CourseSelectionPeriod } from "@/lib/course-selection-periods";
import CourseSelectionSchedule, {
  getCourseSelectionScheduleTitle,
} from "./CourseSelectionSchedule";

type CourseSelectionScheduleDialogProps = {
  periods: CourseSelectionPeriod[];
  semester: string;
  nowDateKey: string;
  isLoading?: boolean;
  children: ReactElement;
};

const CourseSelectionScheduleDialog = ({
  periods,
  semester,
  nowDateKey,
  isLoading = false,
  children,
}: CourseSelectionScheduleDialogProps) => {
  const dict = useDictionary();
  const schedule = useMemo(
    () => getCourseSelectionSchedule(periods, semester),
    [periods, semester],
  );
  const title = getCourseSelectionScheduleTitle(
    schedule.semester,
    dict.course.selection_period.schedule_title,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:w-full">
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {dict.course.selection_period.dialog_description}
          </DialogDescription>
        </DialogHeader>
        <CourseSelectionSchedule
          periods={schedule.periods}
          nowDateKey={nowDateKey}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CourseSelectionScheduleDialog;
