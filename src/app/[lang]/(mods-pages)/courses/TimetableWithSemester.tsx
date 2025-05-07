import { useMemo } from "react";
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";

const TimetableWithSemester = ({ semester }: { semester: string }) => {
  const { getSemesterCourses, colorMap } = useUserTimetable();
  return (
    <Timetable
      timetableData={createTimetableFromCourses(
        getSemesterCourses(semester) as MinimalCourse[],
        colorMap,
      )}
      renderTimetableSlot={renderTimetableSlot}
    />
  );
};

export default TimetableWithSemester;
