import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CalendarDays, Filter, Loader2Icon, LoaderIcon, Search, X } from "lucide-react";
import { InstantSearch, SearchBox, InfiniteHits } from 'react-instantsearch';
import { createInfiniteHitsSessionStorageCache } from 'instantsearch.js/es/lib/infiniteHitsCache';
import { InstantSearchNext } from 'react-instantsearch-nextjs';
import algoliasearch from 'algoliasearch/lite';
import useDictionary from "@/dictionaries/useDictionary";
import CourseListItem from "@/components/Courses/CourseListItem";

type SearchClient = ReturnType<typeof algoliasearch>;
type InfiniteHitsCache = ReturnType<typeof createInfiniteHitsSessionStorageCache>;

const Hit = ({ hit }: { hit: any }) => {
  return <CourseListItem course={hit} />;
}

export default ({ searchClient, sessionStorageCache } : { searchClient: SearchClient, sessionStorageCache: InfiniteHitsCache }) => {
  
  const dict = useDictionary();
  
  return (
    <div>
      <InstantSearchNext searchClient={searchClient} indexName="nthu_courses">

        {/* <div className="flex flex-row min-h-[44px] items-center rounded-md shadow-md bg-secondary text-secondary-foreground sticky top-0 z-10 pr-3">
          <div className="px-3">
            <HoverCard>
              <HoverCardTrigger><Search /></HoverCardTrigger>
              <HoverCardContent className="whitespace-pre-wrap">
                You can search by <br />
                - Course Name <br />
                - Teacher Name <br />
                - Course ID
              </HoverCardContent>
            </HoverCard>
          </div>
          <SearchBox
            ignoreCompositionEvents
            placeholder="Search for your course..."
            classNames={{
              root: 'flex w-full',
              input: 'bg-transparent outline-none w-full',
              form: 'w-full',
              submit: 'hidden',
              reset: 'hidden',
              loadingIndicator: 'hidden'            
            }}
          />  
        </div> */}

        <InfiniteHits 
          hitComponent={Hit}
          showPrevious={false}
          cache={sessionStorageCache}
          classNames={{
            list: 'flex flex-col w-full h-full space-y-5',
          }}
        />
      </InstantSearchNext>
    </div>
  )
}