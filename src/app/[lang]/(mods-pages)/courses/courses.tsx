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

const searchClient = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!);
const sessionStorageCache = createInfiniteHitsSessionStorageCache();

import Search from './search';

// import Timetable from './timetable';

export default () => {

  const { getSemesterCourses, semester, setSemester, colorMap } = useUserTimetable();
  const [vertical, setVertical] = useLocalStorage('timetable_vertical', true);
  const timetableData = createTimetableFromCourses(getSemesterCourses(semester) as MinimalCourse[], colorMap);

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={70}>
        <ScrollArea className="h-full w-full overflow-auto">
          <Search
            searchClient={searchClient} 
            sessionStorageCache={sessionStorageCache} 
          />
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle className="self-center px-[2px] h-48 mx-4 my-8 rounded-full" />
      <ResizablePanel collapsible={true} collapsedSize={0} minSize={30}>
        <ScrollArea className="h-full w-full overflow-auto pr-6">
          <Timetable timetableData={timetableData} vertical={vertical} renderTimetableSlot={renderTimetableSlot} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
