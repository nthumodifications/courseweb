import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { PropsWithChildren } from "react";
import { hasTimes } from "@/helpers/courses";
import { MinimalCourse, RawCourseID } from "@/types/courses";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Compact from "@uiw/react-color-compact";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import Link from "next/link";
import { Book, ExternalLink, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { getDictionary } from "@/dictionaries/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Language } from "@/types/settings";
import DateContributeForm from "@/components/CourseDetails/DateContributeForm";
import { getContribDates } from "@/lib/contrib_dates";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { useMediaQuery } from "usehooks-ts";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { currentSemester } from "@/const/semester";

const ImportantDates = ({ raw_id }: { raw_id: RawCourseID }) => {
  const {
    data: dates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["contrib_dates", raw_id],
    queryFn: async () => {
      const dates = await getContribDates(raw_id);
      const sortedDates = dates?.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return sortedDates;
    },
  });
  const dict = useDictionary();
  const { user } = useHeadlessAIS();

  return (
    <div className="flex flex-col gap-1 px-4">
      <div className="flex flex-row justify-between">
        <h3 className="font-semibold text-base">
          {dict.course.details.important_dates}
        </h3>
        {user && currentSemester?.id == raw_id.substring(0, 5) && (
          <DateContributeForm courseId={raw_id}>
            <Button size="sm" variant="ghost" className="h-6">
              <CalendarPlus className="w-4 h-4" />
            </Button>
          </DateContributeForm>
        )}
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
      <div className="flex flex-row text-left gap-4 p-4">
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
        <div className="flex flex-col flex-1">
          <span className="text-sm">
            {course.department} {course.course}-{course.class}
          </span>
          <span className="text-sm">
            {course.name_zh} - {course.teacher_zh.join(",")}
          </span>
          <span className="text-xs">{course.name_en}</span>
          <div className="mt-1">
            {course.venues?.map((venue, index) => {
              const time = course.times![index];
              return (
                <div
                  key={index}
                  className="flex flex-row items-center space-x-2 font-mono text-gray-400"
                >
                  <span className="text-xs">{venue}</span>
                  {hasTimes(course as MinimalCourse) ? (
                    <span className="text-xs">{time}</span>
                  ) : (
                    <span className="text-xs text-red-500">缺時間</span>
                  )}
                </div>
              );
            }) || <span className="text-gray-400 text-xs">No Venue</span>}
          </div>
        </div>
      </div>
      <ImportantDates raw_id={course.raw_id} />
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
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
