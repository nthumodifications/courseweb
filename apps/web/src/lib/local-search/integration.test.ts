import { Hono } from "hono";
import { beforeEach, describe, expect, test } from "bun:test";
import type { SearchClient as AlgoliaSearchClient } from "algoliasearch/lite";
import {
  createSearchChunkApp,
  type SearchManifestRpcRow,
  type SearchRowLoader,
  type SearchTextRowLoader,
  type SearchTextSourceRow,
} from "../../../../../services/api/src/search-chunk";
import type { SearchSourceCourse } from "../../../../../services/api/src/search-projection";
import {
  createLocalSearchClient,
  LocalSearchEngine,
  MemorySearchChunkCache,
  searchChunkCacheKey,
  searchTextCacheKey,
} from "./client";
import { createResilientSearchClient } from "../search-client";
import { buildFlexSearchIndex } from "./flexsearch-index";
import type { SearchWorker, WorkerRequest } from "./worker-protocol";

const courseFixture = (await Bun.file(
  new URL(
    "../../../../../services/api/src/fixtures/search-courses.search.json",
    import.meta.url,
  ),
).json()) as SearchSourceCourse[];
const textFixture = (await Bun.file(
  new URL(
    "../../../../../services/api/src/fixtures/search-syllabus.search.json",
    import.meta.url,
  ),
).json()) as SearchTextSourceRow[];

let currentCourses = courseFixture;
let currentTexts = textFixture;

const manifestRows = (): SearchManifestRpcRow[] =>
  [...new Set(currentCourses.map((course) => course.semester))].map(
    (semester) => {
      const rows = currentCourses.filter(
        (course) => course.semester === semester,
      );
      return {
        semester,
        row_count: rows.length,
        max_updated_at: rows.reduce<string | null>(
          (max, row) =>
            max === null || row.updated_at > max ? row.updated_at : max,
          null,
        ),
      };
    },
  );

const loadRows: SearchRowLoader = async (_context, semester) =>
  currentCourses.filter((course) => !semester || course.semester === semester);
const loadManifest = async (_context: unknown, semester?: string) =>
  manifestRows().filter((row) => !semester || row.semester === semester);
const loadTextRows: SearchTextRowLoader = async (_context, semester) =>
  currentTexts.filter((row) => row.semester === semester);

const searchChunkApp = createSearchChunkApp({
  loadRows,
  loadManifest,
  loadTextRows,
});
const app = new Hono().route("/search/chunk", searchChunkApp);

type AppRequest = {
  url: string;
  init?: RequestInit;
  status: number;
  etag: string | null;
};

const appRequests: AppRequest[] = [];
const appFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
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

const createEngine = (cache = new MemorySearchChunkCache()) =>
  new LocalSearchEngine({
    baseUrl: "https://api.example.test",
    cache,
    fetch: appFetch,
    workerFactory: () => new InlineFlexSearchWorker(),
    defaultSemester: "11510",
  });

const courseRequests = () =>
  appRequests.filter((request) => request.url.endsWith("/search/chunk/11510"));
const textRequests = () =>
  appRequests.filter((request) =>
    request.url.endsWith("/search/chunk/11510/text"),
  );

const requiredHitFields = [
  "objectID",
  "raw_id",
  "name_zh",
  "name_en",
  "teacher_zh",
  "teacher_en",
  "department",
  "course",
  "class",
  "venues",
  "times",
  "credits",
  "language",
  "closed_mark",
  "capacity",
  "reserve",
  "enrolled",
  "tags",
  "ge_target",
  "ge_type",
  "brief",
  "restrictions",
  "note",
  "prerequisites",
  "semester",
  "keywords",
] as const;

const request = (overrides: Record<string, unknown> = {}) => ({
  indexName: "nthu_courses",
  params: {
    query: "Environmental",
    facetFilters: [["semester:11510"]],
    hitsPerPage: 20,
    ...overrides,
  },
});

describe("local search against the real in-process search-chunk API", () => {
  beforeEach(() => {
    currentCourses = courseFixture;
    currentTexts = textFixture;
    appRequests.length = 0;
  });

  test("loads the real envelope and merges a rendered hit with every required field", async () => {
    const cache = new MemorySearchChunkCache();
    const engine = createEngine(cache);
    const result = await engine.search("11510", request());

    // The search tier is usable before the deferred text request completes.
    expect(result.hits[0]?.brief).toBeNull();
    await engine.waitForTextChunk("11510");

    const hit = result.hits[0];
    expect(hit).toBeDefined();
    for (const field of requiredHitFields) {
      expect(hit).toHaveProperty(field);
    }
    expect(hit).toMatchObject({
      objectID: "11510AES 450100",
      brief: "Environmental microorganisms and their applications.",
      keywords: ["environment", "microbiology"],
    });
    expect(appRequests.map((request) => request.status)).toEqual([
      200, 200, 200,
    ]);
    expect(cache.entries()).toHaveLength(1);
    expect(cache.textEntries()).toHaveLength(1);
  });

  test("handles 304 revalidation for both separately cached tiers", async () => {
    const cache = new MemorySearchChunkCache();
    const engine = createEngine(cache);
    await engine.search("11510", request());
    await engine.waitForTextChunk("11510");
    const firstCourseEtag = courseRequests()[0]?.etag;
    const firstTextEtag = textRequests()[0]?.etag;
    expect(firstCourseEtag).toBeTruthy();
    expect(firstTextEtag).toBeTruthy();

    await engine.clear("11510");
    appRequests.length = 0;
    const result = await engine.search("11510", request());
    expect(result.hits[0]?.brief).toBe(
      "Environmental microorganisms and their applications.",
    );
    await engine.waitForTextChunk("11510");

    expect(courseRequests().map((request) => request.status)).toEqual([304]);
    expect(textRequests().map((request) => request.status)).toEqual([304]);
    expect(
      new Headers(courseRequests()[0]?.init?.headers).get("if-none-match"),
    ).toBe(firstCourseEtag);
    expect(
      new Headers(textRequests()[0]?.init?.headers).get("if-none-match"),
    ).toBe(firstTextEtag);
    expect(cache.entries()).toHaveLength(1);
    expect(cache.textEntries()).toHaveLength(1);
  });

  test("invalidates both cached tiers when their version tokens change", async () => {
    const cache = new MemorySearchChunkCache();
    const engine = createEngine(cache);
    await engine.search("11510", request());
    await engine.waitForTextChunk("11510");
    const oldCourseKey = cache.entries()[0]?.[0];
    const oldTextKey = cache.textEntries()[0]?.[0];

    currentCourses = currentCourses.map((course) =>
      course.semester === "11510"
        ? {
            ...course,
            name_en: "Environmental Microbiology (changed)",
            updated_at: "2026-09-09T14:36:28.326+00:00",
          }
        : course,
    );
    currentTexts = currentTexts.map((row) =>
      row.semester === "11510"
        ? {
            ...row,
            updated_at: "2026-09-09T14:36:28.326+00:00",
            course_syllabus: {
              brief: "Changed brief.",
              keywords: ["changed"],
              updated_at: "2026-09-09T15:00:00.000+00:00",
            },
          }
        : row,
    );

    await engine.clear("11510");
    const result = await engine.search("11510", request());
    await engine.waitForTextChunk("11510");
    expect(result.hits[0]).toMatchObject({
      name_en: "Environmental Microbiology (changed)",
      brief: "Changed brief.",
    });
    expect(cache.entries()).toHaveLength(1);
    expect(cache.textEntries()).toHaveLength(1);
    expect(cache.entries()[0]?.[0]).not.toBe(oldCourseKey);
    expect(cache.textEntries()[0]?.[0]).not.toBe(oldTextKey);
    expect(searchChunkCacheKey("11510", "missing", "2")).not.toBe(
      cache.entries()[0]?.[0],
    );
    expect(searchTextCacheKey("11510", "missing", "2")).not.toBe(
      cache.textEntries()[0]?.[0],
    );
  });

  test("keeps hitsPerPage=0 local with counts and no hits", async () => {
    const engine = createEngine();
    const result = await engine.search(
      "11510",
      request({ query: "", hitsPerPage: 0 }),
    );
    expect(result.hits).toEqual([]);
    expect(result.hitsPerPage).toBe(0);
    expect(result.nbHits).toBe(1);
    expect(result.nbPages).toBe(0);
  });

  test("memoizes a failed real chunk load and lets the resilient client fall through", async () => {
    let courseLoadCalls = 0;
    const failingApp = new Hono().route(
      "/search/chunk",
      createSearchChunkApp({
        loadManifest: async () => [
          {
            semester: "11510",
            row_count: 1,
            max_updated_at: "2026-09-08T14:36:28.326+00:00",
          },
        ],
        loadRows: async () => {
          courseLoadCalls += 1;
          throw new Error("synthetic course source failure");
        },
        loadTextRows,
      }),
    );
    const failedFetch = async (input: RequestInfo | URL, init?: RequestInit) =>
      failingApp.request(String(input), init);
    const local = createLocalSearchClient({
      baseUrl: "https://api.example.test",
      cache: new MemorySearchChunkCache(),
      fetch: failedFetch,
      workerFactory: () => new InlineFlexSearchWorker(),
      defaultSemester: "11510",
    });

    await expect(local.trySearch([request({ query: "E" })])).rejects.toThrow();
    for (const query of ["", "E", "Env"]) {
      await expect(local.trySearch([request({ query })])).rejects.toThrow();
    }
    expect(courseLoadCalls).toBe(1);
    expect(local.getStatus()).toBe("error");

    let remoteCalls = 0;
    const remoteClient = {
      search: async () => {
        remoteCalls += 1;
        return {
          results: [
            {
              hits: [{ objectID: "remote" }],
              nbHits: 1,
              page: 0,
              nbPages: 1,
              hitsPerPage: 20,
              processingTimeMS: 1,
              exhaustiveNbHits: true,
              query: "E",
              params: "",
            },
          ],
        };
      },
      searchForFacetValues: async () => [],
    } as unknown as AlgoliaSearchClient;
    const resilient = createResilientSearchClient({
      remoteClient,
      localSearch: {
        baseUrl: "https://api.example.test",
        cache: new MemorySearchChunkCache(),
        fetch: failedFetch,
        workerFactory: () => new InlineFlexSearchWorker(),
        defaultSemester: "11510",
      },
    });
    const remoteResult = (await resilient.search([
      request({ query: "E" }),
    ] as never)) as {
      results: Array<{ hits: Array<{ objectID: string }> }>;
    };
    expect(remoteCalls).toBe(1);
    expect(remoteResult.results[0]?.hits[0]?.objectID).toBe("remote");
    expect(courseLoadCalls).toBe(2);
  });
});
