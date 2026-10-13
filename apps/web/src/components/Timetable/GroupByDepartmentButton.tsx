import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";
import { groupColorsByDepartment } from "@/helpers/timetableColors";
import { Button } from "@courseweb/ui";

type GroupByDepartmentButtonProps = {
  semester: string;
};

const GroupByDepartmentButton = ({
  semester,
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
      className="w-full"
      variant="outline"
      onClick={handleGroupByDepartment}
    >
      {dict.timetable.actions.group_dept}
    </Button>
  );
};

export default GroupByDepartmentButton;
