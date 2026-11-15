import { memo, useEffect, useMemo, useRef } from "react";
import {
  useInfiniteHits,
  useInstantSearch,
  useStats,
  InstantSearch,
} from "react-instantsearch";
import { createCourseSearchRouter } from "@/components/Courses/courseSearchRouting";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  EmptyState,
  ErrorState,
  ScrollArea,
  cn,
} from "@courseweb/ui";
import { FilterIcon } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import SearchBox from "@/components/SearchBox/SearchBox";
import ResetFiltersButton from "@/app/[lang]/(mods-pages)/courses/ResetFiltersButton";
import { SearchResultCount } from "@/components/Search/SearchResultCount";
import { getModuleSearchIndex, type ModuleSearchResult } from "@/lib/modules";
import {
  createModuleSearchClient,
  createModuleInfiniteHitsCache,
  MODULE_SEARCH_INDEX_NAMES,
  moduleSearchStateMapping,
  type ModuleSearchRouteState,
} from "@/lib/module-search-client";
import { useQuery } from "@tanstack/react-query";
import ModuleFilters from "./ModuleFilters";
import ModuleSearchSort from "./ModuleSearchSort";

export type ModuleSearchHit = ModuleSearchResult & { objectID: string };
type ModuleSearchClient = ReturnType<typeof createModuleSearchClient>;

const ModuleSearchSkeleton = () => (
  <div className="flex animate-pulse flex-col gap-4 py-4">
    <div className="h-4 w-28 rounded bg-muted" />
    <div className="h-5 w-3/4 rounded bg-muted" />
    <div className="h-3 w-1/2 rounded bg-muted" />
  </div>
);

const ModuleSearchResults = memo(
  ({
    renderRow,
    indexLoading,
    indexError,
    onRetry,
  }: {
    renderRow: (hit: ModuleSearchHit) => React.ReactNode;
    indexLoading: boolean;
    indexError: boolean;
    onRetry: () => void;
  }) => {
    const dict = useDictionary();
    const hitsCache = useMemo(
      () => createModuleInfiniteHitsCache<ModuleSearchHit>(),
      [],
    );
    const { hits, isLastPage, showMore } = useInfiniteHits<ModuleSearchHit>({
      showPrevious: false,
      cache: hitsCache,
    });
    const { status, refresh } = useInstantSearch();
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (
        !sentinelRef.current ||
        isLastPage ||
        indexLoading ||
        indexError ||
        status !== "idle" ||
        hits.length === 0
      ) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) showMore();
        },
        { rootMargin: "200px" },
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }, [hits.length, indexError, indexLoading, isLastPage, showMore, status]);

    return (
      <div
        className={cn(
          "relative min-w-0 overflow-y-auto",
          status !== "idle" ? "opacity-80" : "",
        )}
        style={{ height: "calc(100vh - 200px)" }}
      >
        <div className="divide-y divide-border pb-6">
          {indexLoading ? (
            <>
              <ModuleSearchSkeleton />
              <ModuleSearchSkeleton />
              <ModuleSearchSkeleton />
            </>
          ) : indexError ? (
            <ErrorState
              title={dict.common.load_error}
              action={
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {dict.common.try_again}
                </Button>
              }
            />
          ) : (
            <>
              {hits.map((hit) => (
                <div key={hit.objectID} className="min-w-0">
                  {renderRow(hit)}
                </div>
              ))}

              {(status === "loading" || status === "stalled") && (
                <>
                  <ModuleSearchSkeleton />
                  <ModuleSearchSkeleton />
                  <ModuleSearchSkeleton />
                </>
              )}

              <div ref={sentinelRef} className="h-4" />

              {status === "error" && (
                <ErrorState
                  title={dict.common.load_error}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refresh()}
                    >
                      {dict.common.try_again}
                    </Button>
                  }
                />
              )}

              {status === "idle" && hits.length === 0 && (
                <EmptyState title={dict.course.module.search_no_results} />
              )}

              {isLastPage && hits.length > 0 && status === "idle" && (
                <div className="py-4 text-sm text-muted-foreground">
                  {dict.course.search.no_more_results}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);
ModuleSearchResults.displayName = "ModuleSearchResults";

const ModuleSearchContent = ({
  renderRow,
  searchClient,
  results,
  indexLoading,
  indexError,
  onRetry,
}: {
  renderRow: (hit: ModuleSearchHit) => React.ReactNode;
  searchClient: ModuleSearchClient;
  results: ModuleSearchResult[] | undefined;
  indexLoading: boolean;
  indexError: boolean;
  onRetry: () => void;
}) => {
  const dict = useDictionary();
  const { status, refresh } = useInstantSearch();
  const { nbHits, processingTimeMS } = useStats();

  useEffect(() => {
    if (!results) return;
    searchClient.setResults(results);
    void refresh();
  }, [refresh, results, searchClient]);

  const resetToIndexUiState = useMemo(
    () => ({ sortBy: MODULE_SEARCH_INDEX_NAMES.courseCode }),
    [],
  );

  return (
    <div className="flex min-w-0 w-full gap-4">
      <div className="hidden md:flex flex-col gap-4 w-72 px-4">
        <div className="flex justify-between items-baseline">
          <span className="font-bold">{dict.course.refine.title}</span>
          <ResetFiltersButton resetToIndexUiState={resetToIndexUiState} />
        </div>
        <ScrollArea className="">
          <ModuleFilters />
        </ScrollArea>
      </div>

      <div className="flex flex-col gap-4 flex-1 px-2">
        <div className="flex flex-wrap items-center gap-1">
          <div className="w-full shrink-0 sm:w-auto sm:flex-1">
            <SearchBox
              placeholder={dict.course.module.search_placeholder}
              autoFocus
            />
          </div>
          <ModuleSearchSort />
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
                    <ResetFiltersButton
                      resetToIndexUiState={resetToIndexUiState}
                    />
                  </div>
                  <ModuleFilters />
                </ScrollArea>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        <div className="flex items-end">
          <div className="flex-1">
            <h2 className="text-xl font-medium">
              {dict.course.refine.search_results}
            </h2>
            <SearchResultCount
              status={indexLoading ? "loading" : status}
              nbHits={indexLoading ? 0 : nbHits}
              processingTimeMS={processingTimeMS}
            />
          </div>
        </div>

        <ModuleSearchResults
          renderRow={renderRow}
          indexLoading={indexLoading}
          indexError={indexError}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
};

const ModuleSearchContainer = ({
  renderRow,
}: {
  renderRow: (hit: ModuleSearchHit) => React.ReactNode;
}) => {
  const indexQuery = useQuery({
    queryKey: ["module-search-index"],
    queryFn: ({ signal }) => getModuleSearchIndex(signal),
    staleTime: 30 * 60 * 1000,
  });
  const searchClient = useMemo(() => createModuleSearchClient(), []);
  const routing = useMemo(
    () => ({
      router: createCourseSearchRouter<ModuleSearchRouteState>(),
      stateMapping: moduleSearchStateMapping,
    }),
    [],
  );
  const initialUiState = useMemo(
    () => ({
      [MODULE_SEARCH_INDEX_NAMES.relevance]: {
        sortBy: MODULE_SEARCH_INDEX_NAMES.courseCode,
      },
    }),
    [],
  );

  return (
    <div className="flex min-w-0 flex-col h-full max-h-[95dvh] gap-4">
      <InstantSearch
        searchClient={searchClient}
        indexName={MODULE_SEARCH_INDEX_NAMES.relevance}
        initialUiState={initialUiState}
        routing={routing}
        future={{ preserveSharedStateOnUnmount: true }}
        stalledSearchDelay={500}
      >
        <ModuleSearchContent
          renderRow={renderRow}
          searchClient={searchClient}
          results={indexQuery.data}
          indexLoading={indexQuery.isLoading}
          indexError={Boolean(indexQuery.error)}
          onRetry={() => void indexQuery.refetch()}
        />
      </InstantSearch>
    </div>
  );
};

export default ModuleSearchContainer;
