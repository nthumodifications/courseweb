"use client";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";
import { Button } from "@courseweb/ui";

type GroupByDepartmentButtonProps = {
  semester: string;
};

const GroupByDepartmentButton = ({
  semester,
}: GroupByDepartmentButtonProps) => {
  const dict = useDictionary();

  const { colorMap, setColorMap, getSemesterCourses, currentColors } =
    useUserTimetable();

  const handleGroupByDepartment = () => {
    const semesterCourses = getSemesterCourses(semester);
    const newColorMap = { ...colorMap };

    const departments = semesterCourses.reduce((acc, course) => {
      if (!acc.includes(course.department)) {
        acc.push(course.department);
      }
      return acc;
    }, [] as string[]);

    for (let i = 0; i < departments.length; i++) {
      const color = currentColors[i % currentColors.length];

      semesterCourses
        .filter((course) => course.department === departments[i])
        .forEach((course) => {
          newColorMap[course.raw_id] = color;
        });
    }

    setColorMap(newColorMap);
  };

  return (
    <Button
      className="w-full"
      variant="outline"
      onClick={handleGroupByDepartment}
    >
      {dict.timetable.actions.group_dept}
    </Button>
  );
};

export default GroupByDepartmentButton;
