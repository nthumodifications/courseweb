import { memo, useEffect, useMemo, useRef } from "react";
import {
  useInfiniteHits,
  useInstantSearch,
  useStats,
  InstantSearch,
} from "react-instantsearch";
import { useMediaQuery } from "usehooks-ts";
import { createCourseSearchRouter } from "@/components/Courses/courseSearchRouting";
import { Button, EmptyState, ErrorState, cn } from "@courseweb/ui";
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
import { hasCourseSearchRefinements } from "../courseSearchView";

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
    const scrollRef = useRef<HTMLDivElement>(null);
    const isMdUp = useMediaQuery("(min-width: 768px)");

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
        { root: isMdUp ? scrollRef.current : null, rootMargin: "200px" },
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }, [
      hits.length,
      indexError,
      indexLoading,
      isLastPage,
      isMdUp,
      showMore,
      status,
    ]);

    const scrollClassName = isMdUp
      ? "min-h-0 flex-1 overflow-y-auto"
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
        {indexLoading ? (
          <div className="px-3">
            <>
              <ModuleSearchSkeleton />
              <ModuleSearchSkeleton />
              <ModuleSearchSkeleton />
            </>
          </div>
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
          <div className="divide-y divide-border px-3 pb-6">
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
          </div>
        )}

        {!indexLoading && !indexError && (
          <>
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
              <div className="px-2 py-4 text-sm text-muted-foreground">
                {dict.course.search.no_more_results}
              </div>
            )}
          </>
        )}
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
  const { status, indexUiState, refresh } = useInstantSearch();
  const { nbHits, processingTimeMS } = useStats();
  const hasFilters = hasCourseSearchRefinements(indexUiState);

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-2 md:h-full">
      <div className="flex min-w-0 w-full items-center gap-1">
        <div className="min-w-0 flex-1">
          <SearchBox
            placeholder={dict.course.module.search_placeholder}
            autoFocus
            filled
          />
        </div>
        <ModuleSearchSort />
      </div>

      <div className="shrink-0">
        <ModuleFilters />
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between gap-2 pl-3 text-muted-foreground">
        <SearchResultCount
          status={indexLoading ? "loading" : status}
          nbHits={indexLoading ? 0 : nbHits}
          processingTimeMS={processingTimeMS}
        />
        {hasFilters && (
          <ResetFiltersButton
            resetToIndexUiState={resetToIndexUiState}
            showLabel
            className="text-muted-foreground hover:text-foreground"
          />
        )}
      </div>

      <ModuleSearchResults
        renderRow={renderRow}
        indexLoading={indexLoading}
        indexError={indexError}
        onRetry={onRetry}
      />
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
    staleTime: 6 * 60 * 60 * 1000,
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:h-full">
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
