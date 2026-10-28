import {
  useStats,
  useInfiniteHits,
  useInstantSearch,
} from "react-instantsearch";
import useDictionary from "@/dictionaries/useDictionary";
import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import { ScrollArea } from "@courseweb/ui";
import ResetFiltersButton from "@/app/[lang]/(mods-pages)/courses/ResetFiltersButton";
import { useEffect, useRef } from "react";
import { cn } from "@courseweb/ui";
import CourseListItemSkeleton from "@/components/Courses/CourseListItemSkeleton";
import { MinimalCourse } from "@/types/courses";
import { ItemDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import PlannerCourseListItem from "./PlannerCourseListItem";
import PlannerFilters from "./PlannerFilters";
import { CourseSyllabusView } from "@/config/supabase";
import { useSettings } from "@/hooks/contexts/settings";
import SearchDegradationBanner from "@/components/Search/SearchDegradationBanner";
import LocalSearchLifecycle from "@/components/Search/LocalSearchLifecycle";
import type { ResilientSearchClient } from "@/lib/search-client";
import { useCourseTextHits } from "@/hooks/useCourseTextHits";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import { lastSemester } from "@courseweb/shared";

type SearchClient = ResilientSearchClient;
type InfiniteHitsCache = ReturnType<
  typeof createInfiniteHitsSessionStorageCache
>;
type CourseInfiniteHitsOptions = NonNullable<
  Parameters<typeof useInfiniteHits<CourseSyllabusView>>[0]
>;
type CourseInfiniteHitsCache = NonNullable<CourseInfiniteHitsOptions["cache"]>;

type InfiniteHitsProps = {
  onAdd?: (course: MinimalCourse) => void;
  onRemove?: (course: MinimalCourse) => void;
  items: ItemDocType[];
  searchClient: SearchClient;
  cache?: InfiniteHitsCache;
} & Omit<CourseInfiniteHitsOptions, "cache">;
export function InfiniteHits({
  searchClient,
  onAdd,
  onRemove,
  items,
  cache,
  ...props
}: InfiniteHitsProps) {
  const dict = useDictionary();
  const { hits, isLastPage, showMore } = useCourseTextHits(searchClient, {
    showPrevious: false,
    cache: cache as CourseInfiniteHitsCache | undefined,
    ...props,
  });
  const { status } = useInstantSearch();

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (sentinelRef.current !== null) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLastPage) {
            showMore();
          }
        });
      });

      observer.observe(sentinelRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [isLastPage, showMore]);

  return (
    <ScrollArea
      className={cn("scroll-smooth", status != "idle" ? "opacity-70" : "")}
    >
      <div className="ais-InfiniteHits">
        <ul className="ais-InfiniteHits-list flex flex-col w-full h-full space-y-5">
          {hits.map((hit) => (
            <PlannerCourseListItem
              key={hit.objectID}
              course={hit}
              onAdd={onAdd}
              onRemove={onRemove}
              hasTaken={items.some((item) => item.raw_id == hit.raw_id)}
            />
          ))}
          <li ref={sentinelRef} />
          {(status === "stalled" || status === "loading") && (
            <>
              <CourseListItemSkeleton />
              <CourseListItemSkeleton />
              <CourseListItemSkeleton />
            </>
          )}
          {status == "error" && (
            <li className="text-center text-muted-foreground">
              {dict.planner.coursePicker.errorOccurred}
            </li>
          )}
          {isLastPage && (
            <li className="text-center text-muted-foreground">
              {dict.planner.coursePicker.noMoreResults}
            </li>
          )}
          <div className="h-32 w-full"></div>
        </ul>
      </div>
    </ScrollArea>
  );
}

type SearchContainerProps = {
  searchClient: SearchClient;
  sessionStorageCache: InfiniteHitsCache;
  onAdd: (course: MinimalCourse) => void;
  onRemove: (course: MinimalCourse) => void;
  items: ItemDocType[];
};

const SearchContainer = ({
  searchClient,
  sessionStorageCache,
  onAdd,
  onRemove,
  items,
}: SearchContainerProps) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { nbHits, processingTimeMS } = useStats();
  const { status } = useInstantSearch();
  const { items: semesterItems } = useCustomMenu({ attribute: "semester" });
  const semester =
    semesterItems.find((item) => item.isRefined)?.value ?? lastSemester.id;

  return (
    <div className="flex w-full gap-4">
      <LocalSearchLifecycle searchClient={searchClient} semester={semester} />
      <div className="hidden md:flex flex-col gap-4 w-72">
        <div className="flex justify-between items-end">
          <span className="text-xl">{dict.course.refine.title}</span>
          <ResetFiltersButton />
        </div>
        <ScrollArea>
          <PlannerFilters lang={language} />
        </ScrollArea>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <SearchDegradationBanner searchClient={searchClient} />
        <div className="flex items-end ml-4">
          <span className="text-xl">{dict.course.refine.search_results}</span>
          <span className="text-sm mr-auto ml-2">
            {(status === "loading" || status === "stalled") && nbHits === 0
              ? dict.common.loading
              : `(${nbHits}, ${processingTimeMS}ms)`}
          </span>
        </div>
        <InfiniteHits
          showPrevious={false}
          cache={sessionStorageCache}
          searchClient={searchClient}
          onAdd={onAdd}
          onRemove={onRemove}
          items={items}
        />
      </div>
    </div>
  );
};

export default SearchContainer;
