import { useMemo } from "react";
import TimetableCourseList from "@/components/Timetable/TimetableCourseList";
import useCustomMenu from "./useCustomMenu";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

const TimetableCourseListWithSemester = () => {
  const defaultSemester = useDefaultSemesterId();
  const { items } = useCustomMenu({
    attribute: "semester",
  });

  const semester = useMemo(
    () => items.find((item) => item.isRefined)?.value ?? defaultSemester,
    [defaultSemester, items],
  );

  return <TimetableCourseList semester={semester} vertical={true} />;
};

export default TimetableCourseListWithSemester;
