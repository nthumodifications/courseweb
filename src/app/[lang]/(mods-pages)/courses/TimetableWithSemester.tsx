import { useMemo } from "react";
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import { CourseDefinition } from "@/config/supabase";
import { useSettings } from "@/hooks/contexts/settings";

const TimetableWithSemester = ({ semester }: { semester: string }) => {
  const { getSemesterCourses, colorMap, hoverCourse } = useUserTimetable();
  const { darkMode } = useSettings();

  const semesterCourses = useMemo<MinimalCourse[]>(() => {
    return getSemesterCourses(semester) as MinimalCourse[];
  }, [semester, getSemesterCourses]);

  const displayCourses = useMemo<MinimalCourse[]>(() => {
    if (!hoverCourse) return semesterCourses;

    if (
      semesterCourses.some((course) => course.raw_id === hoverCourse.raw_id)
    ) {
      return semesterCourses;
    }

    return [...semesterCourses, hoverCourse as MinimalCourse];
  }, [semester, hoverCourse]);

  const colorMapMemo = useMemo(() => {
    if (!hoverCourse) return colorMap;

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
  }, [colorMap, hoverCourse, semesterCourses]);

  return (
    <Timetable
      timetableData={createTimetableFromCourses(displayCourses, colorMapMemo)}
      renderTimetableSlot={renderTimetableSlot}
    />
  );
};

export default TimetableWithSemester;
