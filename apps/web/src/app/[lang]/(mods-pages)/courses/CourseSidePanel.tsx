import { ScrollArea } from "@courseweb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import TimetableWithSemester from "./TimetableWithSemester";
import TimetableBottomBar from "./TimetableBottomBar";
import TimetableCourseListWithSemester from "./TimetableCourseListWithSemester";
import FavouritesCourseList from "./FavouritesCourseList";
import useCustomMenu from "./useCustomMenu";
import { useMemo } from "react";
import { lastSemester } from "@courseweb/shared";

const CourseSidePanel = () => {
  const dict = useDictionary();

  const { items } = useCustomMenu({
    attribute: "semester",
  });

  const semester = useMemo(
    () => items.find((item) => item.isRefined)?.value ?? lastSemester.id,
    [items],
  );

  return (
    <Tabs defaultValue="timetable" className="min-w-0">
      <TabsList className="w-full justify-around">
        <TabsTrigger value="timetable" className="flex-1">
          {dict.course.details.timetable}
        </TabsTrigger>
        <TabsTrigger value="list" className="flex-1">
          {dict.course.details.course_list}
        </TabsTrigger>
        <TabsTrigger value="favourites" className="flex-1">
          {dict.course.details.favourites}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="timetable" className="h-full min-w-0">
        <ScrollArea className="h-[calc(100vh-12.5rem)] w-full overflow-auto">
          <div className="min-w-0 p-4">
            <TimetableWithSemester semester={semester} />
            <TimetableBottomBar />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="list" className="min-w-0">
        <ScrollArea className="h-[calc(100vh-12.5rem)] w-full overflow-auto">
          <div className="min-w-0 p-4">
            <TimetableCourseListWithSemester />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="favourites" className="min-w-0">
        <ScrollArea className="h-[calc(100vh-12.5rem)] w-full overflow-auto">
          <div className="min-w-0 p-4">
            <FavouritesCourseList />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default CourseSidePanel;
