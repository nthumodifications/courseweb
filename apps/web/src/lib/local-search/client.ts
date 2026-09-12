import {
  LocalSearchEngine,
  semesterFromRequest,
  type LocalSearchEngineOptions,
  type LocalSearchRequest,
  type LocalSearchResult,
  type LocalFacetResult,
} from "./engine";

export type LocalSearchAttempt<T> =
  | { handled: true; result: T }
  | { handled: false };

export type LocalSearchClientOptions = LocalSearchEngineOptions & {
  engine?: LocalSearchEngine;
  defaultSemester?: string;
};

export type LocalSearchClient = {
  trySearch: (
    requests: readonly LocalSearchRequest[],
  ) => Promise<LocalSearchAttempt<{ results: LocalSearchResult[] }>>;
  trySearchForFacetValues: (
    requests: readonly LocalSearchRequest[],
  ) => Promise<LocalSearchAttempt<readonly LocalFacetResult[]>>;
  getStatus: () => ReturnType<LocalSearchEngine["getStatus"]>;
  subscribe: (listener: () => void) => () => void;
  clear: (semester?: string) => Promise<void>;
};

const uniqueSemester = (
  requests: readonly LocalSearchRequest[],
  defaultSemester?: string,
) => {
  const semesters = requests.map((request) =>
    semesterFromRequest(request, defaultSemester),
  );
  if (semesters.some((semester) => !semester)) return undefined;
  const first = semesters[0];
  return semesters.every((semester) => semester === first) ? first : undefined;
};

/**
 * Adapter used by the resilient client. It returns handled:false for
 * cross-semester, unrefined, or manifest-unavailable requests so the existing
 * remote chain can remain the fallback tier.
 */
export const createLocalSearchClient = (
  options: LocalSearchClientOptions = {},
): LocalSearchClient => {
  const engine = options.engine ?? new LocalSearchEngine(options);
  const defaultSemester =
    options.defaultSemester ?? engine.getDefaultSemester();

  return {
    async trySearch(requests) {
      const semester = uniqueSemester(requests, defaultSemester);
      if (!semester) return { handled: false };
      const results = await Promise.all(
        requests.map((request) => engine.search(semester, request)),
      );
      return { handled: true, result: { results } };
    },
    async trySearchForFacetValues(requests) {
      const semester = uniqueSemester(requests, defaultSemester);
      if (!semester) return { handled: false };
      const results = await Promise.all(
        requests.map((request) =>
          engine.searchForFacetValues(semester, request),
        ),
      );
      return { handled: true, result: results };
    },
    getStatus: engine.getStatus,
    subscribe: engine.subscribe,
    clear: engine.clear.bind(engine),
  };
};

export { LocalSearchEngine } from "./engine";
export * from "./projection";
export * from "./time-mask";
export * from "./tokenizer";
export * from "./filters";
export * from "./cache";
export type { SearchWorker } from "./worker-protocol";
