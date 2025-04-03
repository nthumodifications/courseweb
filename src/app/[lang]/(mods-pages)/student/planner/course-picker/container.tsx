"use client";
import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import algoliasearch from "algoliasearch/lite";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useMediaQuery } from "usehooks-ts";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { InstantSearchNext } from "react-instantsearch-nextjs";
import { Calendar, FilterIcon, SearchIcon } from "lucide-react";
import { SearchBox } from "react-instantsearch";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!,
);
const sessionStorageCache = createInfiniteHitsSessionStorageCache();

import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { lastSemester } from "@/const/semester";
import useDictionary from "@/dictionaries/useDictionary";
import ClearAllButton from "../../../courses/ClearAllButton";
import Filters from "../../../courses/Filters";
import SearchContainer from "./SearchContainer";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { MinimalCourse } from "@/types/courses";
import { ItemDocType } from "@/config/rxdb";

type CourseSearchContainerProps = {
  onAdd: (course: MinimalCourse, keepSemester?: boolean) => void;
  onRemove: (course: MinimalCourse) => void;
  items: ItemDocType[];
};

const CourseSearchContainer = (props: CourseSearchContainerProps) => {
  const dict = useDictionary();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { courses, getSemesterCourses } = useUserTimetable();
  return (
    <InstantSearchNext
      searchClient={searchClient}
      indexName="nthu_courses"
      initialUiState={{
        nthu_courses: {
          menu: {
            semester: lastSemester.id,
          },
        },
      }}
      routing
    >
      <div className="flex flex-col h-full max-h-[100dvh] gap-4 md:gap-8">
        <div className="">
          <div className="bg-neutral-100 dark:bg-neutral-950 rounded-2xl flex items-center py-2 md:p-4">
            <HoverCard>
              <HoverCardTrigger className="px-2">
                <SearchIcon size={16} />
              </HoverCardTrigger>
              <HoverCardContent align="start" className="whitespace-pre-wrap">
                You can search by <br />
                - Course Name <br />
                - Teacher Name <br />- Course ID
              </HoverCardContent>
            </HoverCard>
            <SearchBox
              ignoreCompositionEvents
              placeholder={dict.course.list.search_placeholder}
              autoFocus
              classNames={{
                root: "flex w-full",
                input: "bg-transparent outline-none w-full",
                form: "w-full",
                submit: "hidden",
                reset: "hidden",
                loadingIndicator: "hidden",
              }}
            />
            <Separator orientation="vertical" className="h-full" />
            <div className="md:hidden">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <FilterIcon size="16" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <ScrollArea className="w-full max-h-[90vh] overflow-auto">
                    <div className="flex flex-row justify-end px-4 py-2 w-full">
                      <ClearAllButton />
                    </div>
                    <Filters />
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
            </div>
            <Separator orientation="vertical" className="h-full" />
            <div className="md:hidden">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Calendar size="16" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <ScrollArea className="w-full max-h-[80vh] overflow-auto p-2">
                    {"courses you've taken"}
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel className="flex gap-4">
            <SearchContainer
              searchClient={searchClient}
              sessionStorageCache={sessionStorageCache}
              onAdd={props.onAdd}
              onRemove={props.onRemove}
              items={props.items}
            />
          </ResizablePanel>

          <ResizableHandle className="hidden md:block outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />

          <ResizablePanel
            collapsible={true}
            collapsedSize={0}
            minSize={30}
            defaultSize={isDesktop ? 30 : 0}
            className="hidden md:block"
          >
            <ScrollArea className="w-full max-h-[80vh] overflow-auto p-2">
              <div className="p-4">
                {Object.keys(courses).length > 0 ? (
                  Object.keys(courses).map((sem) => {
                    const semester = getSemesterCourses(sem);
                    const addableCourses = semester
                      .filter(
                        (course) =>
                          !props.items.some(
                            (item) => item.raw_id === course.raw_id,
                          ),
                      )
                      .map((course) => {
                        // if course name matches, mark as similar found
                        const isSimilar = props.items.some(
                          (item) =>
                            item.title === course.name_zh ||
                            item.id === course.raw_id.slice(5),
                        );
                        return {
                          ...course,
                          isSimilar,
                        };
                      });

                    return addableCourses.length > 0 ? (
                      <div key={sem} className="mb-6">
                        <h2 className="text-lg font-bold mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {dict.course.refine.semester} {sem}
                        </h2>
                        <div className="space-y-3">
                          {addableCourses.map((course) => (
                            <div
                              key={course.raw_id}
                              className="p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">
                                    {course.name_zh}
                                  </p>
                                  <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                    <span className="mr-2">
                                      {course.raw_id.slice(5)}
                                    </span>
                                    {course.credits && (
                                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-xs">
                                        {course.credits} 學分
                                      </span>
                                    )}
                                    {course.isSimilar && (
                                      <span className="bg-yellow-100 dark:bg-yellow-800 px-2 py-0.5 rounded text-xs ml-2">
                                        已有加入相似課程
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    props.onAdd(course as MinimalCourse, true)
                                  }
                                >
                                  {"Add"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <p className="text-center">{"No courses available"}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </InstantSearchNext>
  );
};

export default CourseSearchContainer;
