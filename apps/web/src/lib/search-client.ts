import algoliasearch from "algoliasearch/lite";
import type { SearchClient as AlgoliaSearchClient } from "algoliasearch/lite";
import {
  createLocalSearchClient,
  type LocalSearchClient,
  type LocalSearchClientOptions,
} from "./local-search/client";
import { lastSemester } from "@courseweb/shared";

export type SearchBackend =
  | "local"
  | "local-loading"
  | "primary"
  | "backup"
  | "fallback";
type RemoteBackend = Exclude<SearchBackend, "local" | "local-loading">;

export type ResilientSearchClient = Pick<
  AlgoliaSearchClient,
  "search" | "searchForFacetValues"
> & {
  getStatus: () => SearchBackend;
  hasError: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

type SearchRequests = Parameters<AlgoliaSearchClient["search"]>[0];
type FacetSearchRequests = Parameters<
  AlgoliaSearchClient["searchForFacetValues"]
>[0];
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

export type ResilientSearchClientOptions = {
  /** Test/embedded override for the local chunk loader and cache. */
  localSearch?: LocalSearchClientOptions | false;
  /** Test/embedded override for the already-configured remote chain. */
  remoteClient?: AlgoliaSearchClient;
};

const STORAGE_KEY = "nthumods-search-backend";
const FALLBACK_RETRY_MS = 5 * 60 * 1000;
const viteEnv =
  (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env ?? {};

const API_BASE = (viteEnv.VITE_COURSEWEB_API_URL ?? "").replace(/\/$/, "");

type PersistedState = {
  backend: RemoteBackend;
  retryAt?: number;
  failedBackend?: Exclude<RemoteBackend, "fallback">;
  consecutiveFailures?: number;
};

let persistedState: PersistedState | undefined;
const listeners = new Set<() => void>();

const readPersistedState = () => {
  if (persistedState) return persistedState;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        parsed.backend === "primary" ||
        parsed.backend === "backup" ||
        parsed.backend === "fallback"
      ) {
        persistedState = {
          backend: parsed.backend,
          retryAt: parsed.retryAt,
          failedBackend: parsed.failedBackend,
          consecutiveFailures: parsed.consecutiveFailures,
        };
      }
    }
  } catch {
    // Private browsing and test environments may not expose sessionStorage.
  }
  return persistedState;
};

const setPersistedState = (
  backend: RemoteBackend,
  retryAt?: number,
  failedBackend?: Exclude<RemoteBackend, "fallback">,
  consecutiveFailures?: number,
) => {
  persistedState = {
    backend,
    retryAt,
    failedBackend,
    consecutiveFailures,
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch {
    // The in-memory state still protects the current page when storage fails.
  }
  listeners.forEach((listener) => listener());
};

const getActiveState = () => {
  return readPersistedState();
};

type AlgoliaFailureKind = "immediate" | "transient" | "bug";

const getAlgoliaStatus = (error: unknown) => {
  const candidate = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  return (
    candidate?.status ?? candidate?.statusCode ?? candidate?.response?.status
  );
};

const classifyAlgoliaError = (error: unknown): AlgoliaFailureKind => {
  const candidate = error as {
    name?: string;
    message?: string;
    response?: { message?: string; body?: { message?: string } | string };
  };
  const message = [
    error instanceof Error ? error.message : undefined,
    typeof error === "string" ? error : undefined,
    candidate?.message,
    candidate?.response?.message,
    typeof candidate?.response?.body === "string"
      ? candidate.response.body
      : candidate?.response?.body?.message,
  ]
    .filter(Boolean)
    .join(" ");
  const status = getAlgoliaStatus(error);
  if (
    status === 402 ||
    status === 429 ||
    (status === 403 && /blocked/i.test(message)) ||
    /quota|record limit|too many requests|\bplan\b|unblock/i.test(message)
  ) {
    return "immediate";
  }

  return candidate?.name === "TypeError" ||
    candidate?.name === "TimeoutError" ||
    candidate?.name === "AbortError" ||
    /network|timeout|timed out|failed to fetch|fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET/i.test(
      message,
    )
    ? "transient"
    : "bug";
};

const describeAlgoliaError = (error: unknown) => ({
  status: getAlgoliaStatus(error) ?? "network-or-unknown",
  kind: classifyAlgoliaError(error),
});

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

const fetchFallback = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  const payload = (await response.json()) as FallbackPayload<T>;
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

const emptySearchResponse = <T>(request: {
  params?: unknown;
}): SearchResult<T> => {
  const params = getSearchParams(request.params);
  const page = typeof params.page === "number" ? params.page : 0;
  const hitsPerPage =
    typeof params.hitsPerPage === "number" ? params.hitsPerPage : 20;
  const query = typeof params.query === "string" ? params.query : "";
  return {
    hits: [],
    nbHits: 0,
    page,
    nbPages: 0,
    hitsPerPage,
    processingTimeMS: 0,
    exhaustiveNbHits: true,
    query,
    params: "",
    facets: {},
  };
};

const emptyFacetResponse = (): FacetResult => ({
  facetHits: [],
  exhaustiveFacetsCount: true,
});

const configuredClients = () => {
  const clients: Array<{
    backend: Exclude<RemoteBackend, "fallback">;
    client: AlgoliaSearchClient;
  }> = [];
  // Bound every tier explicitly. The client defaults to a 2s connect and 5s
  // read timeout, so one unreachable application can hold up the first search
  // of a session for seconds before the next tier is even tried.
  const timeouts = { connect: 1, read: 2, write: 5 };
  const primaryAppId = viteEnv.VITE_ALGOLIA_APP_ID;
  const primaryKey = viteEnv.VITE_ALGOLIA_SEARCH_KEY;
  const backupAppId = viteEnv.VITE_ALGOLIA_BACKUP_APP_ID;
  const backupKey = viteEnv.VITE_ALGOLIA_BACKUP_SEARCH_KEY;

  if (primaryAppId?.trim() && primaryKey?.trim()) {
    clients.push({
      backend: "primary",
      client: algoliasearch(primaryAppId.trim(), primaryKey.trim(), {
        timeouts,
      }),
    });
  }
  if (
    backupAppId?.trim() &&
    backupKey?.trim() &&
    backupAppId.trim() !== primaryAppId?.trim()
  ) {
    clients.push({
      backend: "backup",
      client: algoliasearch(backupAppId.trim(), backupKey.trim(), {
        timeouts,
      }),
    });
  }
  return clients;
};

export const createResilientSearchClient = (
  options: ResilientSearchClientOptions = {},
): ResilientSearchClient => {
  const clients = options.remoteClient
    ? [{ backend: "primary" as const, client: options.remoteClient }]
    : configuredClients();
  const localClient: LocalSearchClient | undefined =
    options.localSearch === false
      ? undefined
      : createLocalSearchClient({
          defaultSemester: lastSemester.id,
          ...(options.localSearch ?? {}),
        });
  const clientByBackend = options.remoteClient
    ? new Map([["primary", options.remoteClient] as const])
    : new Map(clients.map((entry) => [entry.backend, entry.client] as const));
  let lastError = false;
  let localStatus:
    | Extract<SearchBackend, "local" | "local-loading">
    | undefined;

  localClient?.subscribe(() => {
    const status = localClient.getStatus();
    localStatus =
      status === "loading"
        ? "local-loading"
        : status === "ready"
          ? "local"
          : undefined;
    listeners.forEach((listener) => listener());
  });

  const clearLocalStatus = () => {
    if (localStatus === undefined) return;
    localStatus = undefined;
    listeners.forEach((listener) => listener());
  };

  const setLastError = (value: boolean) => {
    if (lastError === value) return;
    lastError = value;
    listeners.forEach((listener) => listener());
  };

  const setWorkingState = (backend: RemoteBackend) =>
    setPersistedState(
      backend,
      backend === "primary" ? undefined : Date.now() + FALLBACK_RETRY_MS,
    );

  const setFailureState = (
    backend: Exclude<RemoteBackend, "fallback">,
    consecutiveFailures: number,
  ) =>
    setPersistedState(
      backend,
      backend === "primary" ? undefined : Date.now() + FALLBACK_RETRY_MS,
      backend,
      consecutiveFailures,
    );

  const setFallback = () =>
    setPersistedState("fallback", Date.now() + FALLBACK_RETRY_MS);

  const getConsecutiveFailures = (
    backend: Exclude<RemoteBackend, "fallback">,
  ) => {
    const state = getActiveState();
    return state?.failedBackend === backend
      ? (state.consecutiveFailures ?? 0)
      : 0;
  };

  const runWithFailover = async <T>(
    operation: (client: AlgoliaSearchClient) => Promise<T>,
    fallback: () => Promise<T>,
    empty: () => Promise<T>,
  ): Promise<T> => {
    const activeState = getActiveState();
    const runEmpty = () => empty();
    const runFallback = async () => {
      try {
        return await fallback();
      } catch (error) {
        console.error("Search fallback failed:", error);
        setLastError(true);
        return runEmpty();
      }
    };

    const attempt = async (
      backend: Exclude<RemoteBackend, "fallback">,
    ): Promise<
      | { ok: true; result: T }
      | {
          ok: false;
          kind: AlgoliaFailureKind;
          consecutiveFailures: number;
        }
    > => {
      const client = clientByBackend.get(backend);
      if (!client) {
        return { ok: false, kind: "immediate", consecutiveFailures: 2 };
      }

      try {
        const result = await operation(client);
        setLastError(false);
        setWorkingState(backend);
        return { ok: true, result };
      } catch (error) {
        const kind = classifyAlgoliaError(error);
        const consecutiveFailures = getConsecutiveFailures(backend) + 1;
        console.error("Algolia search tier failed:", {
          backend,
          ...describeAlgoliaError(error),
          consecutiveFailures,
        });
        return { ok: false, kind, consecutiveFailures };
      }
    };

    const runCurrentBackend = async (
      backend: Exclude<RemoteBackend, "fallback">,
    ) => {
      const result = await attempt(backend);
      if (result.ok) return result.result;
      if (result.kind === "bug") {
        setLastError(true);
        setWorkingState(backend);
        return runEmpty();
      }
      if (result.kind === "transient" && result.consecutiveFailures < 2) {
        setFailureState(backend, result.consecutiveFailures);
        return runEmpty();
      }

      if (backend === "primary" && clientByBackend.has("backup")) {
        const backupResult = await attempt("backup");
        if (backupResult.ok) return backupResult.result;
        if (
          backupResult.kind === "transient" &&
          backupResult.consecutiveFailures < 2
        ) {
          setFailureState("backup", backupResult.consecutiveFailures);
          return runEmpty();
        }
        if (backupResult.kind === "bug") {
          setLastError(true);
          setWorkingState("primary");
          return runEmpty();
        }
      }

      setFallback();
      return runFallback();
    };

    if (!activeState) {
      const firstBackend = clients[0]?.backend;
      if (!firstBackend) {
        setFallback();
        return runFallback();
      }
      return runCurrentBackend(firstBackend);
    }

    if (activeState.backend === "fallback") {
      if ((activeState.retryAt ?? 0) > Date.now()) return runFallback();

      const primaryResult = clientByBackend.has("primary")
        ? await attempt("primary")
        : undefined;
      if (primaryResult?.ok) return primaryResult.result;
      if (primaryResult?.kind === "bug") {
        setLastError(true);
        setWorkingState("fallback");
        return runEmpty();
      }

      const canTryBackup =
        primaryResult === undefined ||
        primaryResult.kind === "immediate" ||
        (primaryResult.kind === "transient" &&
          primaryResult.consecutiveFailures >= 2);
      if (canTryBackup && clientByBackend.has("backup")) {
        const backupResult = await attempt("backup");
        if (backupResult.ok) return backupResult.result;
        if (
          backupResult.kind === "transient" &&
          backupResult.consecutiveFailures < 2
        ) {
          setFailureState("backup", backupResult.consecutiveFailures);
          return runEmpty();
        }
        if (backupResult.kind === "bug") {
          setLastError(true);
          setWorkingState("fallback");
          return runEmpty();
        }
      } else if (primaryResult?.kind === "transient") {
        setPersistedState(
          "fallback",
          Date.now() + FALLBACK_RETRY_MS,
          "primary",
          primaryResult.consecutiveFailures,
        );
        return runFallback();
      }

      setFallback();
      return runFallback();
    }

    if (
      activeState.backend === "backup" &&
      (activeState.retryAt ?? 0) <= Date.now() &&
      clientByBackend.has("primary")
    ) {
      const primaryResult = await attempt("primary");
      if (primaryResult.ok) return primaryResult.result;
      if (primaryResult.kind === "bug") {
        setLastError(true);
        setWorkingState("backup");
        return runEmpty();
      }
      setWorkingState("backup");
    }

    return runCurrentBackend(activeState.backend);
  };

  const tryLocalSearch = async <TObject>(requests: SearchRequests) => {
    if (!localClient) return undefined;
    try {
      const attempt = await localClient.trySearch(
        requests as unknown as readonly { params?: Record<string, unknown> }[],
      );
      if (!attempt.handled) {
        clearLocalStatus();
        return undefined;
      }
      setLastError(false);
      localStatus = "local";
      listeners.forEach((listener) => listener());
      return attempt.result as unknown as SearchResults<TObject>;
    } catch (error) {
      // Manifest, cache, HTTP, and worker errors all deliberately fall through
      // to Algolia/Supabase. A build failure must not leave the UI frozen.
      console.error("Local course search unavailable:", error);
      clearLocalStatus();
      return undefined;
    }
  };

  const tryLocalFacetSearch = async (requests: FacetSearchRequests) => {
    if (!localClient) return undefined;
    try {
      const attempt = await localClient.trySearchForFacetValues(
        requests as unknown as readonly { params?: Record<string, unknown> }[],
      );
      if (!attempt.handled) {
        clearLocalStatus();
        return undefined;
      }
      setLastError(false);
      localStatus = "local";
      listeners.forEach((listener) => listener());
      return attempt.result as unknown as readonly FacetResult[];
    } catch (error) {
      console.error("Local course facet search unavailable:", error);
      clearLocalStatus();
      return undefined;
    }
  };

  const search: AlgoliaSearchClient["search"] = async <TObject>(
    requests: SearchRequests,
    requestOptions?: Parameters<AlgoliaSearchClient["search"]>[1],
  ) => {
    const localResult = await tryLocalSearch<TObject>(requests);
    if (localResult) return localResult;
    clearLocalStatus();
    return runWithFailover<SearchResults<TObject>>(
      (client) =>
        Promise.resolve(
          client.search<TObject>(requests, requestOptions),
        ) as Promise<SearchResults<TObject>>,
      async () => {
        let fallbackHadError = false;
        try {
          const results = await Promise.all(
            requests.map(async (request) => {
              try {
                const values = getSearchParams(request.params);
                const zeroHitsPerPage = values.hitsPerPage === 0;
                const response = await fetchFallback<SearchResult<TObject>>(
                  fallbackUrl(request, zeroHitsPerPage ? 1 : undefined),
                );
                return zeroHitsPerPage
                  ? { ...response, hits: [], hitsPerPage: 0, nbPages: 0 }
                  : response;
              } catch (error) {
                console.error("Supabase fallback search failed:", error);
                fallbackHadError = true;
                setLastError(true);
                return emptySearchResponse<TObject>(request);
              }
            }),
          );
          if (!fallbackHadError) setLastError(false);
          return { results };
        } catch (error) {
          console.error("Course search fallback failed:", error);
          setLastError(true);
          return {
            results: requests.map((request) =>
              emptySearchResponse<TObject>(request),
            ),
          };
        }
      },
      async () => ({
        results: requests.map((request) =>
          emptySearchResponse<TObject>(request),
        ),
      }),
    );
  };

  const searchForFacetValues: AlgoliaSearchClient["searchForFacetValues"] =
    async (
      requests: FacetSearchRequests,
      requestOptions?: Parameters<
        AlgoliaSearchClient["searchForFacetValues"]
      >[1],
    ) => {
      const localResult = await tryLocalFacetSearch(requests);
      if (localResult) return localResult;
      clearLocalStatus();
      return runWithFailover<readonly FacetResult[]>(
        (client) =>
          Promise.resolve(
            client.searchForFacetValues(requests, requestOptions),
          ) as Promise<readonly FacetResult[]>,
        async () => {
          let fallbackHadError = false;
          const results = await Promise.all(
            requests.map(async (request) => {
              try {
                return await fetchFallback<FacetResult>(
                  fallbackFacetUrl(request),
                );
              } catch (error) {
                console.error("Supabase fallback facet search failed:", error);
                fallbackHadError = true;
                setLastError(true);
                return emptyFacetResponse();
              }
            }),
          );
          if (!fallbackHadError) setLastError(false);
          return results;
        },
        async () => requests.map(() => emptyFacetResponse()),
      );
    };

  return {
    search,
    searchForFacetValues,
    getStatus: () =>
      localStatus ??
      getActiveState()?.backend ??
      clients[0]?.backend ??
      "fallback",
    hasError: () => lastError,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
