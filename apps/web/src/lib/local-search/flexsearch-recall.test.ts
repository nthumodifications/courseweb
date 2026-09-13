import { expect, test } from "bun:test";
import {
  LocalSearchEngine,
  MemorySearchChunkCache,
  prepareSearchRecord,
  SEARCHABLE_FIELDS,
  searchableText,
  matchesLocalQuery,
  queryTerms,
  rankLocalIds,
  type SearchWorker,
  type UnknownRecord,
} from "./client";
import {
  buildFlexSearchIndex,
  searchFlexSearchIndex,
} from "./flexsearch-index";
import type { WorkerRequest } from "./worker-protocol";

const fullDumpPath = `${import.meta.dir}/../../../../../bench/data/courses-11510.json`;
const rawRecords = JSON.parse(
  await Bun.file(fullDumpPath).text(),
) as UnknownRecord[];
const records = rawRecords.map(prepareSearchRecord);
const documents = records.map((record, id) => ({
  id: String(id),
  text: searchableText(record),
}));

// Keep one real full-dump index for every test in this file.
const flexIndex = buildFlexSearchIndex(documents);
const allIds = documents.map((document) => document.id);

const cjkPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const cjkCharacters = (value: string) =>
  [...value].filter((character) => cjkPattern.test(character));

const firstNonemptyFieldValue = (field: (typeof SEARCHABLE_FIELDS)[number]) => {
  for (const record of records) {
    const value = record[field];
    const values = Array.isArray(value) ? value : [value];
    const nonempty = values.find((item) => String(item ?? "").trim());
    if (nonempty !== undefined) return String(nonempty);
  }
  throw new Error(`No non-empty value for ${field}`);
};

const cjkName = records.find((record) => {
  const characters = cjkCharacters(record.name_zh);
  return characters.length >= 3;
})?.name_zh;
const cjkTeacher = records
  .flatMap((record) => record.teacher_zh)
  .find((value) => cjkCharacters(value).length >= 2);
const englishName = records.find((record) => {
  const words = record.name_en.trim().split(/\s+/);
  return words.length >= 2 && words.every((word) => /[A-Za-z]/.test(word));
})?.name_en;
const englishWord = englishName
  ?.split(/\s+/)
  .find((word) => /^[A-Za-z]{5,}$/.test(word));
const englishTeacher = firstNonemptyFieldValue("teacher_en");
const mixedSource = records.find(
  (record) =>
    /[A-Za-z]/.test(record.name_zh) && cjkPattern.test(record.name_zh),
)?.name_zh;
const mixedAscii = mixedSource?.match(/[A-Za-z]+/)?.[0];
const mixedCjk = mixedSource?.match(/[\p{Script=Han}]{2,}/u)?.[0];

if (!cjkName || !cjkTeacher || !englishName || !englishWord) {
  throw new Error("The real course dump lacks a required recall probe value");
}
if (!mixedAscii || !mixedCjk) {
  throw new Error("The real course dump lacks a mixed CJK/ASCII probe value");
}

const queryCases = [
  { name: "CJK single character", query: cjkCharacters(cjkName)[0] },
  {
    name: "CJK two-character phrase",
    query: cjkCharacters(cjkName).slice(0, 2).join(""),
  },
  { name: "CJK three-plus-character course name", query: cjkName },
  { name: "CJK teacher name", query: cjkTeacher },
  { name: "English full word", query: englishWord },
  { name: "English prefix", query: englishWord.slice(0, 3) },
  { name: "English lowercase", query: englishWord.toLowerCase() },
  { name: "English uppercase", query: englishWord.toUpperCase() },
  { name: "English multi-word", query: englishName },
  { name: "Full raw_id", query: "11510TSED702300" },
  { name: "Department prefix", query: "CS" },
  { name: "Numeric fragment", query: "7023" },
  { name: "Mixed CJK and ASCII", query: `${mixedAscii} ${mixedCjk}` },
  { name: "Whitespace-padded", query: `  ${cjkName}  ` },
  { name: "Empty string", query: "" },
  { name: "Punctuation-only", query: "!!!" },
  { name: "Zero rows", query: "not-a-real-course" },
  { name: "Exactly one row", query: "11510TSED702300" },
  { name: "Thousands of rows", query: "c" },
  ...SEARCHABLE_FIELDS.map((field) => ({
    name: `searchable field: ${field}`,
    query:
      field === "teacher_en"
        ? englishTeacher.split(/[\s,]+/)[0]
        : firstNonemptyFieldValue(field),
  })),
];

const sortedSet = (ids: readonly string[]) =>
  [...new Set(ids)].sort((left, right) => Number(left) - Number(right));

test("real FlexSearch has exact recall against the linear matcher", () => {
  const outcomes = queryCases.map(({ name, query }) => {
    const truth = records.flatMap((record, id) =>
      matchesLocalQuery(record, query) ? [String(id)] : [],
    );
    const indexedIds = searchFlexSearchIndex(flexIndex, query, records.length);
    const got = indexedIds.filter((id) => {
      const numericId = Number(id);
      return (
        Number.isInteger(numericId) &&
        numericId >= 0 &&
        numericId < records.length &&
        matchesLocalQuery(records[numericId], query)
      );
    });
    expect(
      sortedSet(got),
      `${name} (${JSON.stringify(query)}): got ${got.length}, truth ${truth.length}`,
    ).toEqual(sortedSet(truth));
    return { name, query, truth: truth.length, got: got.length };
  });

  const byName = new Map(outcomes.map((outcome) => [outcome.name, outcome]));
  expect(byName.get("Zero rows")?.truth).toBe(0);
  expect(byName.get("Exactly one row")?.truth).toBe(1);
  expect(byName.get("Thousands of rows")?.truth).toBeGreaterThan(1000);
  expect(byName.get("Empty string")?.truth).toBe(records.length);
  expect(byName.get("Punctuation-only")?.truth).toBe(records.length);
}, 30_000);

class SharedFlexSearchWorker implements SearchWorker {
  onmessage: SearchWorker["onmessage"] = null;
  onerror: SearchWorker["onerror"] = null;

  postMessage(message: WorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "build") {
        this.onmessage?.({
          data: { type: "built", count: message.documents.length },
        } as MessageEvent);
        return;
      }
      this.onmessage?.({
        data: {
          type: "results",
          requestId: message.requestId,
          ids: searchFlexSearchIndex(flexIndex, message.query, message.limit),
        },
      } as MessageEvent);
    });
  }

  terminate() {}
}

test("the local engine preserves FlexSearch rank and stable insertion ties", async () => {
  const fetchDump = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/search/chunk/manifest")) {
      return new Response(
        JSON.stringify([
          {
            id: "11510",
            rowCount: records.length,
            contentHash: "recall-real-dump",
            formatVersion: "1",
          },
        ]),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify(rawRecords), { status: 200 });
  };
  const engine = new LocalSearchEngine({
    baseUrl: "https://api.example.test",
    cache: new MemorySearchChunkCache(),
    fetch: fetchDump,
    defaultSemester: "11510",
    workerFactory: () => new SharedFlexSearchWorker(),
  });

  const params = { query: "environmental", hitsPerPage: records.length };
  const first = await engine.search("11510", { params });
  const second = await engine.search("11510", { params });
  const firstIds = first.hits.map((hit) => hit.objectID);
  const flexRankedIds = searchFlexSearchIndex(
    flexIndex,
    params.query,
    records.length,
  )
    .filter((id) => matchesLocalQuery(records[Number(id)], params.query))
    .map((id) => records[Number(id)].objectID);

  // There is no post-search sort in engine.ts: FlexSearch rank comes first,
  // and FlexSearch's stable insertion/document-ID order resolves ties.
  expect(firstIds).toEqual(flexRankedIds);
  expect(second.hits.map((hit) => hit.objectID)).toEqual(firstIds);
  expect(firstIds).toEqual(
    [
      "906",
      "1551",
      "0",
      "9",
      "940",
      "1548",
      "2267",
      "1",
      "7",
      "8",
      "72",
      "142",
      "379",
      "548",
      "1544",
      "1554",
      "1559",
      "1730",
    ].map((id) => records[Number(id)].objectID),
  );
  expect(first.nbHits).toBe(18);
  expect(queryTerms("!!!")).toEqual([]);
  expect(searchFlexSearchIndex(flexIndex, "!!!", records.length)).toEqual(
    allIds,
  );
});

test("strips HTML attributes from indexed text but preserves display markup", () => {
  const record = records.find((item) => item.name_en.includes("<font"));
  expect(record).toBeDefined();
  if (!record) return;

  expect(record.name_en).toContain('<font color="red">');
  expect(searchableText(record)).not.toContain("color");
  expect(matchesLocalQuery(record, "color")).toBe(false);
  expect(matchesLocalQuery(record, "停開")).toBe(true);
});

test("recalls plural word forms from the real dump without fuzzy matching", () => {
  const educationIds = records.flatMap((record) =>
    matchesLocalQuery(record, "education") ? [record.objectID] : [],
  );
  const educationsIds = records.flatMap((record) =>
    matchesLocalQuery(record, "educations") ? [record.objectID] : [],
  );
  const indexedIds = searchFlexSearchIndex(
    flexIndex,
    "educations",
    records.length,
  )
    .filter((id) => matchesLocalQuery(records[Number(id)], "educations"))
    .map((id) => records[Number(id)].objectID);

  expect(educationsIds).toEqual(educationIds);
  expect(new Set(indexedIds)).toEqual(new Set(educationIds));
  expect(queryTerms("educations")).toEqual(["education"]);
});

test("recalls comma-formatted and multi-value teacher names from the real dump", () => {
  const jiangIds = records
    .filter((record) => matchesLocalQuery(record, "JIANG"))
    .map((record) => record.objectID);
  expect(new Set(jiangIds)).toEqual(
    new Set([
      "11510ASTR490000",
      "11510CL  336300",
      "11510GEC 170700",
      "11510HSS 317200",
      "11510MATH101001",
      "11510PHYS317000",
    ]),
  );
  expect(
    records.filter((record) =>
      record.teacher_en.some((teacher) => /^JIANG,/i.test(teacher)),
    ),
  ).toHaveLength(5);

  const leeRecords = records.filter((record) =>
    record.teacher_en.some((teacher) => /LEE, CHING-FU/i.test(teacher)),
  );
  expect(leeRecords).toHaveLength(2);
  expect(
    leeRecords.every((record) => matchesLocalQuery(record, "CHING-FU")),
  ).toBe(true);
  const indexedTeacherIds = new Set(
    searchFlexSearchIndex(flexIndex, "CHING-FU", records.length)
      .filter((id) => matchesLocalQuery(records[Number(id)], "CHING-FU"))
      .map((id) => records[Number(id)].objectID),
  );
  expect(
    leeRecords.every((record) => indexedTeacherIds.has(record.objectID)),
  ).toBe(true);
});

test("ranks broad real-dump queries by intentional field matches", () => {
  const broadIds = (query: string) =>
    rankLocalIds(
      records,
      records.flatMap((record, id) =>
        matchesLocalQuery(record, query) ? [id] : [],
      ),
      query,
    ).map((id) => records[id].objectID);

  expect(broadIds("c").slice(0, 5)).toEqual([
    "11510CHE 116000",
    "11510CHE 211001",
    "11510CHE 211002",
    "11510CHE 241000",
    "11510CHE 301000",
  ]);
  expect(broadIds("education").slice(0, 5)).toEqual([
    "11510ECON707700",
    "11510GPTS523000",
    "11510HSS 345500",
    "11510IBP 100800",
    "11510IMS 500100",
  ]);
});
