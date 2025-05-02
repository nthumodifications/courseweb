import { useMemo } from "react";
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import useCustomMenu from "./useCustomMenu";
import { lastSemester } from "@/const/semester";

const TimetableWithSemester = () => {
  const { getSemesterCourses, colorMap } = useUserTimetable();

  const { items } = useCustomMenu({
    attribute: "semester",
  });

  const semester = useMemo(
    () => items.find((item) => item.isRefined)?.value ?? lastSemester.id,
    [items],
  );

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
