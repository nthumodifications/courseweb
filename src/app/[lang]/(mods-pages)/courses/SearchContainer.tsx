import { InfiniteHits, useClearRefinements } from 'react-instantsearch';
import { createInfiniteHitsSessionStorageCache } from 'instantsearch.js/es/lib/infiniteHitsCache';
import algoliasearch from 'algoliasearch/lite';
import useDictionary from "@/dictionaries/useDictionary";
import CourseListItem from "@/components/Courses/CourseListItem";
import Filter from './Filters'
import { ScrollArea } from "@/components/ui/scroll-area";
import ClearAllButton from '@/app/[lang]/(mods-pages)/courses/ClearAllButton';

type SearchClient = ReturnType<typeof algoliasearch>;
type InfiniteHitsCache = ReturnType<typeof createInfiniteHitsSessionStorageCache>;

const Hit = ({ hit }: { hit: any }) => {
  return <CourseListItem course={hit} />;
}

const SearchContainer = ({ 
  searchClient, 
  sessionStorageCache, 
} : { 
  searchClient: SearchClient, 
  sessionStorageCache: InfiniteHitsCache 
}) => {
  
  const dict = useDictionary();


  return <div className="flex w-full gap-4">
    <div className="hidden md:flex flex-col gap-4 w-72">
      <div className="flex justify-between items-end">
        <span className="text-2xl">
          {dict.course.refine.title}
        </span>
        <ClearAllButton />
      </div>
      <ScrollArea className="border rounded-2xl">
        <Filter/>
      </ScrollArea>
    </div>

    <div className="flex flex-col gap-4 flex-1">
      <div className="flex justify-between items-end ml-4">
        <span className="text-2xl">
          {dict.course.refine.search_results}
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
}

export default SearchContainer;