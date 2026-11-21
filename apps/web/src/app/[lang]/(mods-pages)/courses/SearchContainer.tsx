import {
  useStats,
  useInfiniteHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch";
import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import useDictionary from "@/dictionaries/useDictionary";
import CourseListItem from "@/components/Courses/CourseListItem";
import { useEffect, useRef, memo, useMemo } from "react";
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
  Skeleton,
  cn,
} from "@courseweb/ui";
import { Calendar } from "lucide-react";
import CourseSidePanel from "./CourseSidePanel";
import SearchBox from "@/components/SearchBox/SearchBox";
import SemesterSelector from "./SemesterSelector";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { MinimalCourse } from "@/types/courses";
import { courseEvents } from "@/lib/trackingEvents";
import SearchDegradationBanner from "@/components/Search/SearchDegradationBanner";
import LocalSearchLifecycle from "@/components/Search/LocalSearchLifecycle";
import type { ResilientSearchClient } from "@/lib/search-client";
import { useCourseTextHits } from "@/hooks/useCourseTextHits";
import type { CourseSyllabusView } from "@/config/supabase";
import { SearchResultCount } from "@/components/Search/SearchResultCount";
import { useDefaultSemesterId } from "@/hooks/useSemesters";
import { useMediaQuery } from "usehooks-ts";
import CourseSearchViewSwitch, {
  useCourseSearchView,
} from "./CourseSearchViewSwitch";
import FilterBar from "./FilterBar";
import ResetFiltersButton from "./ResetFiltersButton";
import {
  hasCourseSearchRefinements,
  type CourseSearchView,
} from "./courseSearchView";
import { CourseGridCard, CourseResultsTable } from "./CourseResultViews";

type SearchClient = ResilientSearchClient;
type InfiniteHitsCache = ReturnType<
  typeof createInfiniteHitsSessionStorageCache
>;
type CourseInfiniteHitsOptions = NonNullable<
  Parameters<typeof useInfiniteHits<CourseSyllabusView>>[0]
>;
type CourseInfiniteHitsCache = NonNullable<CourseInfiniteHitsOptions["cache"]>;

const Hit = memo(({ hit }: { hit: CourseSyllabusView }) => (
  <CourseListItem course={hit} syllabusFullWidth />
));
Hit.displayName = "Hit";

type InfiniteHitsProps = Omit<CourseInfiniteHitsOptions, "cache"> & {
  cache?: InfiniteHitsCache;
  searchClient: SearchClient;
  view: CourseSearchView;
};

const GridSkeleton = () => (
  <div className="flex h-full min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-3 w-full" />
    <div className="mt-auto flex gap-1 pt-2">
      <Skeleton className="h-6 w-12" />
      <Skeleton className="h-6 w-12" />
    </div>
  </div>
);

export function InfiniteHits({
  searchClient,
  cache,
  view,
  ...props
}: InfiniteHitsProps) {
  const dict = useDictionary();
  const { hits, isLastPage, showMore } = useCourseTextHits(searchClient, {
    showPrevious: false,
    cache: cache as CourseInfiniteHitsCache | undefined,
    ...props,
  });
  const { status, refresh } = useInstantSearch();
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "loading" || status === "stalled";

  useEffect(() => {
    if (!sentinelRef.current || isLastPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) showMore();
      },
      {
        root: isMdUp ? scrollRef.current : null,
        rootMargin: "200px",
      },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isLastPage, isMdUp, showMore]);

  const scrollClassName = isMdUp
    ? view === "table"
      ? "min-h-0 flex-1 overflow-auto"
      : "min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
    : "overflow-visible";

  return (
    <div
      ref={scrollRef}
      className={cn(
        "relative min-w-0",
        scrollClassName,
        status !== "idle" ? "opacity-80" : "",
      )}
    >
      {view === "table" ? (
        <CourseResultsTable courses={hits} loadingRows={isLoading ? 3 : 0} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-stretch gap-2 py-2">
          {hits.map((hit) => (
            <CourseGridCard key={hit.objectID} course={hit} />
          ))}
          {isLoading &&
            Array.from({ length: 3 }, (_, index) => (
              <GridSkeleton key={`loading-${index}`} />
            ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {hits.map((hit) => (
            <div key={hit.objectID} className="min-w-0">
              <Hit hit={hit} />
            </div>
          ))}
          {isLoading && (
            <>
              <CourseListItemSkeleton />
              <CourseListItemSkeleton />
              <CourseListItemSkeleton />
            </>
          )}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {status === "error" && (
        <div className="px-2 py-4">
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
        </div>
      )}

      {status === "idle" && hits.length === 0 && (
        <div className="px-2 py-4">
          <EmptyState title={dict.course.search.no_results} />
        </div>
      )}

      {isLastPage && hits.length > 0 && status === "idle" && (
        <div className="px-2 py-4 text-sm text-muted-foreground">
          {dict.course.search.no_more_results}
        </div>
      )}
    </div>
  );
}

const SearchContainer = memo(
  ({
    searchClient,
    sessionStorageCache,
  }: {
    searchClient: SearchClient;
    sessionStorageCache: InfiniteHitsCache;
  }) => {
    const dict = useDictionary();
    const defaultSemester = useDefaultSemesterId();
    const { nbHits, processingTimeMS } = useStats();
    const { status, indexUiState } = useInstantSearch();
    const hasFilters = hasCourseSearchRefinements(indexUiState);
    const { query } = useSearchBox();
    const previousNbHitsRef = useRef<number>(0);
    const { view, setView } = useCourseSearchView();

    const { items } = useCustomMenu({ attribute: "semester" });
    const semester = useMemo(
      () => items.find((item) => item.isRefined)?.value ?? defaultSemester,
      [defaultSemester, items],
    );
    const { getSemesterCourses } = useUserTimetable();
    const courses = getSemesterCourses(semester);

    useEffect(() => {
      if (nbHits !== previousNbHitsRef.current && nbHits > 0) {
        courseEvents.search(query || "all", nbHits);
        previousNbHitsRef.current = nbHits;
      }
    }, [nbHits, query]);

    return (
      <div className="flex min-h-0 min-w-0 w-full md:h-full">
        <LocalSearchLifecycle searchClient={searchClient} semester={semester} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-2 md:h-full">
          <div className="flex min-w-0 w-full flex-wrap items-center gap-1 sm:flex-nowrap">
            <div className="order-1 shrink-0">
              <SemesterSelector />
            </div>
            <div className="order-1 flex-1 sm:hidden" aria-hidden="true" />
            <div className="order-3 flex min-w-0 basis-full items-center gap-1 sm:order-2 sm:flex-1 sm:basis-auto">
              <div className="min-w-0 flex-1">
                <SearchBox
                  placeholder={dict.course.list.search_placeholder}
                  autoFocus
                  className="border-transparent bg-surface focus-visible:bg-background focus-visible:ring-offset-0"
                />
              </div>
              <CourseSearchViewSwitch view={view} onViewChange={setView} />
            </div>
            <div className="order-2 shrink-0 sm:order-3 @[62rem]/courses:hidden">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={dict.a11y.calendar}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[85dvh] max-h-[85dvh]">
                  <DrawerTitle className="sr-only">
                    {dict.a11y.calendar}
                  </DrawerTitle>
                  <div className="min-h-0 flex-1 p-2">
                    <ScrollArea className="h-full w-full overflow-auto">
                      <CourseSidePanel />
                    </ScrollArea>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
          <div className="shrink-0">
            <FilterBar selectedCourses={courses as MinimalCourse[]} />
          </div>
          {/* The reset sits on the count row so it never wraps the chip
              row onto a second line. */}
          {/* Status lives in this row (never above the search) so the
              search bar never moves. */}
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0">
                <SearchResultCount
                  status={status}
                  nbHits={nbHits}
                  processingTimeMS={processingTimeMS}
                />
              </span>
              <SearchDegradationBanner searchClient={searchClient} inline />
            </div>
            {hasFilters && (
              <ResetFiltersButton
                showLabel
                className="text-muted-foreground hover:text-foreground"
              />
            )}
          </div>
          <InfiniteHits
            showPrevious={false}
            cache={sessionStorageCache}
            searchClient={searchClient}
            view={view}
          />
        </div>
      </div>
    );
  },
);

SearchContainer.displayName = "SearchContainer";
export default SearchContainer;
