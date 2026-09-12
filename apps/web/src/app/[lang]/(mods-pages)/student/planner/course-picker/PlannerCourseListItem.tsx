import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC, memo } from "react";
import { Button } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import { ChevronDown, Minus, Plus } from "lucide-react";
import CourseTagList from "@/components/Courses/CourseTagsList";
import { MinimalCourse } from "@/types/courses";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import { sanitizeCourseHtml } from "@/lib/sanitizeHtml";

type PlannerCourseListItemProps = {
  course: CourseSyllabusView;
  hasTaken?: boolean;
  onAdd?: (course: MinimalCourse) => void;
  onRemove?: (course: MinimalCourse) => void;
};

const PlannerCourseListItem: FC<PlannerCourseListItemProps> = memo(
  ({ course, hasTaken = false, onAdd, onRemove }) => {
    const dict = useDictionary();
    const { language } = useSettings();
    const { openCourse } = useCourseLink();

    const courseTitle =
      language === "zh"
        ? `${course.name_zh} - ${course.teacher_zh.join(",")}`
        : `${course.name_en} - ${course.teacher_en?.join(",")}`;

    return (
      <div className="px-4 border-b border-border  pb-4 relative @container">
        <div className="flex flex-row gap-4">
          <div className="flex-1">
            <div className="mb-2 space-y-1 pt-3 @md:pt-0">
              <div className="flex flex-row gap-2 items-center">
                {course.closed_mark && (
                  <div
                    className={`flex flex-row items-center justify-center min-w-[65px] py-1 px-2 text-sm select-none rounded-md bg-destructive/10 `}
                  >
                    {course.closed_mark}
                  </div>
                )}
                {hasTaken && (
                  <div
                    className={`flex flex-row items-center justify-center min-w-[65px] py-1 px-2 text-sm select-none rounded-md bg-primary `}
                  >
                    {dict.course.details.taken}
                  </div>
                )}
                <p className="text-primary text-sm font-semibold">
                  {course.department} {course.course}-
                  {course.class.padStart(2, "0")}
                </p>
              </div>
              <button
                className="font-semibold text-left hover:underline cursor-pointer"
                onClick={() => openCourse(course.raw_id as string)}
              >
                {courseTitle}
              </button>
              <div className="space-y-1 self-start w-auto max-w-fit">
                {course.venues ? (
                  course.venues.map((vn, i) => (
                    <div key={i} className="text-muted-foreground text-xs">
                      {`${vn} / ${course.times![i]}`}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs">
                    {dict.planner.coursePicker.noVenues}
                  </div>
                )}
              </div>
              <CourseTagList course={course as unknown as CourseDefinition} />
            </div>
            <div className="space-y-2 ">
              <p className="text-xs line-clamp-2 text-muted-foreground">
                {course.brief}
              </p>
              {course.restrictions && course.restrictions.length > 0 && (
                <p className="text-xs whitespace-pre-line text-muted-foreground">
                  {dict.course.details.restriction_prefix}{course.restrictions}
                </p>
              )}
              {course.note && course.note.length > 0 && (
                <p className="text-xs whitespace-pre-line text-muted-foreground">
                  {dict.course.details.note_prefix}{course.note}
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
                      <ChevronDown className="h-3 w-3 ml-1" />
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
        </div>
        <div className="absolute top-2 right-2">
          {hasTaken ? (
            <Button
              size="sm"
              onClick={() => onRemove?.(course as MinimalCourse)}
              variant="outline"
              className="h-8"
            >
              <Minus className="mr-2 h-3 w-3" />
              {dict.course.item.remove_from_semester}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onAdd?.(course as MinimalCourse)}
              variant="outline"
              className="h-8"
            >
              <Plus className="mr-2 h-3 w-3" />
              {dict.course.item.add_to_semester}
            </Button>
          )}
        </div>
      </div>
    );
  },
);

PlannerCourseListItem.displayName = "PlannerCourseListItem";
export default PlannerCourseListItem;
