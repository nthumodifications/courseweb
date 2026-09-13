import {
  createIndexedDbSearchChunkCache,
  searchChunkCacheKey,
  type CachedSearchChunk,
  type SearchChunkCache,
} from "./cache";
import {
  facetValues,
  LOCAL_FACETS,
  prepareSearchRecord,
  searchableFieldValues,
  searchableText,
  type SearchProjectionRecord,
  type UnknownRecord,
} from "./projection";
import {
  compileRefinements,
  parseFilterCondition,
  type RefinementSpec,
} from "./filters";
import { searchWithoutWorker } from "./fallback-index";
import { rankLocalIdsByTerms } from "./ranking";
import {
  isCjkCharacter,
  matchesLocalQueryTerms,
  queryTerms,
  searchableLatinTokenGroups,
} from "./tokenizer";
import type {
  SearchWorker,
  WorkerDocument,
  WorkerResponse,
} from "./worker-protocol";

export type LocalSearchParams = RefinementSpec & {
  query?: string;
  page?: number;
  hitsPerPage?: number;
  facets?: string | readonly string[];
  maxValuesPerFacet?: number;
  attributesToRetrieve?: string | readonly string[];
  facetName?: string;
  facetQuery?: string;
  maxFacetHits?: number;
};

export type LocalSearchRequest = {
  indexName?: string;
  query?: string;
  params?: LocalSearchParams;
};

export type LocalSearchResult<T = SearchProjectionRecord> = {
  hits: Array<T & { objectID: string }>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
  facets: Record<string, Record<string, number>>;
};

export type LocalFacetResult = {
  facetHits: Array<{ value: string; highlighted: string; count: number }>;
  exhaustiveFacetsCount: boolean;
};

export type SearchManifestEntry = {
  id: string;
  rowCount?: number;
  maxUpdatedAt?: string | null;
  contentHash: string;
  formatVersion: string;
};

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type LocalSearchStatus = "idle" | "loading" | "ready" | "error";

export type LocalSearchEngineOptions = {
  baseUrl?: string;
  fetch?: FetchLike;
  cache?: SearchChunkCache;
  workerFactory?: () => SearchWorker | undefined;
  defaultSemester?: string;
};

type LoadedChunk = {
  records: SearchProjectionRecord[];
  index: LocalIndex;
  ids: number[];
  facetValues: string[][][];
  shortLatinPrefixes: Map<string, Set<number>>;
  shortLatinRankScores: Map<string, Map<number, number>>;
  manifest: SearchManifestEntry;
};

type LocalIndex = {
  build: (documents: WorkerDocument[]) => Promise<void>;
  search: (query: string, limit: number) => Promise<string[]>;
  dispose?: () => void;
};

type WorkerPending = {
  resolve: (value: string[]) => void;
  reject: (error: Error) => void;
};

const getEnv = () =>
  (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env ?? {};

const isSuccessful = (response: Response) =>
  response.ok || (response.status >= 200 && response.status < 300);

const defaultWorkerFactory = () => {
  if (typeof Worker === "undefined") return undefined;
  return new Worker(new URL("./index.worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as SearchWorker;
};

class WorkerIndex implements LocalIndex {
  private readonly worker: SearchWorker;
  private nextRequestId = 1;
  private built: Promise<void> | undefined;
  private readonly pending = new Map<number, WorkerPending>();
  private buildResolve: (() => void) | undefined;
  private buildReject: ((error: Error) => void) | undefined;
  private failed: Error | undefined;

  constructor(worker: SearchWorker) {
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === "built") {
        this.buildResolve?.();
        this.buildResolve = undefined;
        this.buildReject = undefined;
        return;
      }
      if (response.type === "error") {
        const error = new Error(response.message);
        if (response.requestId !== undefined) {
          const pending = this.pending.get(response.requestId);
          if (pending) {
            this.pending.delete(response.requestId);
            pending.reject(error);
          }
        } else {
          this.fail(error);
        }
        return;
      }
      const pending = this.pending.get(response.requestId);
      if (pending) {
        this.pending.delete(response.requestId);
        pending.resolve(response.ids);
      }
    };
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Local search worker failed"));
  }

  private fail(error: Error) {
    this.failed = error;
    this.buildReject?.(error);
    this.buildResolve = undefined;
    this.buildReject = undefined;
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  build(documents: WorkerDocument[]) {
    if (this.failed) return Promise.reject(this.failed);
    if (this.built) return this.built;
    this.built = new Promise<void>((resolve, reject) => {
      this.buildResolve = resolve;
      this.buildReject = reject;
      this.worker.postMessage({ type: "build", documents });
    });
    return this.built;
  }

  search(query: string, limit: number) {
    if (this.failed) return Promise.reject(this.failed);
    const requestId = this.nextRequestId++;
    return new Promise<string[]>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ type: "search", requestId, query, limit });
    });
  }

  dispose() {
    this.worker.terminate();
    this.fail(new Error("Local search worker disposed"));
  }
}

const makeMainThreadIndex = (
  records: SearchProjectionRecord[],
): LocalIndex => ({
  async build() {
    // Intentional no-op: the synchronous fallback scans only if no Worker API
    // exists (SSR/test environments), never on the measured browser path.
  },
  async search(query) {
    return searchWithoutWorker(records, query).map(String);
  },
});

const parseArrayParam = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return value ? [value] : [];
  }
};

const normalizeManifest = (payload: unknown): SearchManifestEntry[] => {
  const root = payload as UnknownRecord;
  const data = root.data as UnknownRecord;
  const schemaVersion = data?.schemaVersion ?? root.schemaVersion;
  const candidate = Array.isArray(payload)
    ? payload
    : (root.semesters ?? root.manifest ?? root.data ?? payload);
  const entries = Array.isArray(candidate)
    ? candidate
    : (candidate as UnknownRecord)?.semesters;
  if (!Array.isArray(entries))
    throw new Error("Invalid course-search manifest");
  return entries.map((entry) => {
    const value = entry as UnknownRecord;
    const id = String(value.id ?? value.semester ?? "");
    const contentHash = String(
      value.contentHash ?? value.content_hash ?? value.hash ?? "",
    );
    const formatVersion = String(
      value.formatVersion ??
        value.format_version ??
        value.version ??
        schemaVersion ??
        "1",
    );
    if (!id || !contentHash)
      throw new Error("Incomplete course-search manifest");
    const rowCount = value.rowCount ?? value.row_count;
    return {
      id,
      rowCount: typeof rowCount === "number" ? rowCount : undefined,
      maxUpdatedAt: (value.maxUpdatedAt ?? value.max_updated_at) as
        | string
        | null
        | undefined,
      contentHash,
      formatVersion,
    };
  });
};

const normalizeChunk = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = payload as UnknownRecord;
  const data = root.data as UnknownRecord;
  const candidate = [
    root.records,
    root.courses,
    root.data,
    data?.records,
    data?.courses,
  ].find(Array.isArray);
  if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  throw new Error("Invalid course-search chunk");
};

const serializeParams = (params: LocalSearchParams) => {
  const output = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    output.set(
      key,
      Array.isArray(value) || (typeof value === "object" && value !== null)
        ? JSON.stringify(value)
        : String(value),
    );
  }
  return output.toString();
};

const requestedFacetNames = (value: unknown) => {
  const facets = parseArrayParam(value);
  return facets.includes("*") ? undefined : facets;
};

const maxFacetValues = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const hitAttributes = (record: SearchProjectionRecord, value: unknown) => {
  const requested = parseArrayParam(value);
  if (!requested.length || requested.includes("*")) return { ...record };
  const hit: UnknownRecord = { objectID: record.objectID };
  for (const attribute of requested) {
    if (attribute in record) hit[attribute] = record[attribute];
  }
  return hit;
};

/** Return one explicit semester only; multiple semesters must stay remote. */
export const semesterFromRequest = (
  request: LocalSearchRequest,
  defaultSemester?: string,
) => {
  const params = request.params ?? {};
  let rawFacetFilters: unknown = params.facetFilters;
  if (typeof rawFacetFilters === "string") {
    try {
      rawFacetFilters = JSON.parse(rawFacetFilters);
    } catch {
      rawFacetFilters = [rawFacetFilters];
    }
  }
  const groups = Array.isArray(rawFacetFilters)
    ? rawFacetFilters.map((group) => (Array.isArray(group) ? group : [group]))
    : [];
  const semesters = groups
    .flatMap((group) => group)
    .map((condition) => parseFilterCondition(String(condition)))
    .filter(
      (condition) =>
        condition?.attribute === "semester" &&
        !condition.negated &&
        (condition.operator === ":" || condition.operator === "="),
    )
    .map((condition) => condition!.value);
  const filterMatches =
    typeof params.filters === "string"
      ? [
          ...params.filters.matchAll(
            /(?:^|\s)semester\s*(?::|=)\s*([^\s)]+)/gi,
          ),
        ].map((match) => match[1].replace(/^['"]|['"]$/g, ""))
      : [];
  const all = [...new Set([...semesters, ...filterMatches])];
  return all.length === 1 ? all[0] : all.length === 0 ? defaultSemester : null;
};

const workerIndexFor = (
  records: SearchProjectionRecord[],
  factory: () => SearchWorker | undefined,
) => {
  const worker = factory();
  return worker ? new WorkerIndex(worker) : makeMainThreadIndex(records);
};

const buildShortLatinPrefixIndex = (
  records: readonly SearchProjectionRecord[],
) => {
  const prefixes = new Map<string, Set<number>>();
  const rankScores = new Map<string, Map<number, number>>();
  const setRankScore = (prefix: string, id: number, score: number) => {
    const scores = rankScores.get(prefix) ?? new Map<number, number>();
    scores.set(id, Math.max(scores.get(id) ?? 0, score));
    rankScores.set(prefix, scores);
  };
  const addRankPrefixes = (
    value: string,
    id: number,
    score: (prefix: string) => number,
  ) => {
    for (let length = 1; length <= Math.min(2, value.length); length += 1) {
      const prefix = value.slice(0, length);
      setRankScore(prefix, id, score(prefix));
    }
  };
  for (const [id, record] of records.entries()) {
    const values = searchableFieldValues(record);
    const latinGroups = searchableLatinTokenGroups(record);
    for (const token of latinGroups.flat()) {
      if ([...token].some(isCjkCharacter)) continue;
      for (let length = 1; length <= Math.min(3, token.length); length += 1) {
        const prefix = token.slice(0, length);
        const ids = prefixes.get(prefix) ?? new Set<number>();
        ids.add(id);
        prefixes.set(prefix, ids);
      }
    }

    for (const value of values[2] ?? []) {
      addRankPrefixes(value, id, () => 95_000);
    }
    for (const value of values[3] ?? []) {
      addRankPrefixes(value, id, () => 95_000);
    }
    for (const value of values[4] ?? []) {
      addRankPrefixes(value, id, (prefix) =>
        value === prefix ? 120_000 : 100_000,
      );
    }
    for (const field of [0, 1, 5, 6]) {
      const score = field === 0 || field === 1 ? [90_000, 88_000] : [80_000, 78_000];
      for (const token of latinGroups[field] ?? []) {
        addRankPrefixes(token, id, (prefix) =>
          token === prefix ? score[0]! : score[1]!,
        );
      }
    }
  }
  return { prefixes, rankScores };
};

const buildFacetValueRows = (records: readonly SearchProjectionRecord[]) =>
  records.map((record) =>
    LOCAL_FACETS.map((facet) => {
      const values = facetValues(record, facet);
      return values.length < 2 ? values : [...new Set(values)];
    }),
  );

const localFacetIndex = new Map(
  LOCAL_FACETS.map((facet, index) => [facet, index] as const),
);

export class LocalSearchEngine {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly cache: SearchChunkCache;
  private readonly workerFactory: () => SearchWorker | undefined;
  private readonly chunks = new Map<string, Promise<LoadedChunk>>();
  private readonly failedSemesters = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private status: LocalSearchStatus = "idle";
  private readonly defaultSemester?: string;

  constructor(options: LocalSearchEngineOptions = {}) {
    const env = getEnv();
    this.baseUrl = (
      options.baseUrl ??
      env.VITE_COURSEWEB_API_URL ??
      ""
    ).replace(/\/$/, "");
    this.fetchFn = options.fetch ?? fetch;
    this.cache = options.cache ?? createIndexedDbSearchChunkCache();
    this.workerFactory = options.workerFactory ?? defaultWorkerFactory;
    this.defaultSemester = options.defaultSemester;
  }

  getStatus = () => this.status;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setStatus(status: LocalSearchStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener();
  }

  private async manifest() {
    const response = await this.fetchFn(
      `${this.baseUrl}/search/chunk/manifest`,
    );
    if (!isSuccessful(response)) {
      throw new Error(`Course-search manifest failed (${response.status})`);
    }
    return normalizeManifest(await response.json());
  }

  private async loadChunk(semester: string): Promise<LoadedChunk> {
    this.setStatus("loading");
    const manifest = (await this.manifest()).find(
      (entry) => entry.id === semester,
    );
    if (!manifest)
      throw new Error(`No local course chunk for semester ${semester}`);

    const key = searchChunkCacheKey(
      semester,
      manifest.contentHash,
      manifest.formatVersion,
    );
    const cached = await this.cache.get(key);
    if (!cached) await this.cache.deleteSemester(semester, key);

    let records: SearchProjectionRecord[];
    const response = await this.fetchFn(
      `${this.baseUrl}/search/chunk/${encodeURIComponent(semester)}`,
      cached
        ? { headers: { "If-None-Match": JSON.stringify(manifest.contentHash) } }
        : undefined,
    );
    if (response.status === 304) {
      if (!cached)
        throw new Error("Course chunk returned 304 without a cache entry");
      records = cached.records;
    } else {
      if (!isSuccessful(response)) {
        throw new Error(`Course-search chunk failed (${response.status})`);
      }
      records = normalizeChunk(await response.json()).map(prepareSearchRecord);
      if (
        manifest.rowCount !== undefined &&
        records.length !== manifest.rowCount
      ) {
        throw new Error(
          `Course-search chunk row count mismatch (${records.length}/${manifest.rowCount})`,
        );
      }
      const cacheValue: CachedSearchChunk = {
        semester,
        formatVersion: manifest.formatVersion,
        contentHash: manifest.contentHash,
        records,
      };
      await this.cache.set(key, cacheValue);
    }

    const index = workerIndexFor(records, this.workerFactory);
    await index.build(
      records.map((record, id) => ({
        id: String(id),
        text: searchableText(record),
      })),
    );
    // Pay the Latin matcher cache cost during chunk load, not the first
    // broad query (where it would look like search latency).
    const facetValueRows = buildFacetValueRows(records);
    this.setStatus("ready");
    const shortLatinIndex = buildShortLatinPrefixIndex(records);
    return {
      records,
      index,
      ids: records.map((_, id) => id),
      facetValues: facetValueRows,
      shortLatinPrefixes: shortLatinIndex.prefixes,
      shortLatinRankScores: shortLatinIndex.rankScores,
      manifest,
    };
  }

  private getChunk(semester: string) {
    const existing = this.chunks.get(semester);
    if (existing) return existing;
    const promise = this.loadChunk(semester).catch((error) => {
      // Keep the rejected promise cached. Deleting it made every later
      // keystroke retry the load, so the engine never settled on "error" and
      // the UI sat on "Preparing local course search…" indefinitely while
      // re-requesting the chunk. One failure disables the local tier for the
      // session and the remote tiers serve the query.
      this.failedSemesters.add(semester);
      this.setStatus("error");
      throw error;
    });
    this.chunks.set(semester, promise);
    return promise;
  }

  /** True once a semester's chunk has failed; callers must use a remote tier. */
  hasFailed = (semester?: string) =>
    semester === undefined
      ? this.failedSemesters.size > 0
      : this.failedSemesters.has(semester);

  private facetMaps(
    records: readonly SearchProjectionRecord[],
    ids: readonly number[],
    params: LocalSearchParams,
    facetValueRows: readonly (readonly string[][])[],
  ) {
    const requested = requestedFacetNames(params.facets);
    const names = requested ?? LOCAL_FACETS;
    const result: Record<string, Record<string, number>> = {};
    const limit = maxFacetValues(params.maxValuesPerFacet, 100);
    for (const name of names) {
      const counts = new Map<string, number>();
      const localIndex = localFacetIndex.get(name);
      for (const id of ids) {
        const values =
          localIndex === undefined
            ? new Set(facetValues(records[id], name))
            : facetValueRows[id]?.[localIndex] ?? [];
        for (const value of values) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      result[name] = Object.fromEntries(
        [...counts.entries()]
          .sort(
            (left, right) =>
              right[1] - left[1] || left[0].localeCompare(right[0]),
          )
          .slice(0, limit),
      );
    }
    return result;
  }

  async search<T = SearchProjectionRecord>(
    semester: string,
    request: LocalSearchRequest,
  ): Promise<LocalSearchResult<T>> {
    const started = performance.now();
    const chunk = await this.getChunk(semester);
    const params = request.params ?? {};
    const query = String(params.query ?? request.query ?? "");
    const page = Math.max(
      0,
      Number.isFinite(Number(params.page))
        ? Math.floor(Number(params.page))
        : 0,
    );
    const hitsPerPage =
      typeof params.hitsPerPage === "number" &&
      Number.isFinite(params.hitsPerPage)
        ? Math.max(0, Math.floor(params.hitsPerPage))
        : 20;
    const terms = queryTerms(query);
    const hasSearchTerms = terms.length > 0;
    const refinementMatcher = compileRefinements(params);
    const indexedIds: readonly (string | number)[] = hasSearchTerms
      ? await chunk.index.search(query, chunk.records.length)
      : chunk.ids;
    const shortLatinPrefix =
      terms.length === 1 &&
      terms[0]!.length <= 3 &&
      ![...terms[0]!].some(isCjkCharacter)
        ? (chunk.shortLatinPrefixes.get(terms[0]!) ?? new Set<number>())
        : undefined;
    let ids: number[];
    if (refinementMatcher.isNoop && !hasSearchTerms) {
      ids = chunk.ids;
    } else if (!hasSearchTerms) {
      ids = [];
      for (const id of chunk.ids) {
        if (refinementMatcher(chunk.records[id])) ids.push(id);
      }
    } else {
      const seenIds = new Set<number>();
      ids = [];
      for (const rawId of indexedIds) {
        const id = typeof rawId === "number" ? rawId : Number(rawId);
        if (
          !Number.isInteger(id) ||
          id < 0 ||
          id >= chunk.records.length ||
          seenIds.has(id)
        ) {
          continue;
        }
        seenIds.add(id);
        if (
          (shortLatinPrefix
            ? shortLatinPrefix.has(id)
            : matchesLocalQueryTerms(chunk.records[id], terms)) &&
          refinementMatcher(chunk.records[id])
        ) {
          ids.push(id);
        }
      }
    }
    const rankedIds = rankLocalIdsByTerms(
      chunk.records,
      ids,
      terms,
      chunk.shortLatinRankScores,
    );
    const start = page * hitsPerPage;
    const selected =
      hitsPerPage === 0 ? [] : rankedIds.slice(start, start + hitsPerPage);
    const facets = this.facetMaps(
      chunk.records,
      rankedIds,
      params,
      chunk.facetValues,
    );
    const result = {
      hits: selected.map((id) =>
        hitAttributes(chunk.records[id], params.attributesToRetrieve),
      ) as Array<T & { objectID: string }>,
      nbHits: rankedIds.length,
      page,
      nbPages:
        hitsPerPage === 0 ? 0 : Math.ceil(rankedIds.length / hitsPerPage),
      hitsPerPage,
      processingTimeMS: Math.max(0, Math.round(performance.now() - started)),
      exhaustiveNbHits: true,
      query,
      params: serializeParams(params),
      facets,
    };
    return result;
  }

  async searchForFacetValues(
    semester: string,
    request: LocalSearchRequest,
  ): Promise<LocalFacetResult> {
    const chunk = await this.getChunk(semester);
    const params = request.params ?? {};
    const facetName = String(params.facetName ?? "");
    const query = String(params.facetQuery ?? "").toLocaleLowerCase("zh-TW");
    const refinementMatcher = compileRefinements(params, facetName);
    const ids = chunk.records
      .map((_, id) => id)
      .filter((id) => refinementMatcher(chunk.records[id]));
    const counts = new Map<string, number>();
    for (const id of ids) {
      const localIndex = localFacetIndex.get(facetName);
      const values =
        localIndex === undefined
          ? new Set(facetValues(chunk.records[id], facetName))
          : chunk.facetValues[id]?.[localIndex] ?? [];
      for (const value of values) {
        if (value.toLocaleLowerCase("zh-TW").includes(query)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
    }
    const limit = maxFacetValues(params.maxFacetHits, 10);
    return {
      facetHits: [...counts.entries()]
        .sort(
          (left, right) =>
            right[1] - left[1] || left[0].localeCompare(right[0]),
        )
        .slice(0, limit)
        .map(([value, count]) => ({ value, highlighted: value, count })),
      exhaustiveFacetsCount: true,
    };
  }

  async clear(semester?: string) {
    const semesters = semester ? [semester] : [...this.chunks.keys()];
    for (const id of semesters) {
      const chunk = await this.chunks.get(id)?.catch(() => undefined);
      chunk?.index.dispose?.();
      this.chunks.delete(id);
    }
    if (!this.chunks.size) this.setStatus("idle");
  }

  getDefaultSemester() {
    return this.defaultSemester;
  }
}
