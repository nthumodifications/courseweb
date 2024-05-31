import { createInfiniteHitsSessionStorageCache } from 'instantsearch.js/es/lib/infiniteHitsCache';
import algoliasearch from 'algoliasearch/lite';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useLocalStorage } from 'usehooks-ts';
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
import { useEffect, useState } from 'react';
import type { SearchBoxProps } from 'react-instantsearch';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import Filters from './Filters';
import useCustomRefinementList from './useCustomRefinementList';
import useCustomMenu from './useCustomMenu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toPrettySemester } from '@/helpers/semester';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { lastSemester } from '@/const/semester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TimetableCourseList from '@/components/Timetable/TimetableCourseList';
import ClearAllButton from './ClearAllButton';

const SemesterSelector = () => {
  // refine semester for semester selector
  const { 
    items,
    createURL,
    refine,
    canRefine,
    isShowingMore,
    toggleShowMore,
    canToggleShowMore,
    sendEvent,
   } = useCustomMenu({
    attribute: 'semester',
  });
  
  useEffect(() => {
    if(canRefine && !items.find(item => item.isRefined)) {
      // default to the latest semester
      refine(lastSemester.id);
    }
  }, [canRefine, items]);

  const handleSelect = (v: string) => {
    refine(v);
  }

  const selected = items.find(item => item.isRefined)?.value;

  return <Select value={selected} onValueChange={handleSelect}>
    <SelectTrigger className="w-[200px] border-0 bg-transparent">
      <SelectValue placeholder="Semester" />
    </SelectTrigger>
    <SelectContent>
      {items.map(item => <SelectItem value={item.value} key={item.value}>
        {toPrettySemester(item.label)} 學期
      </SelectItem>)}
    </SelectContent>
  </Select>

}

const CourseSearchContainer = () => {

  const { getSemesterCourses, semester, setSemester, colorMap } = useUserTimetable();
  const [vertical, setVertical] = useLocalStorage('timetable_vertical', true);
  const timetableData = createTimetableFromCourses(getSemesterCourses(semester) as MinimalCourse[], colorMap);

  return <InstantSearchNext
    searchClient={searchClient}
    indexName="nthu_courses"
    routing
  >
    <div className="flex flex-col h-screen p-4 md:p-8 gap-8">

      <div className="">
        <div className="bg-neutral-100 dark:bg-neutral-950 rounded-2xl flex items-center p-4">
          <SemesterSelector />
          <Separator orientation="vertical" className='h-full'/>
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
            placeholder="Search for your course..."
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
          <Separator orientation="vertical" className='h-full'/>
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
                  <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
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
        
        <ResizablePanel collapsible={true} collapsedSize={0} minSize={30} defaultSize={0} className='hidden md:block'>
          <Tabs defaultValue="timetable">
            <TabsList className="w-full justify-around">
              <TabsTrigger value="timetable" className="flex-1">Timetable</TabsTrigger>
              <TabsTrigger value="list" className="flex-1">List</TabsTrigger>
            </TabsList>
            <TabsContent value="timetable" className="h-full">
              <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                <div className="p-4 h-full">
                  <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="list">
              <ScrollArea className="w-full h-[calc(100vh-12.5rem)] overflow-auto border rounded-2xl">
                <div className="p-4 h-full">
                  <TimetableCourseList vertical={vertical} setVertical={setVertical} hideSettings={true} />
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