"use client";
import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC, memo, useState } from "react";
import { Link } from "react-router-dom";
import CourseTagList from "./CourseTagsList";
import SelectCourseButton from "./SelectCourseButton";
import { Button } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import useUserTimetable, {
  CourseLocalStorage,
} from "@/hooks/contexts/useUserTimetable";
import useSyncedStorage from "@/hooks/useSyncedStorage";

// Memoize the CourseListItem component
const CourseListItem: FC<{
  course: CourseSyllabusView;
  hasTaken?: boolean;
}> = memo(({ course, hasTaken = false }) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [searchParams] = useSearchParams();

  const { currentColors, setHoverCourse } = useUserTimetable();

  const handleHover = (hovering: boolean) => {
    setHoverCourse(hovering ? course : null);
  };

  const courseTitle =
    language === "zh"
      ? `${course.name_zh} - ${course.teacher_zh.join(",")}`
      : `${course.name_en} - ${course.teacher_en?.join(",")}`;

  return (
    <div className="relative @container">
      <div className="flex flex-row gap-4">
        <div className="flex-1">
          <div className="mb-2 space-y-1 @md:pt-0">
            <div className="flex flex-row gap-2 items-center">
              {hasTaken && (
                <div
                  className={`flex flex-row items-center justify-center min-w-[65px] py-1 px-2 text-sm select-none rounded-md bg-nthu-400 dark:bg-nthu-600`}
                >
                  已修課
                </div>
              )}
              <p className="text-nthu-500 text-sm font-semibold">
                {course.department} {course.course}
                {course.class.padStart(2, "0")}
              </p>
            </div>
            <Link
              className="font-semibold"
              to={`/${language}/courses/${course.raw_id}?${searchParams.toString()}`}
              onMouseEnter={() => handleHover(true)}
              onMouseLeave={() => handleHover(false)}
            >
              {courseTitle}
            </Link>
            {/* <h3 className="text-sm mt-0 break-words">
              {course.name_en} -{" "}
              <span className="w-max">
                {(course.teacher_en ?? []).join(",")}
              </span>
            </h3> */}
            <div className="space-y-1 self-start w-auto max-w-fit">
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
      <div className="absolute top-0 right-2">
        <SelectCourseButton courseId={course.raw_id as string} />
      </div>
    </div>
  );
});

CourseListItem.displayName = "CourseListItem";
export default CourseListItem;
