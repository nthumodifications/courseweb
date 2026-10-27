import {
  LocalSearchEngine,
  MissingLocalSearchChunkError,
  semesterFromRequest,
  type LocalSearchEngineOptions,
  type LocalSearchRequest,
  type LocalSearchResult,
  type LocalFacetResult,
} from "./engine";
import { parseCourseCodeQuery } from "./tokenizer";

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
  getSemesterFor: (
    requests: readonly LocalSearchRequest[],
  ) => string | null | undefined;
  isEligibleFor: (requests: readonly LocalSearchRequest[]) => boolean;
  isReadyFor: (requests: readonly LocalSearchRequest[]) => boolean;
  warmUpFor: (
    requests: readonly LocalSearchRequest[],
  ) => Promise<boolean>;
  getText: LocalSearchEngine["getText"];
  subscribe: (listener: () => void) => () => void;
  subscribeReady: (listener: (semester: string) => void) => () => void;
  prefetch: (semester?: string) => Promise<void>;
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

const isEligibleRequest = (
  requests: readonly LocalSearchRequest[],
  semester: string,
) =>
  requests.every((request) => {
    const query = String(request.params?.query ?? request.query ?? "");
    const code = parseCourseCodeQuery(query);
    return !code?.semester || code.semester === semester;
  });

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
    getSemesterFor: (requests) => uniqueSemester(requests, defaultSemester),
    isEligibleFor: (requests) => {
      const semester = uniqueSemester(requests, defaultSemester);
      return Boolean(semester && isEligibleRequest(requests, semester));
    },
    async trySearch(requests) {
      const semester = uniqueSemester(requests, defaultSemester);
      if (!semester || !isEligibleRequest(requests, semester))
        return { handled: false };
      try {
        const results = await Promise.all(
          requests.map((request) => engine.search(semester, request)),
        );
        return { handled: true, result: { results } };
      } catch (error) {
        if (error instanceof MissingLocalSearchChunkError)
          return { handled: false };
        throw error;
      }
    },
    async trySearchForFacetValues(requests) {
      const semester = uniqueSemester(requests, defaultSemester);
      if (!semester) return { handled: false };
      try {
        const results = await Promise.all(
          requests.map((request) =>
            engine.searchForFacetValues(semester, request),
          ),
        );
        return { handled: true, result: results };
      } catch (error) {
        if (error instanceof MissingLocalSearchChunkError)
          return { handled: false };
        throw error;
      }
    },
    getStatus: engine.getStatus,
    isReadyFor: (requests) => {
      const semester = uniqueSemester(requests, defaultSemester);
      return Boolean(
        semester &&
          isEligibleRequest(requests, semester) &&
          engine.isReady(semester),
      );
    },
    async warmUpFor(requests) {
      const semester = uniqueSemester(requests, defaultSemester);
      if (!semester || !isEligibleRequest(requests, semester)) return false;
      try {
        await engine.prefetch(semester);
        return true;
      } catch (error) {
        if (error instanceof MissingLocalSearchChunkError) return false;
        throw error;
      }
    },
    getText: engine.getText,
    subscribe: engine.subscribe,
    subscribeReady: engine.subscribeReady,
    prefetch: (semester = defaultSemester) =>
      semester ? engine.prefetch(semester) : Promise.resolve(),
    clear: engine.clear.bind(engine),
  };
};

export { LocalSearchEngine } from "./engine";
export * from "./projection";
export * from "./time-mask";
export * from "./tokenizer";
export * from "./ranking";
export * from "./filters";
export * from "./cache";
export type { SearchWorker } from "./worker-protocol";
