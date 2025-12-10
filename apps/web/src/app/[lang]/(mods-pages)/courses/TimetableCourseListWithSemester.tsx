import { useMemo } from "react";
import TimetableCourseList from "@/components/Timetable/TimetableCourseList";
import useCustomMenu from "./useCustomMenu";
import { lastSemester } from "@courseweb/shared";

const TimetableCourseListWithSemester = () => {
  const { items } = useCustomMenu({
    attribute: "semester",
  });

  const semester = useMemo(
    () => items.find((item) => item.isRefined)?.value ?? lastSemester.id,
    [items],
  );

  return <TimetableCourseList semester={semester} vertical={true} />;
};

export default TimetableCourseListWithSemester;
