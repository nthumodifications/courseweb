import {
  useStats,
  useInfiniteHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch";
import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import useDictionary from "@/dictionaries/useDictionary";
import CourseListItem from "@/components/Courses/CourseListItem";
import Filters from "./Filters";
import ResetFiltersButton from "@/app/[lang]/(mods-pages)/courses/ResetFiltersButton";
import { useEffect, useRef, memo, useMemo, useState } from "react";
import CourseListItemSkeleton from "../../../../components/Courses/CourseListItemSkeleton";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  EmptyState,
  ErrorState,
  ScrollArea,
  Separator,
  cn,
} from "@courseweb/ui";
import { Calendar, FilterIcon } from "lucide-react";
import CourseSidePanel from "./CourseSidePanel";
import SearchBox from "@/components/SearchBox/SearchBox";
import SemesterSelector from "./SemesterSelector";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import { lastSemester } from "@courseweb/shared";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { MinimalCourse } from "@/types/courses";
import { courseEvents } from "@/lib/trackingEvents";
import SearchDegradationBanner from "@/components/Search/SearchDegradationBanner";
import LocalSearchLifecycle from "@/components/Search/LocalSearchLifecycle";
import type { ResilientSearchClient } from "@/lib/search-client";
import { useCourseTextHits } from "@/hooks/useCourseTextHits";
import type { CourseSyllabusView } from "@/config/supabase";
import AiSearchBox from "./AiSearchBox";
import { SearchResultCount } from "@/components/Search/SearchResultCount";

type SearchClient = ResilientSearchClient;
type InfiniteHitsCache = ReturnType<
  typeof createInfiniteHitsSessionStorageCache
>;
type CourseInfiniteHitsOptions = NonNullable<
  Parameters<typeof useInfiniteHits<CourseSyllabusView>>[0]
>;
type CourseInfiniteHitsCache = NonNullable<CourseInfiniteHitsOptions["cache"]>;

// Memoize the Hit component to prevent unnecessary re-renders
const Hit = memo(({ hit }: { hit: CourseSyllabusView }) => {
  return <CourseListItem course={hit} />;
});
Hit.displayName = "Hit";

type InfiniteHitsProps = Omit<CourseInfiniteHitsOptions, "cache"> & {
  cache?: InfiniteHitsCache;
  searchClient: SearchClient;
};

export function InfiniteHits({
  searchClient,
  cache,
  ...props
}: InfiniteHitsProps) {
  const dict = useDictionary();
  const { hits, isLastPage, showMore } = useCourseTextHits(searchClient, {
    showPrevious: false,
    cache: cache as CourseInfiniteHitsCache | undefined,
    ...props,
  });
  const { status, refresh } = useInstantSearch();
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
        "relative min-w-0 overflow-y-auto",
        status !== "idle" ? "opacity-80" : "",
      )}
      style={{ height: "calc(100vh - 200px)" }}
    >
      <div className="divide-y divide-border pb-20">
        {/* Regular items */}
        {hits.map((hit) => (
          <div key={hit.objectID} className="min-w-0">
            <Hit hit={hit} />
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
          <ErrorState
            title={dict.common.load_error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void searchClient.retry().then(() => refresh())}
              >
                {dict.common.try_again}
              </Button>
            }
          />
        )}

        {status === "idle" && hits.length === 0 && (
          <EmptyState title={dict.course.search.no_results} />
        )}

        {isLastPage && hits.length > 0 && status === "idle" && (
          <div className="py-4 text-sm text-muted-foreground">
            {dict.course.search.no_more_results}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize the entire SearchContainer component
const SearchContainer = memo(
  ({
    searchClient,
    sessionStorageCache,
  }: {
    searchClient: SearchClient;
    sessionStorageCache: InfiniteHitsCache;
  }) => {
    const dict = useDictionary();
    const { nbHits, processingTimeMS } = useStats();
    const { status } = useInstantSearch();
    const { query } = useSearchBox();
    const previousNbHitsRef = useRef<number>(0);
    const [aiSearchEnabled, setAiSearchEnabled] = useState(false);

    const { items } = useCustomMenu({
      attribute: "semester",
    });

    const semester = useMemo(
      () => items.find((item) => item.isRefined)?.value ?? lastSemester.id,
      [items],
    );
    const { getSemesterCourses } = useUserTimetable();
    const courses = getSemesterCourses(semester);

    // Track search results
    useEffect(() => {
      if (nbHits !== previousNbHitsRef.current && nbHits > 0) {
        courseEvents.search(query || "all", nbHits);
        previousNbHitsRef.current = nbHits;
      }
    }, [nbHits, query]);

    return (
      <div className="flex min-w-0 w-full gap-4">
        <LocalSearchLifecycle searchClient={searchClient} semester={semester} />
        <div className="hidden md:flex flex-col gap-4 w-72 px-4">
          <div className="flex justify-between items-baseline">
            <span className="font-bold">{dict.course.refine.title}</span>
            <ResetFiltersButton />
          </div>
          <ScrollArea className="">
            <Filters selectedCourses={courses as MinimalCourse[]} />
          </ScrollArea>
        </div>

        <div className="flex flex-col gap-4 flex-1 px-2">
          <SearchDegradationBanner searchClient={searchClient} />
          <div className="">
            <div className="flex flex-wrap items-center gap-1">
              <div className="w-full shrink-0 sm:w-auto">
                <SemesterSelector />
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-full sm:block"
              />
              <AiSearchBox
                enabled={aiSearchEnabled}
                onEnabledChange={setAiSearchEnabled}
                semester={semester}
              >
                <SearchBox
                  placeholder={dict.course.list.search_placeholder}
                  autoFocus
                />
              </AiSearchBox>
              <Separator
                orientation="vertical"
                className="hidden h-full sm:block"
              />
              <div className="md:hidden">
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={dict.a11y.course_filters}
                    >
                      <FilterIcon size="16" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerTitle className="sr-only">
                      {dict.a11y.course_filters}
                    </DrawerTitle>
                    <ScrollArea className="w-full max-h-[90vh] overflow-auto px-4">
                      <div className="flex flex-row justify-end px-4 py-2 w-full">
                        <ResetFiltersButton />
                      </div>
                      <Filters selectedCourses={courses as MinimalCourse[]} />
                    </ScrollArea>
                  </DrawerContent>
                </Drawer>
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-full sm:block"
              />
              <div className="md:hidden">
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={dict.a11y.calendar}
                    >
                      <Calendar size="16" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerTitle className="sr-only">
                      {dict.a11y.calendar}
                    </DrawerTitle>
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
              <SearchResultCount
                status={status}
                nbHits={nbHits}
                processingTimeMS={processingTimeMS}
              />
            </div>
          </div>
          <InfiniteHits
            showPrevious={false}
            cache={sessionStorageCache}
            searchClient={searchClient}
          />
        </div>
      </div>
    );
  },
);

SearchContainer.displayName = "SearchContainer";
export default SearchContainer;
