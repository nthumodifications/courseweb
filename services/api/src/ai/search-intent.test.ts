import { describe, expect, it } from "bun:test";
import {
  normalizeSearchIntent,
  stripFilterWords,
  detectDepartments,
  normalizeSearchQuery,
  resolveDepartment,
  searchIntentCacheKey,
} from "./search-intent";

const departments = [
  { code: "CS", name_zh: "資工系", name_en: "Computer Science" },
  { code: "EE", name_zh: "電機系", name_en: "Electrical Engineering" },
];

describe("search intent normalization", () => {
  it("resolves department names to real facet codes", () => {
    expect(resolveDepartment("資工", departments)).toBe("CS");
    expect(resolveDepartment("computer science", departments)).toBe("CS");
    expect(resolveDepartment("not a department", departments)).toBeUndefined();
  });

  it("keeps valid facets and drops model hallucinations", () => {
    const result = normalizeSearchIntent(
      {
        query: "  machine learning\n",
        filters: {
          department: ["Computer Science", "made-up department"],
          courseLevel: ["5000", "graduate"],
          language: ["English", "French"],
          separate_times: ["T5", "Sunday9", "M4"],
          tags: ["18 weeks", "not a tag"],
          ge_type: ["核心通識Core GE courses 2", "invented"],
          ge_target: ["*7", "*9"],
          credits: [3, 5, "4"],
        },
        explanation: "  英文、週二上午的資工系課程。\n",
      },
      "zh",
      departments,
    );

    expect(result).toEqual({
      query: "machine learning",
      filters: {
        department: ["CS"],
        courseLevel: ["5000"],
        language: ["英"],
        separate_times: ["T5", "M4"],
        tags: ["18週"],
        ge_type: ["核心通識Core GE courses 2"],
        ge_target: ["*7"],
        credits: [3],
      },
      explanation: "英文、週二上午的資工系課程。",
    });
  });

  it("normalizes cache queries and supplies a language fallback", () => {
    expect(normalizeSearchQuery("  Data\t Structures ")).toBe("data structures");
    expect(searchIntentCacheKey(" Data ", "11510", "en")).toBe(
      "ai_search_intent:v2:11510:en:data",
    );
    expect(
      normalizeSearchIntent({ query: "", filters: {}, explanation: "" }, "en").explanation,
    ).toBe("AI search filters applied.");
  });
});

describe("stripFilterWords", () => {
  it("drops words that only restate filters", () => {
    expect(
      stripFilterWords("核心通識 第三向度 週四晚上", {
        ge_type: ["核心通識Core GE courses 3"],
      }),
    ).toBe("");
    expect(
      stripFilterWords("English computer science courses on Tuesday afternoon", {
        language: ["英"],
      }),
    ).toBe("computer science");
  });

  it("keeps English as a topic when no language filter is set", () => {
    expect(stripFilterWords("英文 寫作", {})).toBe("英文 寫作");
  });

  it("clears a query that is just the chosen department", () => {
    const intent = normalizeSearchIntent(
      { query: "資工", filters: { department: ["CS"] }, explanation: "x" },
      "zh",
    );
    expect(intent.query).toBe("");
    expect(intent.filters.department).toEqual(["CS"]);
  });
});

describe("detectDepartments", () => {
  it("finds departments named outright", () => {
    expect(detectDepartments("週五早上的化學系實驗課")).toEqual(["CHEM"]);
    expect(
      detectDepartments("English-taught economics courses on Wednesday afternoon"),
    ).toEqual(["ECON"]);
    expect(detectDepartments("classes from the department of physics")).toEqual(["PHYS"]);
  });

  it("ignores topic words", () => {
    expect(detectDepartments("intro to quantum physics")).toEqual([]);
  });

  it("backfills a department the model dropped", () => {
    const intent = normalizeSearchIntent(
      { query: "化學系實驗", filters: { separate_times: ["F1"] }, explanation: "x" },
      "zh",
      undefined,
      "週五早上的化學系實驗課",
    );
    expect(intent.filters.department).toEqual(["CHEM"]);
    expect(intent.query).toBe("實驗");
  });
});
