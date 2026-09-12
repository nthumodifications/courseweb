import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC, memo } from "react";
import CourseTagList from "./CourseTagsList";
import SelectCourseButton from "./SelectCourseButton";
import { Badge, Button } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import { ChevronDown } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import { sanitizeCourseHtml } from "@/lib/sanitizeHtml";

// Memoize the CourseListItem component
const CourseListItem: FC<{
  course: CourseSyllabusView;
  hasTaken?: boolean;
}> = memo(({ course, hasTaken = false }) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { openCourse } = useCourseLink();

  const { setHoverCourse } = useUserTimetable();

  const handleHover = (hovering: boolean) => {
    setHoverCourse(hovering ? course : null);
  };

  const courseTitle =
    language === "zh"
      ? `${course.name_zh} - ${course.teacher_zh.join(",")}`
      : `${course.name_en} - ${course.teacher_en?.join(",")}`;

  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 flex-row items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 space-y-1 @md:pt-0">
            <div className="flex flex-row gap-2 items-center">
              {hasTaken && (
                <Badge variant="secondary" className="shrink-0">
                  {dict.course.details.taken}
                </Badge>
              )}
              <p className="min-w-0 break-words text-sm font-medium tabular-nums text-muted-foreground">
                {course.department} {course.course}
                {course.class.padStart(2, "0")}
              </p>
            </div>
            <button
              className="block max-w-full break-words text-left font-semibold hover:underline cursor-pointer"
              onClick={() => openCourse(course.raw_id as string)}
              onMouseEnter={() => handleHover(true)}
              onMouseLeave={() => handleHover(false)}
            >
              {courseTitle}
            </button>
            {/* <h3 className="text-sm mt-0 break-words">
              {course.name_en} -{" "}
              <span className="w-max">
                {(course.teacher_en ?? []).join(",")}
              </span>
            </h3> */}
            <div className="max-w-full space-y-1 self-start break-words">
              {course.venues.map((vn, i) => (
                <div key={i} className="text-muted-foreground text-xs">
                  {`${vn} / ${course.times![i]}`}
                </div>
              ))}
            </div>
            <CourseTagList course={course as unknown as CourseDefinition} />
          </div>
          <div className="space-y-2 ">
            <p className="text-xs line-clamp-2 text-muted-foreground">
              {course.brief}
            </p>
            {course.restrictions && course.restrictions.length > 0 && (
              <p className="text-xs whitespace-pre-line text-muted-foreground">
                {dict.course.details.restriction_prefix}
                {course.restrictions}
              </p>
            )}
            {course.note && course.note.length > 0 && (
              <p className="text-xs whitespace-pre-line text-muted-foreground">
                {dict.course.details.note_prefix}
                {course.note}
              </p>
            )}
            {course.prerequisites && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {dict.course.details.prerequisites_available}{" "}
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p
                    className="whitespace-pre-line text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeCourseHtml(course.prerequisites),
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <SelectCourseButton courseId={course.raw_id as string} compact />
        </div>
      </div>
    </div>
  );
});

CourseListItem.displayName = "CourseListItem";
export default CourseListItem;
