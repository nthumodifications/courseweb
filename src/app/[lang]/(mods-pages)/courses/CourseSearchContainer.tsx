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
import { useState } from 'react';
import type { SearchBoxProps } from 'react-instantsearch';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import Filters from './Filters';

const CourseSearchContainer = () => {

  const { getSemesterCourses, semester, setSemester, colorMap } = useUserTimetable();
  const [vertical, setVertical] = useLocalStorage('timetable_vertical', true);
  const timetableData = createTimetableFromCourses(getSemesterCourses(semester) as MinimalCourse[], colorMap);

  const [queryText, setQueryText] = useState('')
  const queryHook: SearchBoxProps['queryHook'] = (query, search) => {
    setQueryText(query)
    search(query)
  }
  
  return <InstantSearchNext
    searchClient={searchClient}
    indexName="nthu_courses"
  >
    <div className="flex flex-col h-screen p-4 md:p-8 gap-8">

      <div className="">
        <div className="bg-muted rounded-2xl flex items-center gap-4 p-4">
          <HoverCard>
            <HoverCardTrigger>
              <SearchIcon size="16" />
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
              root: 'flex flex-1',
              input: 'bg-transparent outline-none w-full',
              form: 'w-full',
              submit: 'hidden',
              reset: 'hidden',
              loadingIndicator: 'hidden',
            }}
            // queryHook={queryHook}
          />
          <Separator orientation="vertical" className="px-4" />
          <div className='md:hidden'>
            <Drawer>
              <DrawerTrigger asChild>
                <FilterIcon size="16" />
              </DrawerTrigger>
              <DrawerContent >
                <Filters />
              </DrawerContent>
            </Drawer>
          </div>
          <Separator orientation="vertical" className="px-4" />
          <div className='md:hidden'>
            <Drawer>
              <DrawerTrigger asChild>
                <Calendar size="16" />
              </DrawerTrigger>
              <DrawerContent >
                <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
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
            queryText={queryText}
          />
        </ResizablePanel>
        
        <ResizableHandle className="hidden md:block outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />
        
        <ResizablePanel collapsible={true} collapsedSize={0} minSize={30} defaultSize={0} className='hidden md:block'>
          <ScrollArea className="w-full h-full overflow-auto">
            <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
      

    </div>
  </InstantSearchNext>

    // <ResizablePanelGroup direction="horizontal">
    //     <ResizablePanel collapsible={true} collapsedSize={0} minSize={20} defaultSize={30}>
    //       <ScrollArea className="h-full w-full overflow-auto pl-4 pr-4">
    //         <Filter />
    //       </ScrollArea>
    //     </ResizablePanel>
    //     <ResizableHandle className="outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />
    //     <ResizablePanel defaultSize={70}>
    //       <ScrollArea className="h-full w-full overflow-auto pr-2">
    //         <Search
    //           searchClient={searchClient} 
    //           sessionStorageCache={sessionStorageCache} 
    //         />
    //       </ScrollArea>
    //     </ResizablePanel>
    //   <ResizableHandle className="outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />
    //   <ResizablePanel collapsible={true} collapsedSize={0} minSize={30} defaultSize={0}>
    //     <ScrollArea className="h-full w-full overflow-auto pr-3.5">
    //       <div className="h-2"></div>
    //       <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
    //       <div className="h-2"></div>
    //     </ScrollArea>
    //   </ResizablePanel>
    // </ResizablePanelGroup>
};

export default CourseSearchContainer;