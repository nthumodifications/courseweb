"use client";
import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/contexts/settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Minus, Plus } from "lucide-react";
import CourseTagList from "@/components/Courses/CourseTagsList";
import { MinimalCourse } from "@/types/courses";

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
    const searchParams = useSearchParams();

    const courseTitle =
      language === "zh"
        ? `${course.name_zh} - ${course.teacher_zh.join(",")}`
        : `${course.name_en} - ${course.teacher_en?.join(",")}`;

    return (
      <div className="px-4 border-b border-gray-200 dark:border-neutral-800 pb-4 relative @container">
        <div className="flex flex-row gap-4">
          <div className="flex-1">
            <div className="mb-2 space-y-1 pt-3 @md:pt-0">
              <div className="flex flex-row gap-2 items-center">
                {course.closed_mark && (
                  <div
                    className={`flex flex-row items-center justify-center min-w-[65px] py-1 px-2 text-sm select-none rounded-md bg-red-400 dark:bg-red-600`}
                  >
                    {course.closed_mark}
                  </div>
                )}
                {hasTaken && (
                  <div
                    className={`flex flex-row items-center justify-center min-w-[65px] py-1 px-2 text-sm select-none rounded-md bg-nthu-400 dark:bg-nthu-600`}
                  >
                    已修課
                  </div>
                )}
                <p className="text-nthu-500 text-sm font-semibold">
                  {course.department} {course.course}-
                  {course.class.padStart(2, "0")}
                </p>
              </div>
              <Link
                className="font-semibold"
                href={`/${language}/courses/${course.raw_id}?${searchParams.toString()}`}
              >
                {courseTitle}
              </Link>
              <div className="space-y-1 self-start w-auto max-w-fit">
                {course.venues ? (
                  course.venues.map((vn, i) => (
                    <div key={i} className="text-muted-foreground text-xs">
                      {`${vn} / ${course.times![i]}`}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs">No Venues</div>
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
                  限制：{course.restrictions}
                </p>
              )}
              {course.note && course.note.length > 0 && (
                <p className="text-xs whitespace-pre-line text-muted-foreground">
                  備注：{course.note}
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
                      有擋修 <ChevronDown className="h-3 w-3 ml-0.5" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p
                      dangerouslySetInnerHTML={{ __html: course.prerequisites }}
                      className="text-sm text-neutral-500"
                    ></p>
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
