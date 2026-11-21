import type React from "react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";
import { groupColorsByDepartment } from "@/helpers/timetableColors";
import { Button } from "@courseweb/ui";

type GroupByDepartmentButtonProps = {
  semester: string;
  /** Replaces the default outline button styling. */
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
};

const GroupByDepartmentButton = ({
  semester,
  className,
  children,
  "aria-label": ariaLabel,
}: GroupByDepartmentButtonProps) => {
  const dict = useDictionary();

  const { setColorMap, getSemesterCourses, currentColors } = useUserTimetable();

  const handleGroupByDepartment = () => {
    const semesterCourses = getSemesterCourses(semester);
    setColorMap((previousColorMap) =>
      groupColorsByDepartment(previousColorMap, semesterCourses, currentColors),
    );
  };

  return (
    <Button
      className={className ?? "w-full"}
      variant={className ? "ghost" : "outline"}
      onClick={handleGroupByDepartment}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {children ?? dict.timetable.actions.group_dept}
    </Button>
  );
};

export default GroupByDepartmentButton;
