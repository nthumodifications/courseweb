import { UnresolvedCoursesNotice } from "@/components/Timetable/UnresolvedCoursesNotice";
import useDictionary from "@/dictionaries/useDictionary";
import {
  TIMETABLE_PREVIEW_COURSES,
  TIMETABLE_PREVIEW_UNRESOLVED_COUNT,
} from "./sampleData";

// Mirrors TimetableCourseListItem's default row markup without threading a
// preview prop through the production timetable list.
const TimetablePreviewRow = ({
  course,
  color,
}: {
  course: (typeof TIMETABLE_PREVIEW_COURSES)[number];
  color: string;
}) => {
  const dict = useDictionary();

  return (
    <div className="flex max-w-3xl flex-row items-center gap-2">
      <div className="mr-2 rounded-md p-1">
        <div
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="text-xs text-muted-foreground">
          {course.department} {course.course}
        </div>
        <div>
          {course.name_zh}{" "}
          <span className="text-muted-foreground">
            {course.teacher_zh.join(",")}
          </span>
        </div>
        <div className="mt-1 flex flex-row flex-wrap gap-1 text-muted-foreground">
          <div className="mr-1 whitespace-nowrap rounded-md bg-foreground/10 px-2 py-0.5 text-xs">
            {course.venues[0]} {course.times[0]}
          </div>
          <div className="mr-1 whitespace-nowrap rounded-md bg-foreground/10 px-2 py-0.5 text-xs">
            {course.credits} {dict.course.credits}
          </div>
        </div>
      </div>
    </div>
  );
};

const TimetableSafePreview = () => (
  <div className="pointer-events-none flex h-full flex-col justify-center gap-2 overflow-hidden p-3">
    <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
      {TIMETABLE_PREVIEW_COURSES.map((course, index) => (
        <TimetablePreviewRow
          key={course.raw_id}
          course={course}
          color={index === 0 ? "#C19AE6" : "#7E42AE"}
        />
      ))}
    </div>
    <div className="ml-1">
      <UnresolvedCoursesNotice count={TIMETABLE_PREVIEW_UNRESOLVED_COUNT} />
    </div>
  </div>
);

export default TimetableSafePreview;
