import { expect, test } from "bun:test";
import {
  LocalSearchEngine,
  prepareSearchRecord,
  type UnknownRecord,
} from "./client";
import type { SearchWorker, WorkerRequest } from "./worker-protocol";

const enabled = process.env.LOCAL_SEARCH_REMOTE_PARITY === "1";
const parityTest = enabled ? test : test.skip;
const fullDumpPath = `${import.meta.dir}/../../../../../bench/data/courses-11510.json`;
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
];

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

const remoteSearch = async (params: Record<string, unknown>) => {
  const response = await fetch(
    `https://api.nthumods.com/search/fallback?${serialize({
      q: params.query ?? "",
      page: params.page ?? 0,
      hitsPerPage: params.hitsPerPage,
      facetFilters: params.facetFilters,
      numericFilters: params.numericFilters,
      filters: params.filters,
      facets: params.facets,
      maxValuesPerFacet: params.maxValuesPerFacet,
    })}`,
  );
  const payload = (await response.json()) as {
    success: boolean;
    data?: Record<string, unknown>;
  };
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(`remote parity request failed (${response.status})`);
  }
  return payload.data as {
    hits: Array<{ objectID: string; raw_id?: string }>;
    facets?: Record<string, Record<string, number>>;
    nbHits: number;
    nbPages: number;
    hitsPerPage: number;
  };
};

const canonicalFacets = (
  facets: Record<string, Record<string, number>> | undefined,
) =>
  Object.fromEntries(
    Object.entries(facets ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, values]) => [
        name,
        Object.fromEntries(
          Object.entries(values).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      ]),
  );

const facetDiff = (
  local: Record<string, Record<string, number>> | undefined,
  remote: Record<string, Record<string, number>> | undefined,
) => {
  const left = canonicalFacets(local);
  const right = canonicalFacets(remote);
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .flatMap((name) => {
      const localValues = left[name] ?? {};
      const remoteValues = right[name] ?? {};
      const changed = [
        ...new Set([...Object.keys(localValues), ...Object.keys(remoteValues)]),
      ]
        .filter((value) => localValues[value] !== remoteValues[value])
        .slice(0, 4)
        .map(
          (value) =>
            `${value}:${String(localValues[value] ?? 0)}/${String(remoteValues[value] ?? 0)}`,
        );
      return changed.length ? `${name}[${changed.join(",")}]` : [];
    })
    .slice(0, 8)
    .join(" ");
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
            contentHash: "parity-real-dump",
            formatVersion: "1",
          },
        ]),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify(records), { status: 200 });
  };

class InlineFlexSearchWorker implements SearchWorker {
  onmessage: SearchWorker["onmessage"] = null;
  onerror: SearchWorker["onerror"] = null;
  private index:
    | { search: (query: string, limit: number) => unknown[] }
    | undefined;

  postMessage(message: WorkerRequest) {
    queueMicrotask(async () => {
      try {
        if (message.type === "build") {
          const { buildFlexSearchIndex } = await import("./flexsearch-index");
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

/**
 * Opt-in because it requires the live public fallback API. Run with:
 * LOCAL_SEARCH_REMOTE_PARITY=1 bun test ./src/lib/local-search/parity.test.ts
 *
 * Ranking order is intentionally not compared: Algolia/Supabase relevance and
 * FlexSearch relevance are different products. Counts, pagination metadata,
 * and every requested facet map are compared exactly. Complete hit sets are
 * compared for result sets within the fallback API's 100-hit page limit.
 * Single-letter and department-prefix queries intentionally include local
 * searchable fields the fallback does not index; those count/facet deltas are
 * asserted and recorded separately.
 */
parityTest(
  "matches the public fallback over the real 11510 matrix",
  async () => {
    const records = JSON.parse(
      await Bun.file(fullDumpPath).text(),
    ) as UnknownRecord[];
    const engine = new LocalSearchEngine({
      baseUrl: "https://api.example.test",
      fetch: makeFetch(records),
      workerFactory: () => new InlineFlexSearchWorker(),
    });
    const queries = ["", "c", "ca", "微積分", "CS", "11510TSED702300"];
    const facetFilters = [
      [["semester:11510"]],
      [["semester:11510"], ["department:CS"]],
      [["semester:11510"], ["language:英"]],
      [["semester:11510"], ["separate_times:M3"]],
    ];
    const numericFilters = [undefined, ["credits>=3"]];
    const requests: Record<string, unknown>[] = [];
    for (const query of queries) {
      for (const facets of facetFilters) {
        for (const numeric of numericFilters) {
          for (const page of [0, 1]) {
            for (const hitsPerPage of [1, 20]) {
              requests.push({
                query,
                facetFilters: facets,
                numericFilters: numeric,
                page,
                hitsPerPage,
                facets: facetNames,
                maxValuesPerFacet: 25,
              });
            }
          }
        }
      }
    }

    const countOrFacetDivergences: string[] = [];
    const expectedSemanticDivergences: string[] = [];
    const rankingDivergences: string[] = [];
    for (let offset = 0; offset < requests.length; offset += 8) {
      const batch = requests.slice(offset, offset + 8);
      const outcomes = await Promise.all(
        batch.map(async (params) => {
          const [local, remote] = await Promise.all([
            engine.search("11510", { indexName: "nthu_courses", params }),
            remoteSearch(params),
          ]);
          const localIds = new Set(local.hits.map((hit) => hit.objectID));
          const remoteIds = new Set(
            remote.hits.map((hit) => hit.objectID ?? hit.raw_id),
          );
          const localFacetJson = JSON.stringify(canonicalFacets(local.facets));
          const remoteFacetJson = JSON.stringify(
            canonicalFacets(remote.facets),
          );
          const sameCounts =
            local.nbHits === remote.nbHits &&
            local.nbPages === remote.nbPages &&
            local.hitsPerPage === remote.hitsPerPage;
          const samePage =
            localIds.size === remoteIds.size &&
            [...localIds].every((id) => remoteIds.has(id));
          const intentionalSemanticDifference = ["c", "CS"].includes(
            String(params.query),
          );
          return {
            label: `${String(params.query)} page=${String(params.page)} hpp=${String(params.hitsPerPage)} filters=${JSON.stringify(params.facetFilters)} numeric=${JSON.stringify(params.numericFilters)}`,
            sameCounts,
            samePage,
            sameFacets: localFacetJson === remoteFacetJson,
            facetDiff: facetDiff(local.facets, remote.facets),
            intentionalSemanticDifference,
            localNbHits: local.nbHits,
            remoteNbHits: remote.nbHits,
            localIds: [...localIds],
            remoteIds: [...remoteIds],
          };
        }),
      );
      for (const outcome of outcomes) {
        if (!outcome.sameCounts || !outcome.sameFacets) {
          const line = `${outcome.label} counts=${outcome.localNbHits}/${outcome.remoteNbHits} facets=${outcome.sameFacets} diff=${outcome.facetDiff}`;
          if (outcome.intentionalSemanticDifference) {
            expectedSemanticDivergences.push(line);
          } else {
            countOrFacetDivergences.push(line);
          }
        }
        if (outcome.sameCounts && outcome.sameFacets && !outcome.samePage) {
          rankingDivergences.push(
            `${outcome.label} local=${JSON.stringify(outcome.localIds)} remote=${JSON.stringify(outcome.remoteIds)}`,
          );
        }
      }
    }

    expect(requests).toHaveLength(192);
    expect(countOrFacetDivergences).toEqual([]);
    expect(expectedSemanticDivergences.length).toBeGreaterThan(0);
    expect(
      expectedSemanticDivergences.every((line) => {
        const counts = line.match(/counts=(\d+)\/(\d+)/);
        return counts ? Number(counts[1]) >= Number(counts[2]) : false;
      }),
    ).toBe(true);
    expect(rankingDivergences.length).toBeGreaterThan(0);

    const completeSetDivergences: string[] = [];
    const completeSetRequests = requests.filter(
      (params) =>
        params.page === 0 &&
        params.hitsPerPage === 1 &&
        !["c", "CS"].includes(String(params.query)),
    );
    for (let offset = 0; offset < completeSetRequests.length; offset += 8) {
      const batch = completeSetRequests.slice(offset, offset + 8);
      const outcomes = await Promise.all(
        batch.map(async (params) => {
          const completeParams = {
            ...params,
            page: 0,
            hitsPerPage: 100,
            facets: [],
          };
          const [local, remote] = await Promise.all([
            engine.search("11510", {
              indexName: "nthu_courses",
              params: completeParams,
            }),
            remoteSearch(completeParams),
          ]);
          if (local.nbHits > 100 || remote.nbHits > 100) return null;
          const localIds = new Set(local.hits.map((hit) => hit.objectID));
          const remoteIds = new Set(
            remote.hits.map((hit) => hit.objectID ?? hit.raw_id),
          );
          return local.nbHits === remote.nbHits &&
            localIds.size === remoteIds.size &&
            [...localIds].every((id) => remoteIds.has(id))
            ? null
            : `${String(params.query)} filters=${JSON.stringify(params.facetFilters)} numeric=${JSON.stringify(params.numericFilters)} local=${JSON.stringify([...localIds])} remote=${JSON.stringify([...remoteIds])}`;
        }),
      );
      completeSetDivergences.push(
        ...outcomes.filter((line): line is string => line !== null),
      );
    }
    expect(completeSetDivergences).toEqual([]);
  },
  120_000,
);

parityTest(
  "uses the real dump's derived shape for the local reference",
  async () => {
    const records = JSON.parse(
      await Bun.file(fullDumpPath).text(),
    ) as UnknownRecord[];
    const prepared = records.map(prepareSearchRecord);
    expect(prepared).toHaveLength(3165);
    expect(
      prepared.find((record) => record.objectID === "11510TSED702300"),
    ).toMatchObject({
      courseLevel: "7000",
      separate_times: ["M5", "M6", "M7"],
    });
  },
);
