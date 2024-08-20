"use client";
import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC } from "react";
import Link from "next/link";
import CourseTagList from "./CourseTagsList";
import SelectCourseButton from "./SelectCourseButton";
import { HoverCard } from "@radix-ui/react-hover-card";
import { HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/contexts/settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSearchParams } from "next/navigation";

const CourseListItem: FC<{
  course: CourseSyllabusView;
  hasTaken?: boolean;
}> = ({ course, hasTaken = false }) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const searchParams = useSearchParams();

  return (
    <div className="px-4 border-b border-gray-200 dark:border-neutral-800 pb-4 relative @container">
      <div className="flex flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="mb-3 space-y-1 pt-3 @md:pt-0">
            <div className="flex flex-row gap-2 items-center mb-1">
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
              <p className="text-nthu-500">
                {course.department} {course.course}-{course.class}
              </p>
            </div>
            <Link
              className="font-semibold text-lg"
              href={`/${language}/courses/${course.raw_id}?${searchParams.toString()}`}
            >
              {course.name_zh} - {(course.teacher_zh ?? []).join(",")}
            </Link>
            <h3 className="text-sm mt-0 break-words">
              {course.name_en} -{" "}
              <span className="w-max">
                {(course.teacher_en ?? []).join(",")}
              </span>
            </h3>
          </div>
          <div className="space-y-2 ">
            <p className="text-sm line-clamp-4 text-black dark:text-neutral-200">
              {course.brief}
            </p>
            <p className="text-sm whitespace-pre-line text-gray-400 dark:text-neutral-500">
              {course.restrictions}
            </p>
            <p className="text-sm whitespace-pre-line text-gray-400 dark:text-neutral-500">
              {course.note}
            </p>
            <div className="space-y-1 @md:hidden">
              {course.venues ? (
                course.venues.map((vn, i) => (
                  <p
                    key={i}
                    className="text-nthu-600 dark:text-nthu-400 text-sm"
                  >
                    {vn}{" "}
                    <span className="text-black dark:text-white">
                      {course.times![i]}
                    </span>
                  </p>
                ))
              ) : (
                <p>No Venues</p>
              )}
            </div>
            <CourseTagList course={course as unknown as CourseDefinition} />
            {course.prerequisites && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    size={"sm"}
                    variant="link"
                    className="text-orange-600"
                  >
                    有擋修
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p
                    dangerouslySetInnerHTML={{ __html: course.prerequisites }}
                  ></p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
        <div className="@md:flex flex-col space-y-3 justify-end items-end hidden">
          <div className="space-y-1">
            {course.venues ? (
              course.venues.map((vn, i) => (
                <p key={i} className="text-nthu-600 dark:text-nthu-400 text-sm">
                  {vn}{" "}
                  <span className="text-black dark:text-white">
                    {course.times![i]}
                  </span>
                </p>
              ))
            ) : (
              <p>No Venues</p>
            )}
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-2">
        <SelectCourseButton courseId={course.raw_id as string} />
      </div>
    </div>
  );
};

export default CourseListItem;
