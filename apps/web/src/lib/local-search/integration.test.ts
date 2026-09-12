import { Hono } from "hono";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  createSearchChunkApp,
  type SearchRowLoader,
} from "../../../../../services/api/src/search-chunk";
import {
  createSearchFallbackApp,
  getCourseHit,
} from "../../../../../services/api/src/search-fallback";
import type { CourseRow } from "../../../../../services/api/src/search-projection";
import { LocalSearchEngine, MemorySearchChunkCache } from "./client";
import { buildFlexSearchIndex } from "./flexsearch-index";
import type { SearchWorker, WorkerRequest } from "./worker-protocol";

const fixtureRows = (await Bun.file(
  new URL(
    "../../../../../services/api/src/fixtures/search-courses.real.json",
    import.meta.url,
  ),
).json()) as CourseRow[];

let currentRows = fixtureRows;

const loadChunkRows: SearchRowLoader = async (_context, semester) =>
  currentRows.filter((row) => !semester || row.semester === semester);

const loadFallbackCourses = async () => currentRows.map(getCourseHit);

const app = new Hono()
  .route("/search/chunk", createSearchChunkApp(loadChunkRows))
  .route("/search/fallback", createSearchFallbackApp(loadFallbackCourses));

type AppRequest = {
  url: string;
  init?: RequestInit;
  status: number;
  etag: string | null;
};

const appRequests: AppRequest[] = [];

const appFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const response = await app.request(url, init);
  appRequests.push({
    url,
    init,
    status: response.status,
    etag: response.headers.get("etag"),
  });
  return response;
};

class InlineFlexSearchWorker implements SearchWorker {
  onmessage: SearchWorker["onmessage"] = null;
  onerror: SearchWorker["onerror"] = null;
  private index: ReturnType<typeof buildFlexSearchIndex> | undefined;

  postMessage(message: WorkerRequest) {
    queueMicrotask(() => {
      try {
        if (message.type === "build") {
          this.index = buildFlexSearchIndex(message.documents);
          this.onmessage?.({
            data: { type: "built", count: message.documents.length },
          } as MessageEvent);
          return;
        }
        if (!this.index) throw new Error("Inline index is not built");
        this.onmessage?.({
          data: {
            type: "results",
            requestId: message.requestId,
            ids: this.index.search(message.query, message.limit).map(String),
          },
        } as MessageEvent);
      } catch (error) {
        this.onerror?.({
          message:
            error instanceof Error ? error.message : "Inline index failed",
        } as ErrorEvent);
      }
    });
  }

  terminate() {}
}

const facetNames = [
  "courseLevel",
  "cross_discipline",
  "department",
  "first_specialization",
  "for_class",
  "ge_target",
  "ge_type",
  "language",
  "second_specialization",
  "semester",
  "separate_times",
  "tags",
  "venues",
] as const;

const searchParams = (overrides: Record<string, unknown> = {}) => ({
  query: "Environmental",
  page: 0,
  hitsPerPage: 20,
  facetFilters: [["semester:11510"], ["department:AES"]],
  facets: [...facetNames],
  maxValuesPerFacet: 100,
  ...overrides,
});

const searchRequest = (overrides: Record<string, unknown> = {}) => ({
  indexName: "nthu_courses",
  params: searchParams(overrides),
});

const fallbackRequest = async (overrides: Record<string, unknown> = {}) => {
  const values = searchParams(overrides);
  const query = new URLSearchParams({
    q: String(values.query),
    page: String(values.page),
    hitsPerPage: String(values.hitsPerPage),
    facetFilters: JSON.stringify(values.facetFilters),
    facets: JSON.stringify(values.facets),
    maxValuesPerFacet: String(values.maxValuesPerFacet),
  });
  const response = await app.request(`/search/fallback?${query}`);
  expect(response.status).toBe(200);
  return (await response.json()) as {
    success: boolean;
    data: {
      hits: Array<Record<string, unknown>>;
      nbHits: number;
      nbPages: number;
      hitsPerPage: number;
      facets: Record<string, Record<string, number>>;
    };
  };
};

const createEngine = (cache = new MemorySearchChunkCache()) =>
  new LocalSearchEngine({
    baseUrl: "",
    cache,
    fetch: appFetch,
    workerFactory: () => new InlineFlexSearchWorker(),
    defaultSemester: "11510",
  });

const chunkRequests = () =>
  appRequests.filter((request) => request.url.includes("/search/chunk/11510"));

describe("local search against the real in-process API", () => {
  beforeEach(() => {
    currentRows = fixtureRows;
    appRequests.length = 0;
  });

  test("loads the real manifest and chunk envelope and returns correct hits", async () => {
    const manifestResponse = await app.request("/search/chunk/manifest");
    const manifest = (await manifestResponse.json()) as {
      success: boolean;
      data: {
        schemaVersion: number;
        semesters: Array<{ semester: string; rowCount: number }>;
      };
    };
    expect(manifestResponse.status).toBe(200);
    expect(manifest.success).toBe(true);
    expect(manifest.data.schemaVersion).toBe(1);
    expect(manifest.data.semesters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semester: "11510",
          rowCount: 106,
        }),
      ]),
    );

    const chunkResponse = await app.request("/search/chunk/11510");
    const chunk = (await chunkResponse.json()) as {
      success: boolean;
      data: {
        schemaVersion: number;
        semester: string;
        courses: Array<Record<string, unknown>>;
      };
    };
    expect(chunkResponse.status).toBe(200);
    expect(chunk.success).toBe(true);
    expect(chunk.data).toMatchObject({
      schemaVersion: 1,
      semester: "11510",
    });
    expect(chunk.data.courses).toHaveLength(106);
    expect(chunk.data.courses[0]).toMatchObject({
      objectID: "11510AES 450100",
      courseLevel: "4000",
      separate_times: ["W2", "W3", "W4"],
      for_class: ["分環所115M", "原科院學士班112B"],
    });

    const engine = createEngine();
    const result = await engine.search("11510", searchRequest());
    const expectedIds = fixtureRows
      .filter(
        (row) =>
          row.semester === "11510" &&
          row.department === "AES" &&
          row.name_en.toLocaleLowerCase().includes("environmental"),
      )
      .map((row) => row.raw_id);

    expect(result.nbHits).toBe(expectedIds.length);
    expect(new Set(result.hits.map((hit) => hit.objectID))).toEqual(
      new Set(expectedIds),
    );
    expect(result.hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectID: "11510AES 450100",
          name_en: "Environmental Microbiology",
          courseLevel: "4000",
        }),
      ]),
    );
    expect(appRequests.map((request) => request.status)).toEqual([200, 200]);
  });

  test("serves a cached chunk after the real server returns 304", async () => {
    const cache = new MemorySearchChunkCache();
    const engine = createEngine(cache);
    const first = await engine.search("11510", searchRequest());
    const firstChunk = chunkRequests().at(-1);
    const firstEtag = firstChunk?.etag;
    expect(firstChunk?.status).toBe(200);
    if (!firstEtag) throw new Error("real chunk response did not include ETag");

    await engine.clear("11510");
    const requestStart = appRequests.length;
    const second = await engine.search("11510", searchRequest());
    const revalidation = chunkRequests().at(-1);
    const revalidationHeader = new Headers(revalidation?.init?.headers).get(
      "if-none-match",
    );

    expect(second.hits.map((hit) => hit.objectID).sort()).toEqual(
      first.hits.map((hit) => hit.objectID).sort(),
    );
    expect(
      appRequests.slice(requestStart).map((request) => request.status),
    ).toEqual([200, 304]);
    expect(revalidationHeader).toBe(firstEtag);
    expect(revalidation?.status).toBe(304);
    expect(cache.entries()).toHaveLength(1);
  });

  test("invalidates the cached chunk when the real content hash changes", async () => {
    const cache = new MemorySearchChunkCache();
    const engine = createEngine(cache);
    await engine.search("11510", searchRequest());
    const oldKey = cache.entries()[0]?.[0];
    const oldChunk = chunkRequests().at(-1);

    await engine.clear("11510");
    currentRows = fixtureRows.map((row) =>
      row.raw_id === "11510AES 450100"
        ? { ...row, name_en: `${row.name_en} (changed)` }
        : row,
    );
    const requestStart = appRequests.length;
    const changed = await engine.search("11510", searchRequest());
    const changedChunk = chunkRequests().at(-1);
    const changedChunkRequest = appRequests
      .slice(requestStart)
      .find((request) => request.url.endsWith("/search/chunk/11510"));

    expect(changed.nbHits).toBe(5);
    expect(changed.hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectID: "11510AES 450100",
          name_en: "Environmental Microbiology (changed)",
        }),
      ]),
    );
    expect(changedChunk?.status).toBe(200);
    expect(changedChunk?.etag).not.toBe(oldChunk?.etag);
    expect(
      new Headers(changedChunkRequest?.init?.headers).get("if-none-match"),
    ).toBe(null);
    expect(cache.entries()).toHaveLength(1);
    expect(cache.entries()[0]?.[0]).not.toBe(oldKey);
  });

  test("keeps hitsPerPage=0 local while matching fallback facet counts", async () => {
    const engine = createEngine();
    const local = await engine.search(
      "11510",
      searchRequest({ hitsPerPage: 0 }),
    );
    const fallback = await fallbackRequest({ hitsPerPage: 0 });

    expect(local.hits).toEqual([]);
    expect(local.hitsPerPage).toBe(0);
    expect(local.nbPages).toBe(0);
    expect(local.nbHits).toBeGreaterThan(0);
    expect(fallback.success).toBe(true);
    expect(fallback.data.hits).toEqual([]);
    expect(fallback.data.hitsPerPage).toBe(0);
    expect(fallback.data.nbPages).toBe(0);
    expect(fallback.data.nbHits).toBe(local.nbHits);
    expect(local.facets).toEqual(fallback.data.facets);
  });
});
