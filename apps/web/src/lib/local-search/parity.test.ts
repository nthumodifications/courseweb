import { expect, test } from "bun:test";
import {
  LocalSearchEngine,
  MemorySearchChunkCache,
  type UnknownRecord,
} from "./client";
import { buildFlexSearchIndex } from "./flexsearch-index";
import { LOCAL_PARITY_CASES } from "./parity-cases";
import type { SearchWorker, WorkerRequest } from "./worker-protocol";

const enabled = process.env.LOCAL_SEARCH_REMOTE_PARITY === "1";
const parityTest = enabled ? test : test.skip;

const serialize = (params: Record<string, unknown>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    query.set(
      key,
      Array.isArray(value) || (typeof value === "object" && value !== null)
        ? JSON.stringify(value)
        : String(value),
    );
  }
  return query.toString();
};

const remoteSearch = async (
  parityCase: (typeof LOCAL_PARITY_CASES)[number],
) => {
  const response = await fetch(
    `https://api.nthumods.com/search/fallback?${serialize({
      q: parityCase.query,
      page: 0,
      hitsPerPage: 100,
      facetFilters: [
        ["semester:11510"],
        ...(parityCase.params?.facetFilters ?? []),
      ],
      numericFilters: parityCase.params?.numericFilters,
      filters: parityCase.params?.filters,
    })}`,
  );
  const payload = (await response.json()) as {
    success?: boolean;
    data?: {
      hits?: Array<{ objectID?: string; raw_id?: string }>;
      nbHits?: number;
    };
  };
  if (!response.ok || !payload.success || !payload.data?.hits) {
    throw new Error(`remote parity request failed (${response.status})`);
  }
  return {
    nbHits: payload.data.nbHits ?? 0,
    ids: payload.data.hits.map((hit) => hit.objectID ?? hit.raw_id ?? ""),
  };
};

const loadProductionChunk = async () => {
  const response = await fetch("https://api.nthumods.com/search/chunk/11510");
  const payload = (await response.json()) as {
    data?: { courses?: UnknownRecord[] };
  };
  const records = payload.data?.courses;
  if (!response.ok || !records) {
    throw new Error(`production chunk request failed (${response.status})`);
  }
  return records;
};

const makeFetch =
  (records: UnknownRecord[]) => async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/search/chunk/manifest")) {
      return new Response(
        JSON.stringify([
          {
            id: "11510",
            rowCount: records.length,
            contentHash: "live-production-parity",
            formatVersion: "2",
          },
        ]),
        { status: 200 },
      );
    }
    if (url.endsWith("/search/chunk/11510/text")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { schemaVersion: 2, semester: "11510", texts: {} },
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: { schemaVersion: 2, semester: "11510", courses: records },
      }),
      { status: 200 },
    );
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

test("serializes parity request parameters", () => {
  expect(serialize({ query: "微積分", page: 0 })).toBe(
    "query=%E5%BE%AE%E7%A9%8D%E5%88%86&page=0",
  );
});

/**
 * Opt-in, GET-only production comparison:
 * LOCAL_SEARCH_REMOTE_PARITY=1 bun test ./src/lib/local-search/parity.test.ts
 *
 * The chunk is fetched from production and searched locally; the same fixed
 * cases are sent to the public fallback GET route. Set agreement is measured
 * separately from order because the two ranking implementations are distinct.
 */
parityTest(
  "compares the fixed matrix with production",
  async () => {
    const records = await loadProductionChunk();
    const engine = new LocalSearchEngine({
      baseUrl: "https://api.example.test",
      cache: new MemorySearchChunkCache(),
      defaultSemester: "11510",
      fetch: makeFetch(records),
      workerFactory: () => new InlineFlexSearchWorker(),
    });
    const outcomes: Array<{
      name: string;
      sameSet: boolean;
      sameOrder: boolean;
    }> = [];

    for (let offset = 0; offset < LOCAL_PARITY_CASES.length; offset += 5) {
      const batch = LOCAL_PARITY_CASES.slice(offset, offset + 5);
      const batchOutcomes = await Promise.all(
        batch.map(async (parityCase) => {
          const params = {
            ...parityCase.params,
            query: parityCase.query,
            hitsPerPage: 100,
            facetFilters: [
              ["semester:11510"],
              ...(parityCase.params?.facetFilters ?? []),
            ],
          };
          const [local, remote] = await Promise.all([
            engine.search("11510", { params }),
            remoteSearch(parityCase),
          ]);
          const localIds = local.hits.map((hit) => hit.objectID);
          const sameSet =
            local.nbHits === remote.nbHits &&
            localIds.length === remote.ids.length &&
            localIds.every((id) => remote.ids.includes(id));
          return {
            name: parityCase.name,
            sameSet,
            sameOrder:
              sameSet && localIds.every((id, i) => id === remote.ids[i]),
          };
        }),
      );
      outcomes.push(...batchOutcomes);
    }

    const sameSet = outcomes.filter((outcome) => outcome.sameSet).length;
    const sameOrder = outcomes.filter((outcome) => outcome.sameOrder).length;
    console.log(
      `[local-search parity] production 11510: ${sameSet}/${outcomes.length} id sets, ${sameOrder}/${outcomes.length} ordered pages`,
    );
    expect(outcomes).toHaveLength(LOCAL_PARITY_CASES.length);
    expect(sameSet).toBeGreaterThanOrEqual(20);
  },
  120_000,
);
