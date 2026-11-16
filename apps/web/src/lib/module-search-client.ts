import type {
  SearchClient as InstantSearchSearchClient,
  SearchResponse as InstantSearchResponse,
} from "instantsearch.js";
import type {
  InfiniteHitsCache,
  InfiniteHitsCachedHits,
} from "instantsearch.js/es/connectors/infinite-hits/connectInfiniteHits";
import type {
  IndexUiState,
  StateMapping,
  UiState,
} from "instantsearch.js/es/types";
import {
  filterAndSortModuleSearchResults,
  getModuleSearchFacetValues,
  matchesModuleSearchQuery,
  MODULE_SEARCH_FACETS,
  type ModuleSearchResult,
  type ModuleSearchSort,
} from "@/lib/modules";

export const MODULE_SEARCH_INDEX_NAMES = {
  relevance: "nthu_modules",
  courseCode: "nthu_modules_course_code",
  recent: "nthu_modules_recent",
  timesOffered: "nthu_modules_times_offered",
  fillRate: "nthu_modules_fill_rate",
} as const;

type SearchRequests = Parameters<InstantSearchSearchClient["search"]>[0];
export type ModuleSearchRouteState = Record<string, unknown> & {
  q?: string;
};

export const moduleSearchStateMapping: StateMapping<
  UiState,
  ModuleSearchRouteState
> = {
  stateToRoute(uiState) {
    const { query, ...indexState } =
      uiState[MODULE_SEARCH_INDEX_NAMES.relevance] ?? {};
    return {
      [MODULE_SEARCH_INDEX_NAMES.relevance]: indexState,
      ...(typeof query === "string" && query ? { q: query } : {}),
    };
  },
  routeToState(routeState) {
    const indexState = routeState[MODULE_SEARCH_INDEX_NAMES.relevance];
    return {
      [MODULE_SEARCH_INDEX_NAMES.relevance]: {
        ...(typeof indexState === "object" && indexState !== null
          ? (indexState as IndexUiState)
          : {}),
        ...(typeof routeState.q === "string" && routeState.q
          ? { query: routeState.q }
          : {}),
      },
    };
  },
};

export const createModuleInfiniteHitsCache = <
  THit extends NonNullable<object>,
>(): InfiniteHitsCache<THit> => {
  let cachedState: string | null = null;
  let cachedHits: InfiniteHitsCachedHits<THit> | null = null;
  const getStateKey = (state: Record<string, unknown>) => {
    const { page: _page, ...stateWithoutPage } = state;
    return JSON.stringify(stateWithoutPage);
  };

  return {
    read({ state }) {
      return cachedState === getStateKey(state as Record<string, unknown>)
        ? cachedHits
        : null;
    },
    write({ state, hits }) {
      if (Object.values(hits).every((page) => page.length === 0)) return;
      cachedState = getStateKey(state as Record<string, unknown>);
      cachedHits = Object.fromEntries(
        Object.entries(hits).map(([page, pageHits]) => [page, [...pageHits]]),
      ) as InfiniteHitsCachedHits<THit>;
    },
  };
};

const getFacetFilterGroups = (value: unknown): string[][] => {
  if (!Array.isArray(value)) return [];
  return value.map((group) =>
    Array.isArray(group) ? group.map(String) : [String(group)],
  );
};

const matchesFacetFilter = (
  result: ModuleSearchResult,
  filter: string,
  latestSemesters: readonly string[],
) => {
  const excluded = filter.startsWith("-");
  const content = excluded ? filter.slice(1) : filter;
  const separator = content.indexOf(":");
  if (separator < 1) return true;

  const facet = content.slice(0, separator);
  const value = content.slice(separator + 1);
  const hasValue = getModuleSearchFacetValues(
    result,
    facet,
    latestSemesters,
  ).includes(value);
  return excluded ? !hasValue : hasValue;
};

const getFacetName = (filter: string) => {
  const content = filter.startsWith("-") ? filter.slice(1) : filter;
  const separator = content.indexOf(":");
  return separator > 0 ? content.slice(0, separator) : null;
};

const getLatestSemesters = (results: readonly ModuleSearchResult[]) =>
  [...new Set(results.flatMap((result) => result.semesters))].sort(
    (left, right) => right.localeCompare(left),
  );

const getFacetCounts = (
  results: readonly ModuleSearchResult[],
  latestSemesters: readonly string[],
  facetFilterGroups: readonly string[][],
) => {
  const facets: Record<string, Record<string, number>> = {};
  for (const facet of MODULE_SEARCH_FACETS) {
    const counts: Record<string, number> = {};
    const facetResults = results.filter((result) =>
      facetFilterGroups.every(
        (group) =>
          group.some((filter) => getFacetName(filter) === facet) ||
          group.some((filter) =>
            matchesFacetFilter(result, filter, latestSemesters),
          ),
      ),
    );
    for (const result of facetResults) {
      for (const value of getModuleSearchFacetValues(
        result,
        facet,
        latestSemesters,
      )) {
        counts[value] = (counts[value] ?? 0) + 1;
      }
    }
    facets[facet] = counts;
  }
  return facets;
};

const getSort = (indexName: string): ModuleSearchSort => {
  switch (indexName) {
    case MODULE_SEARCH_INDEX_NAMES.courseCode:
      return "course-code";
    case MODULE_SEARCH_INDEX_NAMES.recent:
      return "recent";
    case MODULE_SEARCH_INDEX_NAMES.timesOffered:
      return "times-offered";
    case MODULE_SEARCH_INDEX_NAMES.fillRate:
      return "fill-rate";
    default:
      return "relevance";
  }
};

export const createModuleSearchClient = (
  initialResults: readonly ModuleSearchResult[] = [],
) => {
  let results = [...initialResults];

  const search: InstantSearchSearchClient["search"] = async <TObject>(
    requests: SearchRequests,
  ) => {
    const responses = requests.map((request) => {
      const startedAt = Date.now();
      const params = request.params as Record<string, unknown>;
      const query = typeof params.query === "string" ? params.query : "";
      const latestSemesters = getLatestSemesters(results);
      const facetFilterGroups = getFacetFilterGroups(params.facetFilters);
      const queryResults = results.filter((result) =>
        matchesModuleSearchQuery(result, query),
      );
      const filteredResults = queryResults.filter((result) =>
        facetFilterGroups.every((group) =>
          group.some((filter) =>
            matchesFacetFilter(result, filter, latestSemesters),
          ),
        ),
      );
      const sort = getSort(request.indexName);
      const sortedResults = filterAndSortModuleSearchResults(
        filteredResults,
        query,
        {},
        sort,
      );
      const page = Math.max(0, Number(params.page ?? 0));
      const hitsPerPage = Math.max(0, Number(params.hitsPerPage ?? 20));
      const start = page * hitsPerPage;
      const hits = sortedResults.slice(start, start + hitsPerPage).map(
        (item) =>
          ({
            ...item,
            objectID: `${item.key}:${item.titleKey}`,
          }) as TObject,
      );
      return {
        hits,
        nbHits: sortedResults.length,
        page,
        nbPages:
          hitsPerPage > 0 ? Math.ceil(sortedResults.length / hitsPerPage) : 0,
        hitsPerPage,
        exhaustiveNbHits: true,
        exhaustiveFacetsCount: true,
        processingTimeMS: Math.max(0, Date.now() - startedAt),
        query,
        params: JSON.stringify(params),
        index: request.indexName,
        facets: getFacetCounts(
          queryResults,
          latestSemesters,
          facetFilterGroups,
        ),
      };
    });
    return {
      results: responses as unknown as InstantSearchResponse<TObject>[],
    };
  };

  return {
    search,
    setResults(nextResults: readonly ModuleSearchResult[]) {
      results = [...nextResults];
    },
  };
};
