import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CalendarDays, FilterIcon, Loader2Icon, LoaderIcon, Search, X } from "lucide-react";
import { InstantSearch, SearchBox, InfiniteHits } from 'react-instantsearch';
import { createInfiniteHitsSessionStorageCache } from 'instantsearch.js/es/lib/infiniteHitsCache';
import { InstantSearchNext } from 'react-instantsearch-nextjs';
import algoliasearch from 'algoliasearch/lite';
import useDictionary from "@/dictionaries/useDictionary";
import CourseListItem from "@/components/Courses/CourseListItem";
import Filter from './Filters'
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

type SearchClient = ReturnType<typeof algoliasearch>;
type InfiniteHitsCache = ReturnType<typeof createInfiniteHitsSessionStorageCache>;

const Hit = ({ hit }: { hit: any }) => {
  return <CourseListItem course={hit} />;
}

const SearchContainer = ({ 
  searchClient, 
  sessionStorageCache, 
  queryText 
} : { 
  searchClient: SearchClient, 
  sessionStorageCache: InfiniteHitsCache 
  queryText: string
}) => {
  
  const dict = useDictionary();

  return <div className="flex w-full gap-4">
    <div className="flex flex-col gap-4 w-72">
      <div className="flex justify-between items-end">
        <span className="text-2xl">
          Filters
        </span>
        <button className="text-xs">
          Clear all
        </button>
      </div>
      <ScrollArea className="border rounded-2xl">
        <Filter/>
      </ScrollArea>
    </div>

    <div className="flex flex-col gap-4 flex-1">
      <div className="flex justify-between items-end ml-4">
        <span className="text-2xl">
          {queryText || 'All'}
        </span>
        <span className="text-sm">
          {}
        </span>
      </div>
      <ScrollArea className="">
        <InfiniteHits 
          hitComponent={Hit}
          showPrevious={false}
          cache={sessionStorageCache}
          classNames={{
            list: 'flex flex-col w-full h-full space-y-5',
            loadMore: 'underline mt-5 pb-5',
          }}
        />
      </ScrollArea>
    </div>
  </div>
  

  // return (
  //   <div className="">
  //       <InfiniteHits 
  //         hitComponent={Hit}
  //         showPrevious={false}
  //         cache={sessionStorageCache}
  //         classNames={{
  //           list: 'flex flex-col w-full h-full space-y-5',
  //           loadMore: 'underline mt-5',
  //         }}
  //       />
  //   </div>
  // )
}

export default SearchContainer;