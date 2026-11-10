import { timetableColors } from "@courseweb/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@courseweb/ui";
import { TimetableThemePreview } from "./TimetableThemePreview";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";
import { useState } from "react";
import { assignAutomaticCourseColors } from "@/helpers/autoCourseColors";
import type { AutoColorMode } from "@/helpers/autoCourseColors";

export const TimetableThemeList = () => {
  const {
    timetableTheme,
    setTimetableTheme,
    semester,
    getSemesterCourses,
    setColorMap,
    currentColors,
  } = useUserTimetable();
  const dict = useDictionary();
  const [pendingMode, setPendingMode] = useState<AutoColorMode | null>(null);
  const semesterCourses = getSemesterCourses(semester);

  const applyAutomaticColors = () => {
    if (!pendingMode) return;
    const colors = assignAutomaticCourseColors(
      semesterCourses,
      currentColors,
      pendingMode,
    );
    setColorMap((previous) => ({ ...previous, ...colors }));
    setPendingMode(null);
  };

  return (
    <div className="py-4">
      <h3 className="mb-2 text-sm font-bold">
        {dict.settings.timetable.theme.title}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Object.keys(timetableColors).map((theme) => (
          <TimetableThemePreview
            key={theme}
            theme={theme}
            label={
              dict.settings.timetable.theme.options[
                theme as keyof typeof dict.settings.timetable.theme.options
              ]
            }
            onClick={() => setTimetableTheme(theme)}
            selected={timetableTheme === theme}
          />
        ))}
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 text-sm font-medium">
          {dict.settings.timetable.auto_color.title}
        </div>
        <div className="flex flex-row flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={semesterCourses.length === 0}
            onClick={() => setPendingMode("department")}
          >
            {dict.settings.timetable.auto_color.by_department}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={semesterCourses.length === 0}
            onClick={() => setPendingMode("time_of_day")}
          >
            {dict.settings.timetable.auto_color.by_time_of_day}
          </Button>
        </div>
      </div>
      <AlertDialog
        open={pendingMode !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dict.settings.timetable.auto_color.confirm_title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dict.settings.timetable.auto_color.confirm_description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={applyAutomaticColors}>
              {dict.settings.timetable.auto_color.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
