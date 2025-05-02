"use client";
import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import algoliasearch from "algoliasearch/lite";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useMediaQuery } from "usehooks-ts";
import { InstantSearchNext } from "react-instantsearch-nextjs";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!,
);
const sessionStorageCache = createInfiniteHitsSessionStorageCache();

import SearchContainer from "./SearchContainer";
import { lastSemester } from "@/const/semester";
import useDictionary from "@/dictionaries/useDictionary";
import CourseSidePanel from "./CourseSidePanel";

const CourseSearchContainer = () => {
  const dict = useDictionary();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

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
      <div className="flex flex-col h-full max-h-[95dvh] gap-4 md:gap-8">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel className="flex gap-4">
            <SearchContainer
              searchClient={searchClient}
              sessionStorageCache={sessionStorageCache}
            />
          </ResizablePanel>

          <ResizableHandle className="hidden md:block outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />

          <ResizablePanel
            collapsible={true}
            collapsedSize={0}
            minSize={30}
            defaultSize={isDesktop ? 30 : 0}
            className="hidden md:block pr-1"
          >
            <CourseSidePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </InstantSearchNext>
  );
};

export default CourseSearchContainer;
