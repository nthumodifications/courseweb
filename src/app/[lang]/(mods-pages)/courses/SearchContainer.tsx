import {
  useStats,
  useInfiniteHits,
  useInstantSearch,
} from "react-instantsearch";
import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import algoliasearch from "algoliasearch/lite";
import useDictionary from "@/dictionaries/useDictionary";
import CourseListItem from "@/components/Courses/CourseListItem";
import Filter from "./Filters";
import { ScrollArea } from "@/components/ui/scroll-area";
import ResetFiltersButton from "@/app/[lang]/(mods-pages)/courses/ResetFiltersButton";
import { useEffect, useRef, memo, useMemo } from "react";
import CourseListItemSkeleton from "../../../../components/Courses/CourseListItemSkeleton";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar, FilterIcon } from "lucide-react";
import Filters from "./Filters";
import CourseSidePanel from "./CourseSidePanel";
import SearchBox from "@/components/SearchBox/SearchBox";
import SemesterSelector from "./SemesterSelector";
import { Label } from "@/components/ui/label";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import { lastSemester } from "@/const/semester";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { MinimalCourse } from "@/types/courses";

type SearchClient = ReturnType<typeof algoliasearch>;
type InfiniteHitsCache = ReturnType<
  typeof createInfiniteHitsSessionStorageCache
>;

// Memoize the Hit component to prevent unnecessary re-renders
const Hit = memo(({ hit }: { hit: any }) => {
  return <CourseListItem course={hit} />;
});
Hit.displayName = "Hit";

export function InfiniteHits(props: Parameters<typeof useInfiniteHits>[0]) {
  const { hits, isLastPage, showMore } = useInfiniteHits({
    showPrevious: false,
    ...props,
  });
  const { status } = useInstantSearch();
  const sentinelRef = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simple intersection observer for infinite loading
  useEffect(() => {
    if (!sentinelRef.current || isLastPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          showMore();
        }
      },
      {
        rootMargin: "200px", // Load earlier for smoother experience
      },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isLastPage, showMore]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "overflow-auto relative",
        status !== "idle" ? "opacity-80" : "",
      )}
      style={{ height: "calc(100vh - 200px)" }}
    >
      <div className="space-y-1 pb-20">
        {/* Regular items */}
        {hits.map((hit) => (
          <div key={hit.objectID} className="py-0.5">
            <Hit hit={hit} />
            <Separator className="mt-1" />
          </div>
        ))}

        {/* Loading skeletons */}
        {(status === "loading" || status === "stalled") && (
          <>
            <CourseListItemSkeleton />
            <CourseListItemSkeleton />
            <CourseListItemSkeleton />
          </>
        )}

        {/* Sentinel for infinite loading */}
        <div ref={sentinelRef} className="h-4" />

        {/* Status messages */}
        {status === "error" && (
          <div className="text-center text-gray-500 mt-4">
            An Error Occurred
          </div>
        )}

        {isLastPage && hits.length > 0 && status === "idle" && (
          <div className="text-center text-gray-500 mt-4">No more results</div>
        )}
      </div>
    </div>
  );
}

// Memoize the entire SearchContainer component
const SearchContainer = memo(
  ({
    sessionStorageCache,
  }: {
    searchClient: SearchClient;
    sessionStorageCache: InfiniteHitsCache;
  }) => {
    const dict = useDictionary();
    const { nbHits, processingTimeMS } = useStats();

    const { items } = useCustomMenu({
      attribute: "semester",
    });

    const semester = useMemo(
      () => items.find((item) => item.isRefined)?.value ?? lastSemester.id,
      [items],
    );
    const { getSemesterCourses, colorMap } = useUserTimetable();
    const courses = getSemesterCourses(semester);

    return (
      <div className="flex w-full gap-4">
        <div className="hidden md:flex flex-col gap-4 w-72 px-4">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-medium">
              {dict.course.refine.title}
            </span>
            <ResetFiltersButton />
          </div>
          <ScrollArea className="">
            <Filter selectedCourses={courses as MinimalCourse[]} />
          </ScrollArea>
        </div>

        <div className="flex flex-col gap-4 flex-1 px-2">
          <div className="">
            <div className="flex items-center gap-1">
              <SemesterSelector />
              <Separator orientation="vertical" className="h-full" />
              <SearchBox
                placeholder={dict.course.list.search_placeholder}
                autoFocus
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
                    <ScrollArea className="w-full max-h-[90vh] overflow-auto px-4">
                      <div className="flex flex-row justify-end px-4 py-2 w-full">
                        <ResetFiltersButton />
                      </div>
                      <Filters selectedCourses={courses as MinimalCourse[]} />
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
                      <CourseSidePanel />
                    </ScrollArea>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <div className="flex-1">
              <h2 className="text-xl font-medium">
                {dict.course.refine.search_results}
              </h2>
              <span className="text-sm mr-auto">
                {nbHits} {dict.course.refine.results} ({processingTimeMS}ms)
              </span>
            </div>
            <a
              title="Algolia"
              href="https://www.algolia.com/?utm_medium=AOS-referral"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1"
            >
              <svg viewBox="0 0 572 64" className="h-4">
                <path
                  fill={"#36395A"}
                  d="M16 48.3c-3.4 0-6.3-.6-8.7-1.7A12.4 12.4 0 0 1 1.9 42C.6 40 0 38 0 35.4h6.5a6.7 6.7 0 0 0 3.9 6c1.4.7 3.3 1.1 5.6 1.1 2.2 0 4-.3 5.4-1a7 7 0 0 0 3-2.4 6 6 0 0 0 1-3.4c0-1.5-.6-2.8-1.9-3.7-1.3-1-3.3-1.6-5.9-1.8l-4-.4c-3.7-.3-6.6-1.4-8.8-3.4a10 10 0 0 1-3.3-7.9c0-2.4.6-4.6 1.8-6.4a12 12 0 0 1 5-4.3c2.2-1 4.7-1.6 7.5-1.6s5.5.5 7.6 1.6a12 12 0 0 1 5 4.4c1.2 1.8 1.8 4 1.8 6.7h-6.5a6.4 6.4 0 0 0-3.5-5.9c-1-.6-2.6-1-4.4-1s-3.2.3-4.4 1c-1.1.6-2 1.4-2.6 2.4-.5 1-.8 2-.8 3.1a5 5 0 0 0 1.5 3.6c1 1 2.6 1.7 4.7 1.9l4 .3c2.8.2 5.2.8 7.2 1.8 2.1 1 3.7 2.2 4.9 3.8a9.7 9.7 0 0 1 1.7 5.8c0 2.5-.7 4.7-2 6.6a13 13 0 0 1-5.6 4.4c-2.4 1-5.2 1.6-8.4 1.6Zm35.6 0c-2.6 0-4.8-.4-6.7-1.3a13 13 0 0 1-4.7-3.5 17.1 17.1 0 0 1-3.6-10.4v-1c0-2 .3-3.8 1-5.6a13 13 0 0 1 7.3-8.3 15 15 0 0 1 6.3-1.4A13.2 13.2 0 0 1 64 24.3c1 2.2 1.6 4.6 1.6 7.2V34H39.4v-4.3h21.8l-1.8 2.2c0-2-.3-3.7-.9-5.1a7.3 7.3 0 0 0-2.7-3.4c-1.2-.7-2.7-1.1-4.6-1.1s-3.4.4-4.7 1.3a8 8 0 0 0-2.9 3.6c-.6 1.5-.9 3.3-.9 5.4 0 2 .3 3.7 1 5.3a7.9 7.9 0 0 0 2.8 3.7c1.3.8 3 1.3 5 1.3s3.8-.5 5.1-1.3c1.3-1 2.1-2 2.4-3.2h6a11.8 11.8 0 0 1-7 8.7 16 16 0 0 1-6.4 1.2ZM80 48c-2.2 0-4-.3-5.7-1a8.4 8.4 0 0 1-3.7-3.3 9.7 9.7 0 0 1-1.3-5.2c0-2 .5-3.8 1.5-5.2a9 9 0 0 1 4.3-3.1c1.8-.7 4-1 6.7-1H89v4.1h-7.5c-2 0-3.4.5-4.4 1.4-1 1-1.6 2.1-1.6 3.6s.5 2.7 1.6 3.6c1 1 2.5 1.4 4.4 1.4 1.1 0 2.2-.2 3.2-.7 1-.4 1.9-1 2.6-2 .6-1 1-2.4 1-4.2l1.7 2.1c-.2 2-.7 3.8-1.5 5.2a9 9 0 0 1-3.4 3.3 12 12 0 0 1-5.3 1Zm9.5-.7v-8.8h-1v-10c0-1.8-.5-3.2-1.4-4.1-1-1-2.4-1.4-4.2-1.4a142.9 142.9 0 0 0-10.2.4v-5.6a74.8 74.8 0 0 1 8.6-.4c3 0 5.5.4 7.5 1.2s3.4 2 4.4 3.6c1 1.7 1.4 4 1.4 6.7v18.4h-5Zm12.9 0V17.8h5v12.3h-.2c0-4.2 1-7.4 2.8-9.5a11 11 0 0 1 8.3-3.1h1v5.6h-2a9 9 0 0 0-6.3 2.2c-1.5 1.5-2.2 3.6-2.2 6.4v15.6h-6.4Zm34.4 1a15 15 0 0 1-6.6-1.3c-1.9-.9-3.4-2-4.7-3.5a15.5 15.5 0 0 1-2.7-5c-.6-1.7-1-3.6-1-5.4v-1c0-2 .4-3.8 1-5.6a15 15 0 0 1 2.8-4.9c1.3-1.5 2.8-2.6 4.6-3.5a16.4 16.4 0 0 1 13.3.2c2 1 3.5 2.3 4.8 4a12 12 0 0 1 2 6H144c-.2-1.6-1-3-2.2-4.1a7.5 7.5 0 0 0-5.2-1.7 8 8 0 0 0-4.7 1.3 8 8 0 0 0-2.8 3.6 13.8 13.8 0 0 0 0 10.3c.6 1.5 1.5 2.7 2.8 3.6s2.8 1.3 4.8 1.3c1.5 0 2.7-.2 3.8-.8a7 7 0 0 0 2.6-2c.7-1 1-2 1.2-3.2h6.2a11 11 0 0 1-2 6.2 15.1 15.1 0 0 1-11.8 5.5Zm19.7-1v-40h6.4V31h-1.3c0-3 .4-5.5 1.1-7.6a9.7 9.7 0 0 1 3.5-4.8A9.9 9.9 0 0 1 172 17h.3c3.5 0 6 1.1 7.9 3.5 1.7 2.3 2.6 5.7 2.6 10v16.8h-6.4V29.6c0-2.1-.6-3.8-1.8-5a6.4 6.4 0 0 0-4.8-1.8c-2 0-3.7.7-5 2a7.8 7.8 0 0 0-1.9 5.5v17h-6.4Zm63.8 1a12.2 12.2 0 0 1-10.9-6.2 19 19 0 0 1-1.8-7.3h1.4v12.5h-5.1v-40h6.4v19.8l-2 3.5c.2-3.1.8-5.7 1.9-7.7a11 11 0 0 1 4.4-4.5c1.8-1 3.9-1.5 6.1-1.5a13.4 13.4 0 0 1 12.8 9.1c.7 1.9 1 3.8 1 6v1c0 2.2-.3 4.1-1 6a13.6 13.6 0 0 1-13.2 9.4Zm-1.2-5.5a8.4 8.4 0 0 0 7.9-5c.7-1.5 1.1-3.3 1.1-5.3s-.4-3.8-1.1-5.3a8.7 8.7 0 0 0-3.2-3.6 9.6 9.6 0 0 0-9.2-.2 8.5 8.5 0 0 0-3.3 3.2c-.8 1.4-1.3 3-1.3 5v2.3a9 9 0 0 0 1.3 4.8 9 9 0 0 0 3.4 3c1.4.7 2.8 1 4.4 1Zm27.3 3.9-10-28.9h6.5l9.5 28.9h-6Zm-7.5 12.2v-5.7h4.9c1 0 2-.1 2.9-.4a4 4 0 0 0 2-1.4c.4-.7.9-1.6 1.2-2.7l8.6-30.9h6.2l-9.3 32.4a14 14 0 0 1-2.5 5 8.9 8.9 0 0 1-4 2.8c-1.5.6-3.4.9-5.6.9h-4.4Zm9-12.2v-5.2h6.4v5.2H248Z"
                />
                <path
                  fill={"#003DFF"}
                  d="M534.4 9.1H528a.8.8 0 0 1-.7-.7V1.8c0-.4.2-.7.6-.8l6.5-1c.4 0 .8.2.9.6v7.8c0 .4-.4.7-.8.7zM428 35.2V.8c0-.5-.3-.8-.7-.8h-.2l-6.4 1c-.4 0-.7.4-.7.8v35c0 1.6 0 11.8 12.3 12.2.5 0 .8-.4.8-.8V43c0-.4-.3-.7-.6-.8-4.5-.5-4.5-6-4.5-7zm106.5-21.8H528c-.4 0-.7.4-.7.8v34c0 .4.3.8.7.8h6.5c.4 0 .8-.4.8-.8v-34c0-.5-.4-.8-.8-.8zm-17.7 21.8V.8c0-.5-.3-.8-.8-.8l-6.5 1c-.4 0-.7.4-.7.8v35c0 1.6 0 11.8 12.3 12.2.4 0 .8-.4.8-.8V43c0-.4-.3-.7-.7-.8-4.4-.5-4.4-6-4.4-7zm-22.2-20.6a16.5 16.5 0 0 1 8.6 9.3c.8 2.2 1.3 4.8 1.3 7.5a19.4 19.4 0 0 1-4.6 12.6 14.8 14.8 0 0 1-5.2 3.6c-2 .9-5.2 1.4-6.8 1.4a21 21 0 0 1-6.7-1.4 15.4 15.4 0 0 1-8.6-9.3 21.3 21.3 0 0 1 0-14.4 15.2 15.2 0 0 1 8.6-9.3c2-.8 4.3-1.2 6.7-1.2s4.6.4 6.7 1.2zm-6.7 27.6c2.7 0 4.7-1 6.2-3s2.2-4.3 2.2-7.8-.7-6.3-2.2-8.3-3.5-3-6.2-3-4.7 1-6.1 3c-1.5 2-2.2 4.8-2.2 8.3s.7 5.8 2.2 7.8 3.5 3 6.2 3zm-88.8-28.8c-6.2 0-11.7 3.3-14.8 8.2a18.6 18.6 0 0 0 4.8 25.2c1.8 1.2 4 1.8 6.2 1.7s.1 0 .1 0h.9c4.2-.7 8-4 9.1-8.1v7.4c0 .4.3.7.8.7h6.4a.7.7 0 0 0 .7-.7V14.2c0-.5-.3-.8-.7-.8h-13.5zm6.3 26.5a9.8 9.8 0 0 1-5.7 2h-.5a10 10 0 0 1-9.2-14c1.4-3.7 5-6.3 9-6.3h6.4v18.3zm152.3-26.5h13.5c.5 0 .8.3.8.7v33.7c0 .4-.3.7-.8.7h-6.4a.7.7 0 0 1-.8-.7v-7.4c-1.2 4-4.8 7.4-9 8h-.1a4.2 4.2 0 0 1-.5.1h-.9a10.3 10.3 0 0 1-7-2.6c-4-3.3-6.5-8.4-6.5-14.2 0-3.7 1-7.2 3-10 3-5 8.5-8.3 14.7-8.3zm.6 28.4c2.2-.1 4.2-.6 5.7-2V21.7h-6.3a9.8 9.8 0 0 0-9 6.4 10.2 10.2 0 0 0 9.1 13.9h.5zM452.8 13.4c-6.2 0-11.7 3.3-14.8 8.2a18.5 18.5 0 0 0 3.6 24.3 10.4 10.4 0 0 0 13 .6c2.2-1.5 3.8-3.7 4.5-6.1v7.8c0 2.8-.8 5-2.2 6.3-1.5 1.5-4 2.2-7.5 2.2l-6-.3c-.3 0-.7.2-.8.5l-1.6 5.5c-.1.4.1.8.5 1h.1c2.8.4 5.5.6 7 .6 6.3 0 11-1.4 14-4.1 2.7-2.5 4.2-6.3 4.5-11.4V14.2c0-.5-.4-.8-.8-.8h-13.5zm6.3 8.2v18.3a9.6 9.6 0 0 1-5.6 2h-1a10.3 10.3 0 0 1-8.8-14c1.4-3.7 5-6.3 9-6.3h6.4zM291 31.5A32 32 0 0 1 322.8 0h30.8c.6 0 1.2.5 1.2 1.2v61.5c0 1.1-1.3 1.7-2.2 1l-19.2-17a18 18 0 0 1-11 3.4 18.1 18.1 0 1 1 18.2-14.8c-.1.4-.5.7-.9.6-.1 0-.3 0-.4-.2l-3.8-3.4c-.4-.3-.6-.8-.7-1.4a12 12 0 1 0-2.4 8.3c.4-.4 1-.5 1.6-.2l14.7 13.1v-46H323a26 26 0 1 0 10 49.7c.8-.4 1.6-.2 2.3.3l3 2.7c.3.2.3.7 0 1l-.2.2a32 32 0 0 1-47.2-28.6z"
                />
              </svg>
            </a>
          </div>
          <InfiniteHits showPrevious={false} cache={sessionStorageCache} />
        </div>
      </div>
    );
  },
);

SearchContainer.displayName = "SearchContainer";
export default SearchContainer;
