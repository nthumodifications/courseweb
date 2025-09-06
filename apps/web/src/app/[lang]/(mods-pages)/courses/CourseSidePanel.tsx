import { ScrollArea } from "@courseweb/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import TimetableWithSemester from "./TimetableWithSemester";
import TimetableBottomBar from "./TimetableBottomBar";
import TimetableCourseListWithSemester from "./TimetableCourseListWithSemester";
import FavouritesCourseList from "./FavouritesCourseList";
import useCustomMenu from "./useCustomMenu";
import { useMemo } from "react";
import { lastSemester } from "@/const/semester";

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
    <Tabs defaultValue="timetable">
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
      <TabsContent value="timetable" className="h-full">
        <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto">
          <div className="h-full">
            <TimetableWithSemester semester={semester} />
            <TimetableBottomBar />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="list">
        <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto">
          <div className="py-4 h-full">
            <TimetableCourseListWithSemester />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="favourites">
        <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto">
          <div className="p-4 h-full">
            <FavouritesCourseList />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default CourseSidePanel;
