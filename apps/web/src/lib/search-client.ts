import type { SearchClient as InstantSearchSearchClient } from "instantsearch.js";
import {
  createLocalSearchClient,
  type LocalSearchClient,
  type LocalSearchClientOptions,
} from "./local-search/client";
import type { SearchTextRecord } from "./local-search/cache";
import { fetchJsonWithDeadline, type FetchLike } from "./local-search/deadline";
import { isLocalSearchEnabled } from "./local-search/feature-flags";
import { lastSemester } from "@courseweb/shared";
import { cleanSyllabusFields } from "@/lib/syllabus-text";

export type SearchBackend = "local" | "local-loading" | "fallback";

type SearchClientSearchForFacetValues = NonNullable<
  InstantSearchSearchClient["searchForFacetValues"]
>;

export type ResilientSearchClient = {
  search: InstantSearchSearchClient["search"];
  searchForFacetValues: SearchClientSearchForFacetValues;
  getStatus: () => SearchBackend;
  getVersion: () => number;
  retry: () => Promise<void>;
  /**
   * Syllabus text (brief/keywords) that the local engine loads after the hits
   * it already served. Undefined when served by the API fallback or not yet
   * loaded.
   */
  getCourseText: (rawId: string) => SearchTextRecord | undefined;
  hasError: () => boolean;
  subscribe: (listener: () => void) => () => void;
  subscribeLocalReady: (listener: (semester: string) => void) => () => void;
  prefetch: (semester: string) => Promise<void>;
};

type SearchRequests = Parameters<InstantSearchSearchClient["search"]>[0];
type FacetSearchRequests = Parameters<SearchClientSearchForFacetValues>[0];
type SearchParams = Record<string, unknown>;
type SearchResult<T> = {
  hits: Array<T & { objectID: string }>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
  facets?: Record<string, Record<string, number>>;
};
type SearchResults<T> = { results: Array<SearchResult<T>> };
type FacetResult = {
  facetHits: Array<{ value: string; highlighted: string; count: number }>;
  exhaustiveFacetsCount: boolean;
};

type FallbackPayload<T> = {
  success: boolean;
  data?: T & { warnings?: string[] };
  error?: { message?: string; details?: string };
};

const FALLBACK_TIMEOUT_MS = 15_000;

export type ResilientSearchClientOptions = {
  /** Test/embedded override for the local chunk loader and cache. */
  localSearch?: LocalSearchClientOptions | false;
  /** Character-normalize queries only for the local Traditional-data index. */
  localQueryTransform?: (query: string) => string;
  localSearchTextTransform?: (text: string) => string;
  /** Test-only override for the API fallback request. */
  fallbackFetch?: FetchLike;
};

const viteEnv =
  (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env ?? {};

const API_BASE = (viteEnv.VITE_COURSEWEB_API_URL ?? "").replace(/\/$/, "");
export { isLocalSearchEnabled } from "./local-search/feature-flags";
const localSearchEnabled = isLocalSearchEnabled(viteEnv);

const serializeParam = (
  params: URLSearchParams,
  key: string,
  value: unknown,
) => {
  if (value === undefined) return;
  params.set(
    key,
    Array.isArray(value) || (typeof value === "object" && value !== null)
      ? JSON.stringify(value)
      : String(value),
  );
};

const getSearchParams = (value: unknown): SearchParams =>
  value && typeof value === "object" ? (value as SearchParams) : {};

const fallbackUrl = (
  request: { params?: unknown },
  hitsPerPageOverride?: number,
) => {
  const values = getSearchParams(request.params);
  const params = new URLSearchParams();
  serializeParam(params, "q", values.query ?? "");
  serializeParam(params, "page", values.page ?? 0);
  serializeParam(
    params,
    "hitsPerPage",
    hitsPerPageOverride ?? values.hitsPerPage,
  );
  serializeParam(params, "filters", values.filters);
  serializeParam(params, "numericFilters", values.numericFilters);
  serializeParam(params, "facetFilters", values.facetFilters);
  serializeParam(params, "facets", values.facets);
  serializeParam(params, "maxValuesPerFacet", values.maxValuesPerFacet);
  serializeParam(params, "attributesToRetrieve", values.attributesToRetrieve);
  return `${API_BASE}/search/fallback?${params.toString()}`;
};

const fallbackFacetUrl = (request: { params?: unknown }) => {
  const values = getSearchParams(request.params);
  const params = new URLSearchParams();
  serializeParam(params, "facetName", values.facetName);
  serializeParam(params, "facetQuery", values.facetQuery ?? "");
  serializeParam(params, "maxFacetHits", values.maxFacetHits);
  serializeParam(params, "filters", values.filters);
  serializeParam(params, "numericFilters", values.numericFilters);
  serializeParam(params, "facetFilters", values.facetFilters);
  return `${API_BASE}/search/fallback?${params.toString()}`;
};

const fetchFallback = async <T>(
  url: string,
  fetchFn: FetchLike,
): Promise<T> => {
  const { response, data } = await fetchJsonWithDeadline<FallbackPayload<T>>(
    url,
    FALLBACK_TIMEOUT_MS,
    undefined,
    fetchFn,
    "Course-search API fallback",
  );
  const payload = data;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(
      payload.error?.details ??
        payload.error?.message ??
        "Fallback search failed",
    );
  }
  if (payload.data.warnings?.length) {
    console.warn("Course search fallback limitations:", payload.data.warnings);
  }
  return payload.data;
};

export const createResilientSearchClient = (
  options: ResilientSearchClientOptions = {},
): ResilientSearchClient => {
  const shouldUseLocalSearch =
    options.localSearch !== undefined
      ? options.localSearch !== false
      : localSearchEnabled;
  const localClient: LocalSearchClient | undefined = shouldUseLocalSearch
    ? createLocalSearchClient({
        defaultSemester: lastSemester.id,
        ...(options.localSearch === false ? {} : (options.localSearch ?? {})),
        queryTransform: options.localQueryTransform,
        searchTextTransform: options.localSearchTextTransform,
      })
    : undefined;
  const fallbackFetch =
    options.fallbackFetch ?? ((input, init) => fetch(input, init));
  const listeners = new Set<() => void>();
  const localReadyListeners = new Set<(semester: string) => void>();
  let lastError = false;
  let status: SearchBackend = localClient ? "local-loading" : "fallback";
  let version = 0;
  let requestGeneration = 0;
  type RequestState = {
    generation: number;
    semester?: string | null;
    localReady: boolean;
    fallbackDisplayed: boolean;
    readyNotified: boolean;
  };
  let currentRequest: RequestState | undefined;

  const notify = () => listeners.forEach((listener) => listener());
  const isCurrentRequest = (generation: number) =>
    currentRequest?.generation === generation;

  const setStatus = (next: SearchBackend, generation?: number) => {
    if (generation !== undefined && !isCurrentRequest(generation)) return;
    if (status === next) return;
    status = next;
    notify();
  };

  const setLastError = (value: boolean, generation?: number) => {
    if (generation !== undefined && !isCurrentRequest(generation)) return;
    if (lastError === value) return;
    lastError = value;
    notify();
  };

  const announceLocalReady = (state: RequestState) => {
    if (
      !isCurrentRequest(state.generation) ||
      !state.semester ||
      !state.localReady ||
      !state.fallbackDisplayed ||
      state.readyNotified
    ) {
      return;
    }
    state.readyNotified = true;
    setStatus("local", state.generation);
    setLastError(false, state.generation);
    for (const listener of localReadyListeners) listener(state.semester);
  };

  const startRequest = (requests: readonly { params?: unknown }[]) => {
    const generation = ++requestGeneration;
    const semester = localClient?.getSemesterFor(
      requests as Parameters<LocalSearchClient["getSemesterFor"]>[0],
    );
    const localReady = Boolean(
      localClient?.isReadyFor(
        requests as Parameters<LocalSearchClient["isReadyFor"]>[0],
      ),
    );
    currentRequest = {
      generation,
      semester,
      localReady,
      fallbackDisplayed: false,
      readyNotified: false,
    };
    setStatus(
      localClient ? (localReady ? "local" : "local-loading") : "fallback",
    );
    return currentRequest;
  };

  const markFallbackDisplayed = (state: RequestState) => {
    if (!isCurrentRequest(state.generation)) return;
    state.fallbackDisplayed = true;
    setStatus("fallback", state.generation);
    announceLocalReady(state);
  };

  localClient?.subscribe(() => {
    version += 1;
    notify();
  });

  localClient?.subscribeReady((semester) => {
    version += 1;
    const state = currentRequest;
    if (state?.semester === semester) {
      state.localReady = true;
      announceLocalReady(state);
    }
    notify();
  });

  const warmUpLocalSearch = (
    requests: SearchRequests | FacetSearchRequests,
    state: RequestState,
  ) => {
    if (!localClient) return;
    void localClient
      .warmUpFor(requests as Parameters<LocalSearchClient["warmUpFor"]>[0])
      .catch((error) => {
        console.error("Local course-search warm-up unavailable:", error);
        setStatus("fallback", state.generation);
      });
  };

  const tryLocalSearch = async <TObject>(
    requests: SearchRequests,
    state: RequestState,
  ) => {
    if (!localClient) return undefined;
    try {
      const attempt = await localClient.trySearch(
        requests as unknown as readonly { params?: Record<string, unknown> }[],
      );
      if (!attempt.handled) {
        state.localReady = false;
        setStatus("fallback", state.generation);
        return undefined;
      }
      setLastError(false, state.generation);
      setStatus("local", state.generation);
      return attempt.result as unknown as SearchResults<TObject>;
    } catch (error) {
      console.error("Local course search unavailable:", error);
      state.localReady = false;
      setStatus("fallback", state.generation);
      return undefined;
    }
  };

  const tryLocalFacetSearch = async (
    requests: FacetSearchRequests,
    state: RequestState,
  ) => {
    if (!localClient) return undefined;
    try {
      const attempt = await localClient.trySearchForFacetValues(
        requests as unknown as readonly { params?: Record<string, unknown> }[],
      );
      if (!attempt.handled) {
        state.localReady = false;
        setStatus("fallback", state.generation);
        return undefined;
      }
      setLastError(false, state.generation);
      setStatus("local", state.generation);
      return attempt.result as unknown as readonly FacetResult[];
    } catch (error) {
      console.error("Local course facet search unavailable:", error);
      state.localReady = false;
      setStatus("fallback", state.generation);
      return undefined;
    }
  };

  const search: InstantSearchSearchClient["search"] = async <TObject>(
    requests: SearchRequests,
  ) => {
    const state = startRequest(requests);
    if (state.localReady) {
      const localResult = await tryLocalSearch<TObject>(requests, state);
      if (localResult) return localResult;
    } else {
      warmUpLocalSearch(requests, state);
    }

    try {
      const results = await Promise.all(
        requests.map(async (request) => {
          const values = getSearchParams(request.params);
          const zeroHitsPerPage = values.hitsPerPage === 0;
          const response = await fetchFallback<SearchResult<TObject>>(
            fallbackUrl(request, zeroHitsPerPage ? 1 : undefined),
            fallbackFetch,
          );
          return zeroHitsPerPage
            ? { ...response, hits: [], hitsPerPage: 0, nbPages: 0 }
            : response;
        }),
      );
      setLastError(false, state.generation);
      markFallbackDisplayed(state);
      return { results };
    } catch (error) {
      console.error("Course search fallback failed:", error);
      setLastError(true, state.generation);
      setStatus("fallback", state.generation);
      throw error;
    }
  };

  const searchForFacetValues: SearchClientSearchForFacetValues = async (
    requests: FacetSearchRequests,
  ) => {
    const state = startRequest(requests);
    if (state.localReady) {
      const localResult = await tryLocalFacetSearch(requests, state);
      if (localResult) return localResult;
    } else {
      warmUpLocalSearch(requests, state);
    }

    try {
      const results = await Promise.all(
        requests.map((request) =>
          fetchFallback<FacetResult>(fallbackFacetUrl(request), fallbackFetch),
        ),
      );
      setLastError(false, state.generation);
      markFallbackDisplayed(state);
      return results;
    } catch (error) {
      console.error("Course search fallback failed:", error);
      setLastError(true, state.generation);
      setStatus("fallback", state.generation);
      throw error;
    }
  };

  return {
    search,
    searchForFacetValues,
    retry: () => localClient?.clear() ?? Promise.resolve(),
    getStatus: () => status,
    getVersion: () => version,
    getCourseText: (rawId) => localClient?.getText(rawId),
    hasError: () => lastError,
    subscribeLocalReady: (listener) => {
      localReadyListeners.add(listener);
      return () => localReadyListeners.delete(listener);
    },
    prefetch: (semester) =>
      localClient?.prefetch(semester) ?? Promise.resolve(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/**
 * Fill a rendered hit with syllabus text the local engine loaded after serving
 * it. Returns the hit itself when there is nothing newer, so memoized rows keep
 * their identity.
 */
export const withCourseText = <
  T extends {
    raw_id: string;
    brief?: string | null;
    keywords?: string[] | null;
  },
>(
  hit: T,
  searchClient: Pick<ResilientSearchClient, "getCourseText">,
): T => {
  const text = searchClient.getCourseText(hit.raw_id);
  const syllabus = cleanSyllabusFields({
    brief: text?.brief ?? hit.brief,
    keywords: text?.keywords ?? hit.keywords,
  });
  if (
    hit.brief === syllabus.brief &&
    JSON.stringify(hit.keywords) === JSON.stringify(syllabus.keywords)
  )
    return hit;
  return { ...hit, brief: syllabus.brief, keywords: syllabus.keywords };
};
