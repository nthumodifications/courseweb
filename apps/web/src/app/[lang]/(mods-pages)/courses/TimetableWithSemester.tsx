import { useMemo } from "react";
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import { useSettings } from "@/hooks/contexts/settings";
import {
  filterHiddenCourses,
  isCourseHidden,
} from "@/helpers/timetableVisibility";

const TimetableWithSemester = ({ semester }: { semester: string }) => {
  const { courses, getSemesterCourses, colorMap, hoverCourse, preferences } =
    useUserTimetable();
  const { darkMode } = useSettings();

  const semesterCourses = useMemo<MinimalCourse[]>(() => {
    return filterHiddenCourses(
      getSemesterCourses(semester),
      preferences.hiddenCourses,
    ) as MinimalCourse[];
  }, [semester, getSemesterCourses, courses, preferences.hiddenCourses]);

  const displayCourses = useMemo<MinimalCourse[]>(() => {
    if (
      !hoverCourse ||
      isCourseHidden(hoverCourse.raw_id, preferences.hiddenCourses)
    )
      return semesterCourses;

    if (
      semesterCourses.some((course) => course.raw_id === hoverCourse.raw_id)
    ) {
      return semesterCourses;
    }

    return [...semesterCourses, hoverCourse as MinimalCourse];
  }, [hoverCourse, preferences.hiddenCourses, semesterCourses]);

  const colorMapMemo = useMemo(() => {
    if (
      !hoverCourse ||
      isCourseHidden(hoverCourse.raw_id, preferences.hiddenCourses)
    )
      return colorMap;

    if (
      semesterCourses.some((course) => course.raw_id === hoverCourse.raw_id)
    ) {
      return colorMap;
    }

    return {
      ...colorMap,
      [hoverCourse.raw_id]: darkMode
        ? "rgb(255 255 255 / 0.65)"
        : "rgb(38 38 38 / 0.25)",
    };
  }, [colorMap, hoverCourse, preferences.hiddenCourses, semesterCourses]);

  return (
    <Timetable
      timetableData={createTimetableFromCourses(displayCourses, colorMapMemo)}
      renderTimetableSlot={renderTimetableSlot}
    />
  );
};

export default TimetableWithSemester;
