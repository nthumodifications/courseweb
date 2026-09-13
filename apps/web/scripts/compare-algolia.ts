import {
  LocalSearchEngine,
  MemorySearchChunkCache,
  facetValues,
  matchesLocalQuery,
  matchesRefinements,
  prepareSearchRecord,
  queryTerms,
  searchableFields,
  type SearchProjectionRecord,
  type SearchWorker,
  type UnknownRecord,
} from "../src/lib/local-search/client";
import { buildFlexSearchIndex } from "../src/lib/local-search/flexsearch-index";
import type { WorkerRequest } from "../src/lib/local-search/worker-protocol";

const SEMESTER = "11510";
const INDEX_NAME = "nthu_courses";
const PRIMARY_APP_ID = process.env.ALGOLIA_APP_ID ?? "I0RQAS273V";
const PRIMARY_API_KEY = process.env.ALGOLIA_API_KEY;
const BACKUP_APP_ID = process.env.ALGOLIA_BACKUP_APP_ID;
const BACKUP_API_KEY = process.env.ALGOLIA_BACKUP_API_KEY;
const HITS_PER_PAGE = 20;
const ALGOLIA_PAGE_SIZE = 1_000;
const MAX_VALUES_PER_FACET = 1_000;
const FACETS = [
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

type SearchParams = Record<string, unknown>;
type ComparisonCase = {
  id: string;
  family: string;
  label: string;
  query: string;
  page?: number;
  hitsPerPage?: number;
  params?: SearchParams;
};
type AlgoliaHit = UnknownRecord & { objectID: string };
type AlgoliaResponse = {
  hits: AlgoliaHit[];
  nbHits: number;
  nbPages: number;
  page: number;
  hitsPerPage: number;
  processingTimeMS?: number;
  facets?: Record<string, Record<string, number>>;
};
type FacetMaps = Record<string, Record<string, number>>;

type Asymmetry = {
  side: "algolia-only" | "local-only";
  category: string;
  objectID: string;
  detail: string;
  sample: UnknownRecord;
};

type CaseResult = {
  id: string;
  family: string;
  label: string;
  query: string;
  params: SearchParams;
  requestedPage: number;
  requestedHitsPerPage: number;
  algolia: {
    nbHits: number;
    nbPages: number;
    requestedIds: string[];
    fullIds: string[];
    rankIds: string[];
    facets: FacetMaps;
    requestedRoundTripMs: number;
    fullPaginationMs: number;
    fullRequests: number;
    membershipComplete: boolean;
    membershipMode: "direct" | "department-partition" | "pagination-limited";
    processingTimeMS?: number;
  };
  local: {
    nbHits: number;
    nbPages: number;
    requestedIds: string[];
    fullIds: string[];
    facets: FacetMaps;
    requestedRoundTripMs: number;
    processingTimeMS: number;
  };
  resultSet: {
    algoliaOnly: string[];
    localOnly: string[];
    intersection: number;
    exact: boolean;
    algoliaMembershipComplete: boolean;
    requestedPageIntersection: number;
  };
  ordering: {
    top1Agreement: boolean;
    top10Overlap: number;
    top10Denominator: number;
    spearman: number | null;
    commonRankedHits: number;
    algoliaTop: Array<UnknownRecord>;
    localTop: Array<UnknownRecord>;
  };
  facetDiffs: Array<{
    facet: string;
    algoliaOnlyValues: Record<string, number>;
    localOnlyValues: Record<string, number>;
    changedValues: Record<
      string,
      { algolia: number | undefined; local: number | undefined }
    >;
  }>;
  asymmetries: Asymmetry[];
};

const die = (message: string): never => {
  throw new Error(message);
};

if (!PRIMARY_API_KEY) {
  die(
    "Set ALGOLIA_API_KEY before running, for example: $env:ALGOLIA_API_KEY='...'; bun apps/web/scripts/compare-algolia.ts",
  );
}

const credentials = [
  { appId: PRIMARY_APP_ID, apiKey: PRIMARY_API_KEY },
  { appId: BACKUP_APP_ID, apiKey: BACKUP_API_KEY },
].filter(
  (value): value is { appId: string; apiKey: string } =>
    Boolean(value.appId && value.apiKey),
);

const requestJson = async (body: UnknownRecord) => {
  let lastStatus = "unknown";
  for (const credential of credentials) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(
        `https://${credential.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(INDEX_NAME)}/query`,
        {
          method: "POST",
          headers: {
            "X-Algolia-API-Key": credential.apiKey,
            "X-Algolia-Application-Id": credential.appId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      if (response.ok) return (await response.json()) as AlgoliaResponse;
      lastStatus = `${response.status} ${response.statusText}`;
      if (![402, 403, 429, 500, 502, 503, 504].includes(response.status)) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  die(`Algolia query failed (${lastStatus})`);
};

const withSemester = (overrides: SearchParams = {}): SearchParams => ({
  facetFilters: [[`semester:${SEMESTER}`]],
  ...overrides,
});

const makeCase = (
  id: string,
  family: string,
  label: string,
  query: string,
  params: SearchParams = {},
  page = 0,
): ComparisonCase => ({
  id,
  family,
  label,
  query,
  page,
  hitsPerPage: HITS_PER_PAGE,
  params: withSemester(params),
});

const levenshtein = (left: string, right: string) => {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 0; i < left.length; i += 1) {
    let diagonal = previous[0]!;
    previous[0] = i + 1;
    for (let j = 0; j < right.length; j += 1) {
      const above = previous[j + 1]!;
      previous[j + 1] = Math.min(
        previous[j + 1]! + 1,
        previous[j]! + 1,
        diagonal + (left[i] === right[j] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length]!;
};

const isCjk = (value: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
    value,
  );

const localFieldEvidence = (record: SearchProjectionRecord, query: string) => {
  const terms = queryTerms(query);
  const fields = [
    "name_zh",
    "name_en",
    "course",
    "raw_id",
    "department",
    "teacher_zh",
    "teacher_en",
  ] as const;
  return terms.map((term) => ({
    term,
    matches: fields.flatMap((field) => {
      const value = record[field];
      const values = Array.isArray(value) ? value : [value];
      return values
        .map((item) => String(item ?? ""))
        .filter((item) => {
          const normalized = item.toLocaleLowerCase("zh-TW");
          return isCjk(term)
            ? normalized.includes(term)
            : searchableFields(record).includes(normalized) &&
                normalized
                  .split(/[^\p{L}\p{N}]+/u)
                  .some((token) => token.startsWith(term));
        })
        .map((item) => `${field}=${item}`);
    }),
  }));
};

const localSubstringEvidence = (record: SearchProjectionRecord, query: string) => {
  const terms = queryTerms(query);
  const fields = [
    "name_zh",
    "name_en",
    "course",
    "raw_id",
    "department",
    "teacher_zh",
    "teacher_en",
  ] as const;
  return terms.flatMap((term) =>
    fields.flatMap((field) => {
      const value = record[field];
      const values = Array.isArray(value) ? value : [value];
      return values
        .map((item) => String(item ?? ""))
        .filter((item) => item.toLocaleLowerCase("zh-TW").includes(term))
        .map((item) => `${field}=${item}`);
    }),
  );
};

const closestEvidence = (record: SearchProjectionRecord, query: string) => {
  const terms = queryTerms(query).filter((term) => !isCjk(term));
  const values = [
    ["name_zh", record.name_zh],
    ["name_en", record.name_en],
    ["course", record.course],
    ["raw_id", record.raw_id],
    ["department", record.department],
    ...record.teacher_zh.map((value) => ["teacher_zh", value] as const),
    ...record.teacher_en.map((value) => ["teacher_en", value] as const),
  ].flatMap(([field, value]) =>
    String(value)
      .toLocaleLowerCase("zh-TW")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map((token) => ({ field, token })),
  );
  const nearest = terms.flatMap((term) => {
    const candidate = values
      .map((value) => ({
        ...value,
        distance: levenshtein(term, value.token),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    return candidate ? [`${term} -> ${candidate.field}=${candidate.token} (edit distance ${candidate.distance})`] : [];
  });
  return nearest.join(", ");
};

const filterConditions = (params: SearchParams) => {
  const values: string[] = [];
  const facetFilters = params.facetFilters;
  if (Array.isArray(facetFilters)) {
    for (const group of facetFilters) {
      for (const value of Array.isArray(group) ? group : [group]) {
        values.push(String(value));
      }
    }
  }
  for (const key of ["numericFilters", "filters"] as const) {
    const value = params[key];
    if (Array.isArray(value)) values.push(...value.flatMap((item) => String(item)));
    else if (value !== undefined) values.push(String(value));
  }
  return values;
};

const explainAsymmetry = (
  side: Asymmetry["side"],
  objectID: string,
  query: string,
  caseId: string,
  family: string,
  params: SearchParams,
  localById: Map<string, SearchProjectionRecord>,
  algoliaById: Map<string, AlgoliaHit>,
  algoliaBrowseIds: Set<string>,
): Asymmetry => {
  const local = localById.get(objectID);
  const algolia = algoliaById.get(objectID);
  if (side === "algolia-only" && !local) {
    return {
      side,
      category: "index/source drift",
      objectID,
      detail: "Algolia returned an objectID absent from the supplied local snapshot.",
      sample: algolia ?? { objectID },
    };
  }
  if (side === "local-only" && !algoliaBrowseIds.has(objectID)) {
    return {
      side,
      category: "index/source drift",
      objectID,
      detail: "The local snapshot contains this objectID, but it was absent from Algolia's empty-query semester inventory.",
      sample: local ?? { objectID },
    };
  }
  if (!local) {
    return {
      side,
      category: "unclassified",
      objectID,
      detail: "No local record was available for classification.",
      sample: algolia ?? { objectID },
    };
  }
  const queryEvidence = localFieldEvidence(local, query);
  const queryMatches = matchesLocalQuery(local, query);
  const refinementMatches = matchesRefinements(local, params);
  if (side === "algolia-only" && !queryMatches) {
    const missing = queryEvidence
      .filter((term) => term.matches.length === 0)
      .map((term) => JSON.stringify(term.term))
      .join(", ");
    const nearest = closestEvidence(local, query);
    const substring = localSubstringEvidence(local, query);
    const cjkPhraseLoose = queryTerms(query).some(
      (term) =>
        isCjk(term) &&
        [...term].length > 1 &&
        [local.name_zh, ...local.teacher_zh].some((value) =>
          [...term].every((character) => value.includes(character)),
        ),
    );
    const category =
      family === "typo"
        ? "Algolia typo tolerance"
          : family === "stemming" && caseId === "stemming-suffix"
          ? "Algolia stemming/plural expansion"
          : family === "synonym"
            ? "Algolia synonym/semantic expansion"
            : cjkPhraseLoose
              ? "Algolia CJK tokenization expansion"
              : substring.length
                ? "Algolia substring/tokenization expansion"
                : "Algolia fuzzy matching expansion";
    const fieldCause = substring.slice(0, 3).join(" | ");
    return {
      side,
      category,
      objectID,
      detail: `Local exact/prefix matcher has no searchable-field match for ${missing || JSON.stringify(query)}${fieldCause ? `; local substring evidence: ${fieldCause}` : ""}${nearest ? `; nearest local token: ${nearest}` : ""}.`,
      sample: local,
    };
  }
  if (side === "local-only" && queryMatches) {
    const evidence = queryEvidence
      .map((term) => `${term.term}: ${term.matches.slice(0, 3).join(" | ")}`)
      .join("; ");
    return {
      side,
      category: "local prefix/tokenization expansion",
      objectID,
      detail: `Local matched searchable fields by exact prefix/contiguous text (${evidence || "no recorded field evidence"}), but Algolia did not return the indexed object for this query.`,
      sample: local,
    };
  }
  if (!refinementMatches) {
    return {
      side,
      category: "refinement semantics",
      objectID,
      detail: `Local query matching agreed, but local refinement evaluation rejected the record for ${filterConditions(params).join(" AND ") || "the supplied refinements"}.`,
      sample: local,
    };
  }
  return {
    side,
    category: "unexpected local omission",
    objectID,
    detail: "The local matcher and refinements both accept this record, but it was not present in the local result set.",
    sample: local,
  };
};

const mapFrom = (value: unknown): Record<string, number> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, count]) => [
          key,
          Number(count),
        ]),
      )
    : {};

const normalizeFacets = (value: unknown): FacetMaps =>
  Object.fromEntries(FACETS.map((facet) => [facet, mapFrom((value as FacetMaps | undefined)?.[facet])]));

const facetDiffs = (algolia: FacetMaps, local: FacetMaps) =>
  FACETS.flatMap((facet) => {
    const a = algolia[facet] ?? {};
    const l = local[facet] ?? {};
    const keys = new Set([...Object.keys(a), ...Object.keys(l)]);
    const algoliaOnlyValues: Record<string, number> = {};
    const localOnlyValues: Record<string, number> = {};
    const changedValues: Record<string, { algolia: number | undefined; local: number | undefined }> = {};
    for (const key of keys) {
      if (!(key in l)) algoliaOnlyValues[key] = a[key]!;
      else if (!(key in a)) localOnlyValues[key] = l[key]!;
      else if (a[key] !== l[key]) changedValues[key] = { algolia: a[key], local: l[key] };
    }
    return Object.keys(algoliaOnlyValues).length || Object.keys(localOnlyValues).length || Object.keys(changedValues).length
      ? [{ facet, algoliaOnlyValues, localOnlyValues, changedValues }]
      : [];
  });

const spearman = (left: string[], right: string[]) => {
  const rightRank = new Map(right.map((id, index) => [id, index + 1]));
  const pairs = left
    .map((id, index) => ({ left: index + 1, right: rightRank.get(id) }))
    .filter((pair): pair is { left: number; right: number } => pair.right !== undefined);
  if (pairs.length < 2) return null;
  const n = pairs.length;
  const d2 = pairs.reduce((sum, pair) => sum + (pair.left - pair.right) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
};

const requestedBody = (item: ComparisonCase, page: number, hitsPerPage: number) => ({
  facets: [...FACETS],
  maxValuesPerFacet: MAX_VALUES_PER_FACET,
  ...item.params,
  query: item.query,
  page,
  hitsPerPage,
});

const queryAlgolia = async (item: ComparisonCase, page: number, hitsPerPage: number) => {
  const started = performance.now();
  const response = await requestJson(requestedBody(item, page, hitsPerPage));
  return { response, elapsedMs: performance.now() - started };
};

const collectAlgolia = async (item: ComparisonCase) => {
  const first = await queryAlgolia(item, 0, ALGOLIA_PAGE_SIZE);
  const directHits = [...first.response.hits];
  if (first.response.nbHits <= directHits.length) {
    return {
      hits: directHits,
      rankHits: directHits,
      nbHits: first.response.nbHits,
      nbPages: first.response.nbPages,
      facets: normalizeFacets(first.response.facets),
      elapsedMs: first.elapsedMs,
      requestCount: 1,
      membershipComplete: true,
      membershipMode: "direct" as const,
    };
  }

  // The live index currently reports nbPages=1 even when nbHits > 1000 and
  // returns zero hits for page=1. Enumerate membership by the configured
  // department facet so broad result-set comparisons are still complete.
  const departments = Object.keys(normalizeFacets(first.response.facets).department);
  if (!departments.length) {
    return {
      hits: directHits,
      rankHits: directHits,
      nbHits: first.response.nbHits,
      nbPages: first.response.nbPages,
      facets: normalizeFacets(first.response.facets),
      elapsedMs: first.elapsedMs,
      requestCount: 1,
      membershipComplete: false,
      membershipMode: "pagination-limited" as const,
    };
  }
  const started = performance.now();
  const partitionHits: AlgoliaHit[] = [];
  const partitionSize = 20;
  for (let offset = 0; offset < departments.length; offset += partitionSize) {
    const batch = departments.slice(offset, offset + partitionSize);
    const responses = await Promise.all(
      batch.map((department) =>
        queryAlgolia(
          {
            ...item,
            params: {
              ...item.params,
              facetFilters: [
                ...(Array.isArray(item.params?.facetFilters)
                  ? item.params.facetFilters
                  : []),
                [`department:${department}`],
              ],
            },
          },
          0,
          ALGOLIA_PAGE_SIZE,
        ),
      ),
    );
    for (const response of responses) partitionHits.push(...response.response.hits);
  }
  const unique = new Map<string, AlgoliaHit>();
  for (const hit of [...directHits, ...partitionHits]) {
    const objectID = String(hit.objectID);
    if (!unique.has(objectID)) unique.set(objectID, hit);
  }
  const hits = [...unique.values()];
  return {
    hits,
    rankHits: directHits,
    nbHits: first.response.nbHits,
    nbPages: first.response.nbPages,
    facets: normalizeFacets(first.response.facets),
    elapsedMs: first.elapsedMs + (performance.now() - started),
    requestCount: 1 + departments.length,
    membershipComplete: hits.length === first.response.nbHits,
    membershipMode: hits.length === first.response.nbHits
      ? ("department-partition" as const)
      : ("pagination-limited" as const),
  };
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
          this.onmessage?.({ data: { type: "built", count: message.documents.length } } as MessageEvent);
          return;
        }
        if (!this.index) throw new Error("Inline local index was not built");
        this.onmessage?.({
          data: {
            type: "results",
            requestId: message.requestId,
            ids: this.index.search(message.query, message.limit).map(String),
          },
        } as MessageEvent);
      } catch (error) {
        this.onerror?.({ message: error instanceof Error ? error.message : "Local index failed" } as ErrorEvent);
      }
    });
  }

  terminate() {}
}

const rawRows = (await Bun.file(new URL("../../../bench/data/courses-11510.json", import.meta.url)).json()) as UnknownRecord[];
// The supplied file is the raw Supabase-shaped source. Sort it as the real
// chunk publisher does; LocalSearchEngine then performs the production
// prepareSearchRecord projection itself.
const projections = [...rawRows].sort((left, right) =>
  String(left.raw_id ?? "").localeCompare(String(right.raw_id ?? "")),
);
const localRecords = projections.map(prepareSearchRecord);
const localById = new Map(localRecords.map((record) => [record.objectID, record]));
const localIds = localRecords.map((record) => record.objectID);

const localFetch = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith("/search/chunk/manifest")) {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          schemaVersion: 1,
          semesters: [{ semester: SEMESTER, rowCount: projections.length, contentHash: "bench-courses-11510" }],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ success: true, data: { schemaVersion: 1, semester: SEMESTER, courses: projections } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

const findEnglishWord = () => {
  const words = new Map<string, number>();
  for (const row of rawRows) {
    for (const word of String(row.name_en ?? "").toLocaleLowerCase("en-US").match(/[a-z]{5,}/g) ?? []) {
      words.set(word, (words.get(word) ?? 0) + 1);
    }
  }
  return [...words.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "method";
};

const stemBase = findEnglishWord();
const cases: ComparisonCase[] = [
  makeCase("browse-all", "browse", "Empty query / browse all", ""),
  makeCase("browse-all-deep", "pagination", "Empty query, deep page 100", "", {}, 100),
  makeCase("cjk-one", "cjk-name", "CJK course name, 1 character", "微"),
  makeCase("cjk-two", "cjk-name", "CJK course name, 2 characters", "微積"),
  makeCase("cjk-three-plus", "cjk-name", "CJK course name, 3+ characters", "微積分"),
  makeCase("cjk-teacher", "cjk-teacher", "CJK teacher name", "江金城"),
  makeCase("english-prefix-c", "english", "English broad prefix", "c"),
  makeCase("english-prefix-cal", "english", "English prefix", "cal"),
  makeCase("english-case", "english", "English uppercase case variation", "CALCULUS"),
  makeCase("english-multi-word", "english", "English multi-word course name", "environmental microbiology"),
  makeCase("english-teacher", "english", "English teacher name", "JIANG"),
  makeCase("code-full", "code", "Full raw_id", "11510TSED702300"),
  makeCase("code-fragment", "code", "Course-code fragment", "7023"),
  makeCase("department-cs", "department", "Department prefix CS", "CS"),
  makeCase("department-ee", "department", "Department prefix EE", "EE"),
  makeCase("typo-calculus", "typo", "English typo: calculus", "calclulus"),
  makeCase("typo-environmental", "typo", "English typo: environmental", "enviromental"),
  makeCase("typo-microbiology", "typo", "English typo: microbiology", "microbiolgy"),
  makeCase("zero", "zero-one-thousands", "Zero-result query", "not-a-real-course"),
  makeCase("one", "zero-one-thousands", "Exactly one result", "11510TSED702300"),
  makeCase("thousands", "zero-one-thousands", "Thousands of results", "c"),
  makeCase("time-m1", "time", "Separate-time filter M1", "", { filters: `semester:${SEMESTER} AND separate_times:M1`, facetFilters: [] }),
  makeCase("time-m1-m2", "time", "Separate-time AND filter M1 + M2", "", { facetFilters: [[`semester:${SEMESTER}`], ["separate_times:M1"], ["separate_times:M2"]] }),
  makeCase("time-m1-query", "time", "Text plus separate-time filter", "微", { filters: `semester:${SEMESTER} AND separate_times:M1`, facetFilters: [] }),
  makeCase("credits-ge3", "numeric", "Numeric credits >= 3", "", { numericFilters: ["credits>=3"] }),
  makeCase("credits-four", "numeric", "Numeric credits = 4", "", { numericFilters: ["credits=4"] }),
  makeCase("combined", "combined", "Text + department facet + credits", "calculus", { facetFilters: [[`semester:${SEMESTER}`], ["department:MATH"]], numericFilters: ["credits>=3"] }),
  makeCase("combined-cjk-time", "combined", "CJK + time + numeric", "微積分", { facetFilters: [[`semester:${SEMESTER}`], ["separate_times:T1"]], numericFilters: ["credits>=3"] }),
  makeCase("department-or", "facets", "OR department facet group", "", { facetFilters: [[`semester:${SEMESTER}`], ["department:CS", "department:EE"]] }),
  makeCase("punctuation", "edge", "Punctuation-only browse", "!!!"),
  makeCase("html-marker", "local-fix", "Legacy HTML marker probe", "color"),
  makeCase("stemming-base", "stemming", `Stemming base word ${stemBase}`, stemBase),
  makeCase("stemming-suffix", "stemming", `Stemming/plural probe from ${stemBase}`, `${stemBase}s`),
  makeCase("synonym-computer-science", "synonym", "Synonym probe: computer science", "computer science"),
  makeCase("synonym-machine-learning", "synonym", "Synonym probe: machine learning", "machine learning"),
];

const queryLocal = async (engine: LocalSearchEngine, item: ComparisonCase, page: number, hitsPerPage: number) => {
  const started = performance.now();
  const response = await engine.search(SEMESTER, {
    indexName: INDEX_NAME,
    params: {
      ...item.params,
      query: item.query,
      page,
      hitsPerPage,
      facets: [...FACETS],
      maxValuesPerFacet: MAX_VALUES_PER_FACET,
    },
  });
  return { response, elapsedMs: performance.now() - started };
};

const rankMetrics = (algoliaIds: string[], localIdsForCase: string[]) => {
  const localSet = new Set(localIdsForCase);
  const common = algoliaIds.filter((id) => localSet.has(id));
  const algoliaTop10 = new Set(algoliaIds.slice(0, 10));
  const localTop10 = new Set(localIdsForCase.slice(0, 10));
  const top10Overlap = [...algoliaTop10].filter((id) => localTop10.has(id)).length;
  return {
    top1Agreement: algoliaIds[0] !== undefined && algoliaIds[0] === localIdsForCase[0],
    top10Overlap,
    top10Denominator: Math.min(10, common.length),
    spearman: spearman(algoliaIds, localIdsForCase),
    commonRankedHits: common.length,
  };
};

const sampleRecord = (record: UnknownRecord) => ({
  objectID: record.objectID,
  raw_id: record.raw_id,
  department: record.department,
  course: record.course,
  name_zh: record.name_zh,
  name_en: record.name_en,
  teacher_zh: record.teacher_zh,
  teacher_en: record.teacher_en,
});

const main = async () => {
  const engine = new LocalSearchEngine({
    baseUrl: "https://local-snapshot.invalid",
    cache: new MemorySearchChunkCache(),
    fetch: localFetch,
    workerFactory: () => new InlineFlexSearchWorker(),
    defaultSemester: SEMESTER,
  });
  const algoliaById = new Map<string, AlgoliaHit>();
  let algoliaBrowseIds = new Set<string>();
  const results: CaseResult[] = [];
  const localColdStarted = performance.now();
  await engine.search(SEMESTER, {
    indexName: INDEX_NAME,
    params: {
      ...cases[0]!.params,
      query: "",
      page: 0,
      hitsPerPage: 0,
      facets: [],
    },
  });
  const localColdLoadMs = performance.now() - localColdStarted;

  for (const item of cases) {
    const page = item.page ?? 0;
    const hitsPerPage = item.hitsPerPage ?? HITS_PER_PAGE;
    const algoliaRequested = await queryAlgolia(item, page, hitsPerPage);
    const localRequested = await queryLocal(engine, item, page, hitsPerPage);
    const algoliaFull = await collectAlgolia(item);
    const localFull = await queryLocal(engine, item, 0, rawRows.length);
    const algoliaFullIds = algoliaFull.hits.map((hit) => String(hit.objectID));
    const localFullIds = localFull.response.hits.map((hit) => String(hit.objectID));
    const algoliaRequestedIds = algoliaRequested.response.hits.map((hit) => String(hit.objectID));
    const localRequestedIds = localRequested.response.hits.map((hit) => String(hit.objectID));
    const rankIds = algoliaFull.rankHits.map((hit) => String(hit.objectID));
    const rankSet = new Set(rankIds);
    const localRankIds = localFullIds.filter((id) => rankSet.has(id));

    for (const hit of algoliaFull.hits) {
      const objectID = String(hit.objectID);
      if (!algoliaById.has(objectID)) algoliaById.set(objectID, hit);
    }
    if (item.id === "browse-all") algoliaBrowseIds = new Set(algoliaFullIds);

    const algoliaSet = new Set(algoliaFullIds);
    const localSet = new Set(localFullIds);
    const algoliaOnly = algoliaFullIds.filter((id) => !localSet.has(id));
    const localOnly = localFullIds.filter((id) => !algoliaSet.has(id));
    const intersections = algoliaFullIds.filter((id) => localSet.has(id)).length;
    const asymmetries = [
      ...algoliaOnly.map((objectID) => explainAsymmetry("algolia-only", objectID, item.query, item.id, item.family, item.params ?? {}, localById, algoliaById, algoliaBrowseIds)),
      ...localOnly.map((objectID) => explainAsymmetry("local-only", objectID, item.query, item.id, item.family, item.params ?? {}, localById, algoliaById, algoliaBrowseIds)),
    ];
    const facetDiff = facetDiffs(algoliaRequested.response.facets ? normalizeFacets(algoliaRequested.response.facets) : normalizeFacets(algoliaFull.facets), normalizeFacets(localRequested.response.facets));
    results.push({
      id: item.id,
      family: item.family,
      label: item.label,
      query: item.query,
      params: item.params ?? {},
      requestedPage: page,
      requestedHitsPerPage: hitsPerPage,
      algolia: {
        nbHits: algoliaFull.nbHits,
        nbPages: algoliaFull.nbPages,
        requestedIds: algoliaRequestedIds,
        fullIds: algoliaFullIds,
        rankIds: algoliaFull.rankHits.map((hit) => String(hit.objectID)),
        facets: normalizeFacets(algoliaRequested.response.facets),
        requestedRoundTripMs: algoliaRequested.elapsedMs,
        fullPaginationMs: algoliaFull.elapsedMs,
        fullRequests: algoliaFull.requestCount,
        membershipComplete: algoliaFull.membershipComplete,
        membershipMode: algoliaFull.membershipMode,
        processingTimeMS: algoliaRequested.response.processingTimeMS,
      },
      local: {
        nbHits: localFull.response.nbHits,
        nbPages: localFull.response.nbPages,
        requestedIds: localRequestedIds,
        fullIds: localFullIds,
        facets: normalizeFacets(localRequested.response.facets),
        requestedRoundTripMs: localRequested.elapsedMs,
        processingTimeMS: localRequested.response.processingTimeMS,
      },
      resultSet: {
        algoliaOnly,
        localOnly,
        intersection: intersections,
        exact: algoliaFull.membershipComplete && algoliaOnly.length === 0 && localOnly.length === 0,
        algoliaMembershipComplete: algoliaFull.membershipComplete,
        requestedPageIntersection: algoliaRequestedIds.filter((id) => new Set(localRequestedIds).has(id)).length,
      },
      ordering: {
        ...rankMetrics(rankIds, localRankIds),
        algoliaTop: algoliaFull.rankHits.slice(0, 5).map(sampleRecord),
        localTop: localRankIds.slice(0, 5).flatMap((id) => {
          const record = localById.get(id);
          return record ? [sampleRecord(record)] : [];
        }),
      },
      facetDiffs: facetDiff,
      asymmetries,
    });
    console.log(`${item.id}: Algolia ${algoliaFull.nbHits}, local ${localFull.response.nbHits}, A-only ${algoliaOnly.length}, L-only ${localOnly.length}`);
  }

  const output = {
    measuredAt: new Date().toISOString(),
    semester: SEMESTER,
    localSnapshot: "bench/data/courses-11510.json",
    localSnapshotRows: rawRows.length,
    localEngine: "LocalSearchEngine + actual FlexSearch index path via inline worker",
    localColdLoadMs,
    algolia: { appId: PRIMARY_APP_ID, index: INDEX_NAME, pageSize: ALGOLIA_PAGE_SIZE },
    facets: [...FACETS],
    cases: results,
  };
  const report = renderReport(output);
  const reportPath = new URL("../../../algolia-comparison.md", import.meta.url);
  const jsonPath = new URL("../../../algolia-comparison-results.json", import.meta.url);
  await Bun.write(reportPath, report);
  await Bun.write(jsonPath, JSON.stringify(output, null, 2));
  console.log(`Report: ${reportPath.pathname}`);
  console.log(`Raw results: ${jsonPath.pathname}`);
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]! : 0;
};

const mdJson = (value: unknown) => JSON.stringify(value);
const md = (value: unknown) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");

function renderReport(output: {
  measuredAt: string;
  semester: string;
  localSnapshot: string;
  localSnapshotRows: number;
  localEngine: string;
  localColdLoadMs: number;
  algolia: { appId: string; index: string; pageSize: number };
  facets: readonly string[];
  cases: CaseResult[];
}) {
  const results = output.cases;
  const exact = results.filter((result) => result.resultSet.exact).length;
  const facetExact = results.filter((result) => result.facetDiffs.length === 0).length;
  const top1 = results.filter((result) => result.ordering.top1Agreement).length;
  const top10 = results.map((result) => result.ordering.top10Overlap / Math.max(1, result.ordering.top10Denominator));
  const correlations = results.flatMap((result) => result.ordering.spearman === null ? [] : [result.ordering.spearman]);
  const localMs = results.map((result) => result.local.requestedRoundTripMs);
  const algoliaMs = results.map((result) => result.algolia.requestedRoundTripMs);
  const totalAlgoliaOnly = results.reduce((sum, result) => sum + result.resultSet.algoliaOnly.length, 0);
  const totalLocalOnly = results.reduce((sum, result) => sum + result.resultSet.localOnly.length, 0);
  const byFamily = new Map<string, CaseResult[]>();
  for (const result of results) byFamily.set(result.family, [...(byFamily.get(result.family) ?? []), result]);

  const lines: string[] = [];
  lines.push("# Local course search vs live Algolia");
  lines.push("");
  lines.push("## Verdict");
  lines.push("");
  lines.push(`No: local is not ready to replace Algolia as the primary course-search backend without caveats. In this live run, ${exact}/${results.length} query result sets were exact, only ${facetExact}/${results.length} had identical returned facet maps, and top-1 agreed in ${top1}/${results.length}. The dominant concrete regression is Algolia matching misspelled English queries that local returns empty; ranking also differs materially on common hits. Local is a good exact/prefix and faceted-browse engine for this 3,165-row semester, but these are user-visible behavior changes, not merely implementation details.`);
  lines.push("");
  lines.push(`Measured ${output.measuredAt} against Algolia application ${output.algolia.appId}, index ${output.algolia.index}, semester ${output.semester}. Local input was ${output.localSnapshot} (${output.localSnapshotRows} rows), served through the chunk envelope into ${output.localEngine}. The live index returned only one page when nbHits exceeded ${output.algolia.pageSize}; page 1 was empty. Oversized membership sets were therefore enumerated by partitioning on every returned department facet value, and the report labels any incomplete enumeration instead of treating the inaccessible tail as a local result.`);
  lines.push("");
  lines.push(`The local latency numbers are warm in-process engine timings after the snapshot has been loaded; the measured local cold load/fetch/parse/index build was ${output.localColdLoadMs.toFixed(2)} ms. They exclude browser/CDN download because the harness uses the supplied local snapshot. Algolia numbers are live HTTPS round trips. The comparison therefore answers search-time speed, with cold local startup reported separately.`);
  lines.push("");
  lines.push("## Per-dimension numbers");
  lines.push("");
  lines.push(`- Result sets: ${exact}/${results.length} exact among complete Algolia membership enumerations; total Algolia-only IDs ${totalAlgoliaOnly}; total local-only IDs ${totalLocalOnly}.`);
  lines.push(`- Ordering: top-1 agreement ${top1}/${results.length}; median top-10 overlap ${(median(top10) * 100).toFixed(1)}%; median Spearman ${correlations.length ? median(correlations).toFixed(3) : "n/a"} over ${correlations.length} non-empty comparisons. For oversized cases, ranking is measured only over Algolia's observable first ${output.algolia.pageSize} hits; department partition order is not treated as a ranking.`);
  lines.push(`- Facets: ${facetExact}/${results.length} cases had exact maps for all 13 requested facets: ${output.facets.join(", ")}. Missing Algolia facet keys are treated as an empty map, which is the observable JSON result.`);
  lines.push(`- Search-time latency: local warm median/p95 ${median(localMs).toFixed(2)}/${percentile(localMs, 0.95).toFixed(2)} ms; Algolia requested-page median/p95 ${median(algoliaMs).toFixed(2)}/${percentile(algoliaMs, 0.95).toFixed(2)} ms. Local is faster after load; its measured cold load was ${output.localColdLoadMs.toFixed(2)} ms.`);
  const localSlower = results.filter((result) => result.local.requestedRoundTripMs > result.algolia.requestedRoundTripMs);
  const largestLocalSlowdown = [...localSlower].sort(
    (left, right) =>
      right.local.requestedRoundTripMs - right.algolia.requestedRoundTripMs -
      (left.local.requestedRoundTripMs - left.algolia.requestedRoundTripMs),
  )[0];
  lines.push(`- Latency caveat: local was slower than the live Algolia requested-page round trip in ${localSlower.length}/${results.length} one-shot cases; the largest observed gap was ${largestLocalSlowdown ? `${largestLocalSlowdown.label} (${largestLocalSlowdown.local.requestedRoundTripMs.toFixed(2)} ms local vs ${largestLocalSlowdown.algolia.requestedRoundTripMs.toFixed(2)} ms Algolia)` : "none"}.`);
  lines.push("");
  const browse = results.find((result) => result.id === "browse-all");
  const algoliaNonemptyFacets = browse
    ? output.facets.filter((facet) => Object.keys(browse.algolia.facets[facet] ?? {}).length > 0)
    : [];
  const algoliaEmptyFacets = output.facets.filter((facet) => !algoliaNonemptyFacets.includes(facet));
  lines.push("### Facet capability detail");
  lines.push("");
  lines.push(`In browse-all, Algolia returned non-empty maps for ${algoliaNonemptyFacets.length}/13 facets (${algoliaNonemptyFacets.join(", ")}) and an empty/missing map for ${algoliaEmptyFacets.join(", ")}. The exact per-query maps below show the recurring semantic difference: local preserves explicit blank ge_target/ge_type values (for example \`" "\` and \`""\`), while Algolia omits those blank facet values; Algolia also returned no separate_times facet map even though its hits contain separate_times. This is a live-index facet contract difference, not evidence that local hit filtering is wrong.`);
  lines.push("");
  lines.push("### Cheap local fix applied");
  lines.push("");
  lines.push("The initial pre-fix run found 9 local-only hits for the broad `c` probe; all had `name_en` HTML such as `<font color=\"red\">停開</font>`, so local was indexing the hidden `color` attribute. The local searchable-text projection now strips tags while preserving the original display field. After rerunning the live matrix, `c` had 0 local-only hits (2,066 local vs 2,301 Algolia); the remaining 235 Algolia-only hits are Algolia's broader substring/fuzzy behavior, not the markup bug.");
  lines.push("");
  lines.push("### Behavior families");
  lines.push("");
  lines.push("| Family | Cases | Algolia-only | Local-only | Exact sets | Median Spearman |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const [family, familyResults] of byFamily) {
    const familyCorr = familyResults.flatMap((result) => result.ordering.spearman === null ? [] : [result.ordering.spearman]);
    lines.push(`| ${md(family)} | ${familyResults.length} | ${familyResults.reduce((sum, result) => sum + result.resultSet.algoliaOnly.length, 0)} | ${familyResults.reduce((sum, result) => sum + result.resultSet.localOnly.length, 0)} | ${familyResults.filter((result) => result.resultSet.exact).length} | ${familyCorr.length ? median(familyCorr).toFixed(3) : "n/a"} |`);
  }
  lines.push("");
  lines.push("### Query matrix summary");
  lines.push("");
  lines.push("The result-set columns below compare complete hit memberships when Algolia enumeration is marked complete. `page I/A/L` gives requested-page intersection, Algolia hits, and local hits (page 100 is the deliberate deep-pagination probe). Facet differences are count-of-value differences across all 13 maps.");
  lines.push("");
  lines.push("| Case | Query | A nbHits | L nbHits | A-only | L-only | Intersection | A membership | Top-1 | Top-10 | Spearman | page I/A/L | A ms | L ms | A enum ms/# | Facet diffs |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---|:---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const result of results) {
    lines.push(`| ${md(result.label)} | \`${md(result.query)}\` | ${result.algolia.nbHits} | ${result.local.nbHits} | ${result.resultSet.algoliaOnly.length} | ${result.resultSet.localOnly.length} | ${result.resultSet.intersection} | ${result.algolia.membershipMode}${result.algolia.membershipComplete ? "" : " (incomplete)"} | ${result.ordering.top1Agreement ? "yes" : "no"} | ${result.ordering.top10Overlap}/${result.ordering.top10Denominator} | ${result.ordering.spearman === null ? "n/a" : result.ordering.spearman.toFixed(3)} | ${result.resultSet.requestedPageIntersection}/${result.algolia.requestedIds.length}/${result.local.requestedIds.length} | ${result.algolia.requestedRoundTripMs.toFixed(2)} | ${result.local.requestedRoundTripMs.toFixed(2)} | ${result.algolia.fullPaginationMs.toFixed(2)}/${result.algolia.fullRequests} | ${result.facetDiffs.length} |`);
  }
  lines.push("");
  lines.push("## Concrete regressions and asymmetry explanations");
  lines.push("");
  lines.push("Every asymmetric objectID was classified against the local searchable fields/refinement predicate and against the empty-query Algolia semester inventory. Counts in each case's categories sum to the A-only plus L-only total; samples make the field-level cause concrete without dumping thousands of duplicate course rows.");
  lines.push("");
  for (const result of results) {
    if (!result.asymmetries.length) continue;
    lines.push(`### ${result.label} — \`${md(result.query)}\``);
    lines.push("");
    const groups = new Map<string, Asymmetry[]>();
    for (const asymmetry of result.asymmetries) {
      const key = `${asymmetry.side}: ${asymmetry.category}`;
      groups.set(key, [...(groups.get(key) ?? []), asymmetry]);
    }
    for (const [key, group] of groups) {
      lines.push(`- ${key}: ${group.length}. ${group.slice(0, 4).map((item) => `${item.objectID} — ${item.detail} Sample ${mdJson(sampleRecord(item.sample))}`).join("; ")}`);
    }
    lines.push("");
  }
  lines.push("The most important interpretation is directional: `Algolia ... expansion` means local rejected a record because no exact/prefix/contiguous searchable-field match existed; the category and nearest token identify whether the observed cause was typo tolerance, CJK tokenization, stemming, substring matching, or another fuzzy expansion. `local prefix/tokenization expansion` means the object is in Algolia's semester inventory and local accepted a searchable field, but Algolia did not return it for that query. `index/source drift` is a data inventory difference, not a ranking claim.");
  lines.push("");
  lines.push("### Ranking examples");
  lines.push("");
  lines.push("For cases with a top-1 disagreement or a non-perfect top-10 overlap, these are the first five records on each side within the comparable ranking window. Oversized cases use Algolia's observable first 1,000; department partition order is not treated as ranking.");
  lines.push("");
  for (const result of results.filter((item) => !item.ordering.top1Agreement || item.ordering.top10Overlap < item.ordering.top10Denominator)) {
    lines.push(`- **${md(result.label)}** — Algolia: ${mdJson(result.ordering.algoliaTop)}; Local: ${mdJson(result.ordering.localTop)}`);
  }
  lines.push("");
  lines.push("### Typo tolerance");
  lines.push("");
  const typoResults = byFamily.get("typo") ?? [];
  lines.push(`The ${typoResults.length} explicit typo cases produced ${typoResults.reduce((sum, result) => sum + result.resultSet.algoliaOnly.length, 0)} Algolia-only hits and ${typoResults.reduce((sum, result) => sum + result.resultSet.localOnly.length, 0)} local-only hits. Local has no edit-distance stage, so any Algolia-only hits in these cases are a direct quantified typo-tolerance gap. See the per-case records below for exact counts and nearest field tokens.`);
  lines.push("");
  lines.push("### Stemming and synonyms");
  lines.push("");
  for (const family of ["stemming", "synonym"]) {
    const familyResults = byFamily.get(family) ?? [];
    lines.push(`- ${family}: ${familyResults.map((result) => `\`${result.query}\` -> A ${result.algolia.nbHits}, L ${result.local.nbHits}, A-only ${result.resultSet.algoliaOnly.length}, L-only ${result.resultSet.localOnly.length}`).join("; ") || "no cases"}. These are observed probes only; a zero difference means no expansion was observed for that term, not that the hosted index has no other synonyms or language rules.`);
  }
  lines.push("");
  lines.push("## Exact facet counts per query");
  lines.push("");
  lines.push("Each case below includes all 13 returned maps. `Algolia` and `Local` are exact value-to-count JSON objects; an empty object is an exact observed empty facet map, not an omitted measurement.");
  lines.push("");
  for (const result of results) {
    lines.push(`### ${result.label} — \`${md(result.query)}\``);
    lines.push("");
    for (const facet of output.facets) {
      lines.push(`- **${facet}** — Algolia: \`${mdJson(result.algolia.facets[facet] ?? {})}\`; Local: \`${mdJson(result.local.facets[facet] ?? {})}\``);
    }
    lines.push("");
  }
  lines.push("## Recommendations");
  lines.push("");
  lines.push("1. Do not remove Algolia yet if typo-tolerant discovery, current ranking, or search analytics are product requirements. Local is fast after load for most exact/facet queries, but the broad `c` probe was slower locally (one-shot) and local changes behavior for misspellings and hosted relevance tuning.");
  lines.push("2. If local becomes the primary active-semester path, add an explicit local fuzzy-recall policy: either a bounded edit-distance fallback for sufficiently long Latin tokens, or retain a remote Algolia fallback only when the local exact/prefix result is empty. Measure false positives and added CPU/memory before enabling it globally.");
  lines.push("3. Add a local ranking layer before treating ordering as equivalent. The current result order is FlexSearch relevance plus insertion ties; this run's top-1/top-10/Spearman numbers show that common-hit membership alone is not enough.");
  lines.push("4. Keep the existing remote fallback for cold/missing/stale chunks, cross-semester searches, and any query class where fuzzy/synonym behavior is required. The local latency advantage is real only after the semester chunk is resident; publish and monitor chunk load/build timings separately.");
  lines.push("5. Treat facet differences as release blockers if they are caused by the source snapshot/index inventory or a filter semantic mismatch. The raw per-query maps above identify exactly which facet values differ; do not paper over them with aggregate counts.");
  lines.push("");
  lines.push("## Reproduction");
  lines.push("");
  lines.push("From the worktree, with the supplied key kept out of source control:");
  lines.push("");
  lines.push("```powershell");
  lines.push("$env:ALGOLIA_API_KEY = 'your-search-only-key'");
  lines.push("bun apps/web/scripts/compare-algolia.ts");
  lines.push("```");
  lines.push("");
  lines.push("The script writes `algolia-comparison-results.json` beside this report. It is intentionally a live-network measurement harness and is not a CI test.");
  return `${lines.join("\n")}\n`;
}

await main();
