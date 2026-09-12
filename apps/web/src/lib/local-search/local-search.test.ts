import { describe, expect, test } from "bun:test";
import type { SearchClient as AlgoliaSearchClient } from "algoliasearch/lite";
import { createResilientSearchClient } from "../search-client";
import {
  createLocalSearchClient,
  LocalSearchEngine,
  MemorySearchChunkCache,
  prepareSearchRecord,
  searchChunkCacheKey,
  tokenizeCjk,
  matchesLocalQuery,
  matchesRefinements,
  maskFromTimes,
  maskFromSeparateTimes,
  conflict,
  freeOnDay,
  slotIndex,
  usesAny,
  usesOnly,
  zeroConflicts,
  type SearchWorker,
  type UnknownRecord,
} from "./client";
import type { WorkerRequest } from "./worker-protocol";

const fixturePath = `${import.meta.dir}/__fixtures__/courses-11510.json`;
const fixture = JSON.parse(
  await Bun.file(fixturePath).text(),
) as UnknownRecord[];

const makeManifest = (hash: string, rowCount = fixture.length) => [
  {
    id: "11510",
    rowCount,
    maxUpdatedAt: "2026-09-08T14:36:28.326+00:00",
    contentHash: hash,
    formatVersion: "1",
  },
];

type FetchState = {
  hash: string;
  conditional304: boolean;
  calls: Array<{ url: string; init?: RequestInit }>;
  records: UnknownRecord[];
};

const makeFetch =
  (state: FetchState) =>
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    state.calls.push({ url, init });
    if (url.endsWith("/search/chunk/manifest")) {
      return new Response(
        JSON.stringify(makeManifest(state.hash, state.records.length)),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
    if (url.includes("/search/chunk/")) {
      if (state.conditional304 && init?.headers) {
        return new Response(null, { status: 304 });
      }
      return new Response(JSON.stringify(state.records), {
        status: 200,
        headers: { ETag: JSON.stringify(state.hash) },
      });
    }
    throw new Error(`unexpected test fetch ${url}`);
  };

class FakeWorker implements SearchWorker {
  onmessage: SearchWorker["onmessage"] = null;
  onerror: SearchWorker["onerror"] = null;
  private documents: Array<{ id: string; text: string }> = [];

  postMessage(message: WorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "build") {
        this.documents = message.documents;
        this.onmessage?.({
          data: { type: "built", count: this.documents.length },
        } as MessageEvent);
        return;
      }
      // The real worker's FlexSearch result is checked again against the
      // prepared records by the engine. Returning all IDs here tests the
      // worker lifecycle and leaves correctness to that shared path.
      this.onmessage?.({
        data: {
          type: "results",
          requestId: message.requestId,
          ids: this.documents.map((document) => document.id),
        },
      } as MessageEvent);
    });
  }

  terminate() {}
}

class FailingWorker extends FakeWorker {
  override postMessage(message: WorkerRequest) {
    queueMicrotask(() => {
      this.onerror?.({
        message: "synthetic worker build failure",
      } as ErrorEvent);
    });
    void message;
  }
}

const createEngine = (stateOverrides: Partial<FetchState> = {}) => {
  const state: FetchState = {
    hash: "hash-a",
    conditional304: false,
    calls: [],
    records: fixture,
    ...stateOverrides,
  };
  const cache = new MemorySearchChunkCache();
  const engine = new LocalSearchEngine({
    baseUrl: "https://api.example.test",
    cache,
    fetch: makeFetch(state),
    defaultSemester: "11510",
    workerFactory: () => new FakeWorker(),
  });
  return { engine, cache, state };
};

const request = (params: Record<string, unknown>) => ({
  indexName: "nthu_courses",
  params: {
    facets: [
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
    ],
    facetFilters: [["semester:11510"]],
    ...params,
  },
});

describe("CJK tokenizer and 98-bit timetable masks", () => {
  test("emits lowercase words, CJK unigrams, and adjacent bigrams", () => {
    expect(tokenizeCjk("微積分 Calculus 11510")).toEqual(
      expect.arrayContaining([
        "微",
        "積",
        "分",
        "微積",
        "積分",
        "calculus",
        "11510",
      ]),
    );
  });

  test("represents every day/period slot including U and high periods", () => {
    expect(slotIndex("M", "1")).toBe(0);
    expect(slotIndex("U", "d")).toBe(97);
    const mask = maskFromTimes([
      "M1M2M3M4MnM5M6M7M8M9MaMbMcMd",
      "U1U2U3U4UnU5U6U7U8U9UaUbUcUd",
    ]);
    expect(mask).toHaveLength(4);
    expect(mask.some((word) => word !== 0)).toBe(true);
    expect(mask[3] & (1 << 1)).toBeGreaterThan(0);
  });

  test("implements conflict, zeroConflicts, usesAny, usesOnly, and freeOnDay", () => {
    const savedTimetable = fixture.find((row) =>
      (row.times as string[]).includes("M3M4Mn"),
    );
    expect(savedTimetable).toBeDefined();
    const occupied = maskFromTimes(savedTimetable?.times as string[]);
    const overlapping = maskFromTimes(["M3M4Mn"]);
    const freeRecord = fixture.find(
      (row) =>
        (row.times as string[]).length > 0 &&
        !conflict(maskFromTimes(row.times as string[]), occupied),
    );
    expect(freeRecord).toBeDefined();
    const free = maskFromTimes(freeRecord?.times as string[]);
    const allowed = maskFromSeparateTimes(["M3", "M4", "Mn"]);
    expect(conflict(overlapping, occupied)).toBe(true);
    expect(conflict(free, occupied)).toBe(false);
    expect(zeroConflicts(overlapping, occupied)).toBe(false);
    expect(zeroConflicts([overlapping, free], occupied)).toEqual([free]);
    expect(usesAny(overlapping, maskFromSeparateTimes(["M4"]))).toBe(true);
    expect(usesOnly(overlapping, allowed)).toBe(true);
    expect(freeOnDay(overlapping, "T")).toBe(true);
    expect(freeOnDay(overlapping, "M")).toBe(false);
    expect(freeOnDay(maskFromTimes(["U1"]), "U")).toBe(false);
  });

  test("treats empty times as unknown, not trivially conflict-free", () => {
    const empty = maskFromTimes([]);
    const occupied = maskFromSeparateTimes(["M3"]);
    expect(conflict(empty, occupied)).toBe(true);
    expect(conflict(empty, maskFromTimes([]))).toBe(false);
    expect(usesOnly(empty, occupied)).toBe(false);
    expect(freeOnDay(empty, "M")).toBe(false);
  });
});

describe("local course search", () => {
  test("supports browse-all, zero hits per page, pagination, no results, and attributes", async () => {
    const { engine } = createEngine();
    const all = await engine.search(
      "11510",
      request({ query: "", hitsPerPage: 0 }),
    );
    expect(all.nbHits).toBe(fixture.length);
    expect(all.hits).toEqual([]);
    expect(all.nbPages).toBe(0);
    expect(Object.keys(all.facets)).toHaveLength(13);

    const beyond = await engine.search(
      "11510",
      request({ query: "", page: 999, hitsPerPage: 20 }),
    );
    expect(beyond.nbHits).toBe(fixture.length);
    expect(beyond.hits).toEqual([]);
    const none = await engine.search(
      "11510",
      request({ query: "not-a-real-course" }),
    );
    expect(none.nbHits).toBe(0);
    expect(none.hits).toEqual([]);
    const selected = await engine.search(
      "11510",
      request({
        query: "11510TSED702300",
        hitsPerPage: 1,
        attributesToRetrieve: ["name_zh"],
      }),
    );
    expect(selected.nbHits).toBe(1);
    expect(selected.hits[0]).toEqual(
      expect.objectContaining({
        objectID: "11510TSED702300",
        name_zh: "數量方法二",
      }),
    );
    expect(selected.hits[0]).not.toHaveProperty("teacher_zh");
  });

  test("handles CJK, teacher names, English prefixes, codes, and departments", async () => {
    const { engine } = createEngine();
    const queries = [
      "微積分",
      "微積",
      "CS",
      "c",
      "ca",
      "cal",
      "11510TSED702300",
    ];
    const results = await Promise.all(
      queries.map((query) =>
        engine.search("11510", request({ query, hitsPerPage: 1000 })),
      ),
    );
    expect(results[0].nbHits).toBeGreaterThan(0);
    expect(results[1].nbHits).toBeGreaterThan(0);
    expect(results[2].nbHits).toBeGreaterThan(0);
    expect(results[3].nbHits).toBeGreaterThanOrEqual(results[4].nbHits);
    expect(results[4].nbHits).toBeGreaterThanOrEqual(results[5].nbHits);
    expect(results[6].nbHits).toBe(1);

    const teacher = String(
      (
        fixture.find(
          (row) =>
            Array.isArray(row.teacher_zh) &&
            row.teacher_zh.some((value) => value),
        )?.teacher_zh as string[] | undefined
      )?.[0] ?? "",
    );
    const teacherResult = await engine.search(
      "11510",
      request({ query: teacher }),
    );
    expect(teacherResult.nbHits).toBeGreaterThan(0);
    const environment = fixture.find((row) =>
      String(row.name_zh).includes("環境"),
    );
    expect(environment).toBeDefined();
    expect(matchesLocalQuery(prepareSearchRecord(environment!), "環境")).toBe(
      true,
    );
  });

  test("applies facet AND/OR, numeric, filter expressions, null arrays, and time semantics", async () => {
    const synthetic = {
      ...fixture[0],
      raw_id: "11510SYNTH000000",
      department: "SYNTH",
      course: "9999",
      teacher_en: null,
      compulsory_for: null,
      elective_for: null,
      for_class: null,
      times: ["M3M4Mn"],
      credits: 3,
    };
    const { engine } = createEngine({ records: [...fixture, synthetic] });
    const byDepartment = await engine.search(
      "11510",
      request({ facetFilters: [["semester:11510"], ["department:SYNTH"]] }),
    );
    expect(byDepartment.nbHits).toBe(1);
    const byOr = await engine.search(
      "11510",
      request({ facetFilters: [["department:SYNTH", "department:AES"]] }),
    );
    expect(byOr.nbHits).toBeGreaterThan(1);
    const byNumeric = await engine.search(
      "11510",
      request({
        numericFilters: ["credits>=3"],
        filters: "language:中 AND credits >= 3",
      }),
    );
    expect(byNumeric.nbHits).toBeGreaterThan(0);
    const byTime = await engine.search(
      "11510",
      request({
        facetFilters: [["separate_times:M3"], ["separate_times:M4"]],
        hitsPerPage: 1000,
      }),
    );
    expect(byTime.hits.some((hit) => hit.objectID === "11510SYNTH000000")).toBe(
      true,
    );
    const trueExact = await engine.search(
      "11510",
      request({ filters: "times:M3M4" }),
    );
    expect(
      trueExact.hits.some((hit) => hit.objectID === "11510SYNTH000000"),
    ).toBe(false);
    expect(
      matchesRefinements(prepareSearchRecord(synthetic), {
        facetFilters: [["department:SYNTH"]],
      }),
    ).toBe(true);
    expect(prepareSearchRecord(synthetic).teacher_en).toEqual([]);
    expect(prepareSearchRecord(synthetic).for_class).toEqual([]);
  });

  test("computes all requested facet counts and truncates maxValuesPerFacet", async () => {
    const { engine } = createEngine();
    const result = await engine.search(
      "11510",
      request({ query: "", maxValuesPerFacet: 1 }),
    );
    expect(Object.keys(result.facets)).toHaveLength(13);
    for (const values of Object.values(result.facets)) {
      expect(Object.keys(values).length).toBeLessThanOrEqual(1);
    }
    expect(result.facets.department).toBeDefined();
  });

  test("searches facet values using every other active refinement", async () => {
    const { engine } = createEngine();
    const result = await engine.searchForFacetValues("11510", {
      params: {
        facetName: "department",
        facetQuery: "e",
        maxFacetHits: 5,
        facetFilters: [["semester:11510"], ["language:英"]],
      },
    });
    expect(result.exhaustiveFacetsCount).toBe(true);
    expect(result.facetHits.length).toBeLessThanOrEqual(5);
    expect(
      result.facetHits.every((hit) =>
        hit.value.toLocaleLowerCase().includes("e"),
      ),
    ).toBe(true);
    expect(result.facetHits.every((hit) => hit.highlighted === hit.value)).toBe(
      true,
    );
  });
});

describe("chunk cache, conditional requests, and worker lifecycle", () => {
  test("loads a cache miss, reuses a hash-matched 304 entry, and invalidates a stale hash", async () => {
    const { engine, cache, state } = createEngine();
    await engine.search("11510", request({ query: "CS" }));
    expect(
      state.calls.filter((call) => call.url.includes("/search/chunk/11510"))
        .length,
    ).toBe(1);
    expect(cache.entries()).toHaveLength(1);

    await engine.clear("11510");
    state.conditional304 = true;
    await engine.search("11510", request({ query: "CS" }));
    const conditional = state.calls.at(-1);
    expect(conditional?.init?.headers).toEqual({
      "If-None-Match": JSON.stringify("hash-a"),
    });

    await engine.clear("11510");
    state.hash = "hash-b";
    state.conditional304 = false;
    await engine.search("11510", request({ query: "CS" }));
    expect(cache.entries()).toHaveLength(1);
    expect(cache.entries()[0][0]).toBe(
      searchChunkCacheKey("11510", "hash-b", "1"),
    );
  });

  test("reports loading and ready states while the worker builds", async () => {
    const { engine } = createEngine();
    const states: string[] = [];
    engine.subscribe(() => states.push(engine.getStatus()));
    const pending = engine.search("11510", request({ query: "" }));
    expect(engine.getStatus()).toBe("loading");
    await pending;
    expect(engine.getStatus()).toBe("ready");
    expect(states).toEqual(expect.arrayContaining(["loading", "ready"]));
  });

  test("covers every period code present in the real fixture", () => {
    const periods = [
      "1",
      "2",
      "3",
      "4",
      "n",
      "5",
      "6",
      "7",
      "8",
      "9",
      "a",
      "b",
      "c",
      "d",
    ];
    for (const period of periods) {
      expect(
        fixture.some((row) =>
          (row.times as string[]).some((time) =>
            new RegExp(`[MTWRFSU]${period}`).test(time),
          ),
        ),
      ).toBe(true);
    }
    expect(
      fixture.some((row) => (row.times as string[]).includes("M3M4Mn")),
    ).toBe(true);
    expect(
      fixture.some((row) =>
        (row.times as string[]).some((time) => time.includes("U")),
      ),
    ).toBe(true);
    expect(fixture.some((row) => (row.times as string[]).length === 0)).toBe(
      true,
    );
    expect(
      fixture.some((row) =>
        (row.teacher_en as string[]).some((teacher) => !teacher),
      ),
    ).toBe(true);
  });
});

describe("local-first resilient client", () => {
  const remoteResponse = {
    results: [
      {
        hits: [{ objectID: "remote" }],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 1,
        exhaustiveNbHits: true,
        query: "remote",
        params: "",
        facets: {},
      },
    ],
  };

  const remote = {
    search: async () => remoteResponse,
    searchForFacetValues: async () => [],
  } as unknown as AlgoliaSearchClient;

  test("slots local ahead of remote and waits during a local build", async () => {
    let remoteCalls = 0;
    const remoteWithCount = {
      ...remote,
      search: async () => {
        remoteCalls += 1;
        return remoteResponse;
      },
    } as unknown as AlgoliaSearchClient;
    const { state, cache } = createEngine();
    const client = createLocalSearchClient({
      cache,
      fetch: makeFetch(state),
      baseUrl: "https://api.example.test",
      defaultSemester: "11510",
      workerFactory: () => new FakeWorker(),
    });
    const result = await client.trySearch([request({ query: "CS" })]);
    expect(result.handled).toBe(true);
    expect(remoteCalls).toBe(0);
    expect(client.getStatus()).toBe("ready");
  });

  test("returns handled:false for cross-semester requests", async () => {
    const { state, cache } = createEngine();
    const client = createLocalSearchClient({
      cache,
      fetch: makeFetch(state),
      baseUrl: "https://api.example.test",
      defaultSemester: "11510",
      workerFactory: () => new FakeWorker(),
    });
    const result = await client.trySearch([
      request({ facetFilters: [["semester:11510"]] }),
      request({ facetFilters: [["semester:11420"]] }),
    ]);
    expect(result.handled).toBe(false);
  });

  test("falls back after manifest errors and worker build errors", async () => {
    const failingLocal = createLocalSearchClient({
      baseUrl: "https://api.example.test",
      cache: new MemorySearchChunkCache(),
      fetch: async () => new Response("broken", { status: 503 }),
      workerFactory: () => new FakeWorker(),
      defaultSemester: "11510",
    });
    await expect(
      failingLocal.trySearch([request({ query: "CS" })]),
    ).rejects.toThrow();

    const { state, cache } = createEngine();
    const failingWorkerLocal = createLocalSearchClient({
      cache,
      fetch: makeFetch(state),
      baseUrl: "https://api.example.test",
      workerFactory: () => new FailingWorker(),
      defaultSemester: "11510",
    });
    await expect(
      failingWorkerLocal.trySearch([request({ query: "CS" })]),
    ).rejects.toThrow();
  });

  test("uses the remote tier after a local worker build failure", async () => {
    let remoteCalls = 0;
    const remoteWithCount = {
      ...remote,
      search: async () => {
        remoteCalls += 1;
        return remoteResponse;
      },
    } as unknown as AlgoliaSearchClient;
    const { state, cache } = createEngine();
    const client = createResilientSearchClient({
      remoteClient: remoteWithCount,
      localSearch: {
        cache,
        fetch: makeFetch(state),
        baseUrl: "https://api.example.test",
        workerFactory: () => new FailingWorker(),
        defaultSemester: "11510",
      },
    });
    const result = (await client.search([
      request({ query: "CS" }),
    ] as never)) as {
      results: Array<{ hits: Array<{ objectID: string }> }>;
    };
    expect(remoteCalls).toBe(1);
    expect(result.results[0].hits[0].objectID).toBe("remote");
  });

  test("keeps a local hpp=0 response local with counts and no hits", async () => {
    const { state, cache } = createEngine();
    const client = createLocalSearchClient({
      cache,
      fetch: makeFetch(state),
      baseUrl: "https://api.example.test",
      defaultSemester: "11510",
      workerFactory: () => new FakeWorker(),
    });
    const result = await client.trySearch([
      request({ query: "", hitsPerPage: 0 }),
    ]);
    if (!result.handled) throw new Error("local result was not handled");
    expect(result.result.results[0].hitsPerPage).toBe(0);
    expect(result.result.results[0].hits).toEqual([]);
    expect(result.result.results[0].nbHits).toBe(fixture.length);
  });
});
