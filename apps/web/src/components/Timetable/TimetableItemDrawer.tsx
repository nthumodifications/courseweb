import { Trash } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { PropsWithChildren } from "react";
import { hasTimes } from "@/helpers/courses";
import { MinimalCourse, RawCourseID } from "@/types/courses";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import Compact from "@uiw/react-color-compact";
import { Drawer, DrawerContent, DrawerTrigger } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import Link from "next/link";
import { Book, ExternalLink, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@courseweb/ui";
import DateContributeForm from "@/components/CourseDetails/DateContributeForm";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { useMediaQuery } from "usehooks-ts";
import { Dialog, DialogContent, DialogTrigger } from "@courseweb/ui";
import { currentSemester } from "@courseweb/shared";
import client from "@/config/api";
import CourseTagList from "@/components/Courses/CourseTagsList";
import { CourseDefinition } from "@/config/supabase";

const ImportantDates = ({ raw_id }: { raw_id: RawCourseID }) => {
  const {
    data: dates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["contrib_dates", raw_id],
    queryFn: async () => {
      const res = await client.course[":courseId"].dates.$get({
        param: {
          courseId: raw_id,
        },
      });
      const dates = await res.json();
      const sortedDates = dates?.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return sortedDates;
    },
  });
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-1 px-4">
      <div className="flex flex-row justify-between">
        <h3 className="font-semibold text-base">
          {dict.course.details.important_dates}
        </h3>
      </div>
      {dates && (
        <div className="flex flex-col gap-1">
          {dates.map((m, index) => (
            <div key={index} className="flex flex-row gap-2">
              <p className="text-sm min-w-20">
                {format(new Date(m.date), "yyyy-MM-dd")}
              </p>
              <p className="text-sm font-semibold">
                <Badge variant="secondary" className="mr-2">
                  {
                    dict.dialogs.DateContributeForm.types[
                      m.type as keyof typeof dict.dialogs.DateContributeForm.types
                    ]
                  }
                </Badge>
                {m.title}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TimetableCourseQuickAccess = ({ course }: { course: MinimalCourse }) => {
  const { deleteCourse, colorMap, setColor, currentColors } =
    useUserTimetable();

  return (
    <>
      <div className="relative @container">
        <div className="flex flex-row gap-4 p-4">
          <Popover>
            <PopoverTrigger>
              <div className="p-1 rounded-md hover:outline outline-1 outline-slate-400">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colorMap[course.raw_id] }}
                ></div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Compact
                color={colorMap[course.raw_id]}
                onChange={(color) => {
                  setColor(course.raw_id, color.hex);
                }}
                colors={currentColors}
              />
            </PopoverContent>
          </Popover>
          <div className="flex-1">
            <div className="mb-2 space-y-1">
              <div className="flex flex-row gap-2 items-center">
                <p className="text-nthu-500 text-sm font-semibold">
                  {course.department} {course.course}-
                  {course.class.padStart(2, "0")}
                </p>
              </div>
              <div className="font-semibold">
                {course.name_zh} - {course.teacher_zh.join(",")}
              </div>
              <div className="text-sm mt-0 break-words">
                {course.name_en} - {course.teacher_en.join(",")}
              </div>
              <div className="space-y-1 self-start w-auto max-w-fit">
                {course.venues?.map((venue, index) => {
                  const time = course.times![index];
                  return (
                    <div key={index} className="text-muted-foreground text-xs">
                      {venue} /{" "}
                      {hasTimes(course as MinimalCourse) ? time : "缺時間"}
                    </div>
                  );
                }) || (
                  <div className="text-muted-foreground text-xs">No Venue</div>
                )}
              </div>
              <CourseTagList course={course as unknown as CourseDefinition} />
            </div>
          </div>
        </div>
      </div>
      <ImportantDates raw_id={course.raw_id} />
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" asChild>
            <Link href={`/courses/${course.raw_id}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              課程詳情
            </Link>
          </Button>
          <Button variant="outline" disabled={true}>
            <Book className="w-4 h-4 mr-2" />
            學習平臺
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteCourse(course.raw_id)}
          >
            <Trash className="w-4 h-4 mr-2" />
            移除
          </Button>
        </div>
      </div>
    </>
  );
};

export const TimetableItemDrawer = ({
  course,
  children,
}: PropsWithChildren<{ course: MinimalCourse }>) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop)
    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <TimetableCourseQuickAccess course={course} />
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <TimetableCourseQuickAccess course={course} />
      </DrawerContent>
    </Drawer>
  );
};
