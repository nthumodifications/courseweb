import Timetable from "@/components/Timetable/Timetable";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import {
  colorMapFromCourses,
  createTimetableFromCourses,
} from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { timetableColors } from "@courseweb/shared";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";

type VenueTimetableProps = {
  courses: MinimalCourse[];
};
const VenueTimetable = ({ courses }: VenueTimetableProps) => {
  const { timetableTheme } = useUserTimetable();
  console.log(timetableTheme);
  const colors =
    timetableColors[timetableTheme] ??
    timetableColors[Object.keys(timetableColors)[0]];
  const colorMap = colorMapFromCourses(
    courses.map((i) => i.raw_id),
    colors,
  );
  const timetable = createTimetableFromCourses(
    courses as MinimalCourse[],
    colorMap,
  );

  return (
    <Timetable
      timetableData={timetable}
      renderTimetableSlot={renderTimetableSlot}
    />
  );
};

export default VenueTimetable;
