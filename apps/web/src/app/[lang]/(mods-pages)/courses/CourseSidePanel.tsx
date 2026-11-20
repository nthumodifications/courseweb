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
    <Tabs defaultValue="timetable">
      <TabsList className="w-full min-w-0 justify-evenly">
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
      <TabsContent value="timetable" className="h-full">
        <ScrollArea className="h-[calc(100vh-12.5rem)] w-full min-w-0 overflow-auto">
          <div className="h-full">
            <TimetableWithSemester semester={semester} />
            <TimetableBottomBar />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="list">
        <ScrollArea className="h-[calc(100vh-12.5rem)] w-full min-w-0 overflow-auto">
          <div className="py-4 h-full">
            <TimetableCourseListWithSemester />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="favourites">
        <ScrollArea className="h-[calc(100vh-12.5rem)] w-full min-w-0 overflow-auto">
          <div className="p-4 h-full">
            <FavouritesCourseList />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default CourseSidePanel;
