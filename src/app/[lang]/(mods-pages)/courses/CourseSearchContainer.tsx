'use client';
import { createInfiniteHitsSessionStorageCache } from 'instantsearch.js/es/lib/infiniteHitsCache';
import algoliasearch from 'algoliasearch/lite';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useMediaQuery } from 'usehooks-ts';
import { createTimetableFromCourses } from '@/helpers/timetable';
import { MinimalCourse } from '@/types/courses';
import { renderTimetableSlot } from '@/helpers/timetable_course';
import { ScrollArea } from "@/components/ui/scroll-area"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InstantSearchNext } from 'react-instantsearch-nextjs';
import { Calendar, FilterIcon, SearchIcon } from "lucide-react";
import { SearchBox } from 'react-instantsearch';

const searchClient = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!);
const sessionStorageCache = createInfiniteHitsSessionStorageCache();

import SearchContainer from './SearchContainer';
import { Separator } from '@/components/ui/separator';
import { useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import Filters from './Filters';
import useCustomMenu from './useCustomMenu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toPrettySemester } from '@/helpers/semester';
import { Button } from '@/components/ui/button';
import { lastSemester, semesterInfo } from '@/const/semester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TimetableCourseList, { DownloadTimetableDialogDynamic, ShareSyncTimetableDialogDynamic } from '@/components/Timetable/TimetableCourseList';
import ClearAllButton from './ClearAllButton';
import useDictionary from '@/dictionaries/useDictionary';
import FavouritesCourseList from './FavouritesCourseList';
import GroupByDepartmentButton from '@/components/Timetable/GroupByDepartmentButton';
import SemesterSelector from './SemesterSelector';

const TimetableWithSemester = () => {
  const { getSemesterCourses, colorMap } = useUserTimetable();

  const {
    items,
  } = useCustomMenu({
    attribute: 'semester',
  });

  const semester = useMemo(() => items.find(item => item.isRefined)?.value ?? lastSemester.id, [items]);

  return <Timetable timetableData={createTimetableFromCourses(getSemesterCourses(semester) as MinimalCourse[], colorMap)} renderTimetableSlot={renderTimetableSlot} />
}

const TimetableCourseListWithSemester = () => {

  const {
    items,
  } = useCustomMenu({
    attribute: 'semester',
  });

  const semester = useMemo(() => items.find(item => item.isRefined)?.value ?? lastSemester.id, [items]);

  return <TimetableCourseList semester={semester} vertical={true} />
}

const TimetableBottomBar = () => {
  const { semester, courses, colorMap } = useUserTimetable();

  const shareLink = `https://nthumods.com/timetable/view?${Object.keys(courses).map(sem => `semester_${sem}=${courses[sem].map(id => encodeURI(id)).join(',')}`).join('&')}&colorMap=${encodeURIComponent(JSON.stringify(colorMap))}`;
  const webcalLink = `webcals://nthumods.com/timetable/calendar.ics?semester=${semester}&${`semester_${semester}=${(courses[semester] ?? []).map(id => encodeURI(id)).join(',')}`}`;
  const icsfileLink = `https://nthumods.com/timetable/calendar.ics?semester=${semester}&${`semester_${semester}=${(courses[semester] ?? []).map(id => encodeURI(id)).join(',')}`}`;

  return <div className='flex flex-row justify-stretch gap-2 pt-2'>
    <DownloadTimetableDialogDynamic icsfileLink={icsfileLink} />
    <ShareSyncTimetableDialogDynamic shareLink={shareLink} webcalLink={webcalLink} />
    <GroupByDepartmentButton semester={semester} />
  </div>
}

const CourseSearchContainer = () => {
  const dict = useDictionary();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return <InstantSearchNext
    searchClient={searchClient}
    indexName="nthu_courses"
    initialUiState={{
      nthu_courses: {
        menu: {
          semester: lastSemester.id,
        }
      }
    }}
    routing
  >
    <div className="flex flex-col h-full max-h-[100dvh] gap-4 md:gap-8">
      <div className="">
        <div className="bg-neutral-100 dark:bg-neutral-950 rounded-2xl flex items-center py-2 md:p-4">
          <SemesterSelector />
          <Separator orientation="vertical" className='h-full' />
          <HoverCard>
            <HoverCardTrigger className='px-2'>
              <SearchIcon size={16} />
            </HoverCardTrigger>
            <HoverCardContent align="start" className="whitespace-pre-wrap">
              You can search by <br />
              - Course Name <br />
              - Teacher Name <br />
              - Course ID
            </HoverCardContent>
          </HoverCard>
          <SearchBox
            ignoreCompositionEvents
            placeholder={dict.course.list.search_placeholder}
            autoFocus
            classNames={{
              root: 'flex w-full',
              input: 'bg-transparent outline-none w-full',
              form: 'w-full',
              submit: 'hidden',
              reset: 'hidden',
              loadingIndicator: 'hidden',
            }}
          />
          <Separator orientation="vertical" className='h-full' />
          <div className='md:hidden'>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <FilterIcon size="16" />
                </Button>
              </DrawerTrigger>
              <DrawerContent >
                <ScrollArea className="w-full max-h-[90vh] overflow-auto">
                  <div className='flex flex-row justify-end px-4 py-2 w-full'>
                    <ClearAllButton />
                  </div>
                  <Filters />
                </ScrollArea>
              </DrawerContent>
            </Drawer>
          </div>
          <Separator orientation="vertical" className='h-full' />
          <div className='md:hidden'>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <Calendar size="16" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <ScrollArea className="w-full max-h-[80vh] overflow-auto p-2">
                  <Tabs defaultValue="timetable">
                    <TabsList className="w-full justify-around">
                      <TabsTrigger value="timetable" className="flex-1">
                        {dict.course.details.timetable}
                      </TabsTrigger>
                      <TabsTrigger value="list" className="flex-1">
                        {dict.course.details.course_list}
                      </TabsTrigger>
                      <TabsTrigger value="favourites" className="flex-1">
                        已收藏課程
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="timetable" className="h-full">
                      <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                        <div className="p-4 h-full">
                          <TimetableWithSemester />
                          <TimetableBottomBar />
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="list">
                      <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                        <div className="py-4 h-full">
                          <TimetableCourseListWithSemester />
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="favourites">
                      <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                        <div className="p-4 h-full">
                          <FavouritesCourseList />
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel className="flex gap-4" >
          <SearchContainer
            searchClient={searchClient}
            sessionStorageCache={sessionStorageCache}
          />
        </ResizablePanel>

        <ResizableHandle className="hidden md:block outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />

        <ResizablePanel collapsible={true} collapsedSize={0} minSize={30} defaultSize={isDesktop ? 30 : 0} className='hidden md:block'>
          <Tabs defaultValue="timetable">
            <TabsList className="w-full justify-around">
              <TabsTrigger value="timetable" className="flex-1">
                {dict.course.details.timetable}
              </TabsTrigger>
              <TabsTrigger value="list" className="flex-1">
                {dict.course.details.course_list}
              </TabsTrigger>
              <TabsTrigger value="favourites" className="flex-1">
                已收藏課程
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timetable" className="h-full">
              <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                <div className="p-4 h-full">
                  <TimetableWithSemester />
                  <TimetableBottomBar />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="list">
              <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                <div className="py-4 h-full">
                  <TimetableCourseListWithSemester />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="favourites">
              <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                <div className="p-4 h-full">
                  <FavouritesCourseList />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>

    </div>
  </InstantSearchNext>
};

export default CourseSearchContainer;