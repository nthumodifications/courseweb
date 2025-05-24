import { useMemo } from "react";
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import { CourseDefinition } from "@/config/supabase";

const TimetableWithSemester = ({ semester }: { semester: string }) => {
  const { getSemesterCourses, colorMap, hoverCourse } = useUserTimetable();

  const displayCourses = useMemo(() => {
    const semesterCourses = getSemesterCourses(semester) as MinimalCourse[];

    if (!hoverCourse) return semesterCourses;

    if (
      semesterCourses.some((course) => course.raw_id === hoverCourse.raw_id)
    ) {
      return semesterCourses;
    }

    return [...semesterCourses, hoverCourse as MinimalCourse];
  }, [semester, hoverCourse, getSemesterCourses]);

  return (
    <Timetable
      timetableData={createTimetableFromCourses(displayCourses, colorMap)}
      renderTimetableSlot={renderTimetableSlot}
    />
  );
};

export default TimetableWithSemester;
