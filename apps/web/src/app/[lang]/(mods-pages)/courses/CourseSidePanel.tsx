import { ScrollArea } from "@courseweb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import TimetableWithSemester from "./TimetableWithSemester";
import TimetableBottomBar from "./TimetableBottomBar";
import TimetableCourseListWithSemester from "./TimetableCourseListWithSemester";
import FavouritesCourseList from "./FavouritesCourseList";
import useCustomMenu from "./useCustomMenu";
import { useMemo } from "react";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

const CourseSidePanel = () => {
  const dict = useDictionary();
  const defaultSemester = useDefaultSemesterId();

  const { items } = useCustomMenu({
    attribute: "semester",
  });

  const semester = useMemo(
    () => items.find((item) => item.isRefined)?.value ?? defaultSemester,
    [defaultSemester, items],
  );

  return (
    <Tabs
      defaultValue="timetable"
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <TabsList className="w-full min-w-0 shrink-0 justify-evenly">
        <TabsTrigger value="timetable" className="min-w-0 flex-1 px-1">
          <span className="truncate">{dict.course.details.timetable}</span>
        </TabsTrigger>
        <TabsTrigger value="list" className="min-w-0 flex-1 px-1">
          <span className="truncate">{dict.course.details.course_list}</span>
        </TabsTrigger>
        <TabsTrigger value="favourites" className="min-w-0 flex-1 px-1">
          <span className="truncate">{dict.course.details.favourites}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="timetable" className="min-h-0 flex-1">
        {/* Radix wraps the viewport content in a display:table div that grows
            to the table's intrinsic width and clips the last weekdays. */}
        <ScrollArea className="h-full min-h-0 w-full min-w-0 overflow-auto [&_[data-radix-scroll-area-viewport]>div]:!block">
          <div className="min-h-full">
            <TimetableWithSemester semester={semester} />
            <TimetableBottomBar />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="list" className="min-h-0 flex-1">
        <ScrollArea className="h-full min-h-0 w-full min-w-0 overflow-auto">
          <div className="min-h-full py-4">
            <TimetableCourseListWithSemester />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="favourites" className="min-h-0 flex-1">
        <ScrollArea className="h-full min-h-0 w-full min-w-0 overflow-auto">
          <div className="min-h-full p-4">
            <FavouritesCourseList />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default CourseSidePanel;
