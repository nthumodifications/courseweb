import { describe, expect, test } from "bun:test";
import {
  compileRefinements,
  matchesCondition,
  parseFilterCondition,
  parseFilterExpression,
} from "./filters";
import { facetValues, prepareSearchRecord, searchableText } from "./projection";
import { rankLocalIds, remoteRankScore } from "./ranking";
import {
  conflict,
  freeOnDay,
  maskFromSeparateTimes,
  maskFromTimes,
  maskHasOverlap,
  slotIndex,
  usesOnly,
  zeroConflicts,
} from "./time-mask";
import {
  matchesCourseCode,
  cjkTermMatchScore,
  isSemesterOnlyQuery,
  matchesLocalQuery,
  normalizeLatinWord,
  parseCourseCodeQuery,
  queryTerms,
  tokenizeCjk,
} from "./tokenizer";
import fixture from "./__fixtures__/courses-11510.json";
import fullFixture from "./__fixtures__/courses-11510-full.json";
import teacherFixture from "./__fixtures__/teacher-chen.json";

const record = (overrides: Record<string, unknown> = {}) =>
  prepareSearchRecord({
    ...fixture[0],
    raw_id: "11510AES 450100",
    course: "450",
    class: "1",
    name_zh: "環境微生物學",
    name_en: "Environmental Microbiology",
    teacher_zh: ["王老師"],
    teacher_en: ["Wang"],
    venues: ["人社B館105"],
    times: ["W2W3W4"],
    tags: ["X-Class"],
    credits: 3,
    language: "英",
    compulsory_for: ["原科院學士班112B"],
    ...overrides,
  });

const fullRecords = fullFixture.map((value) => prepareSearchRecord(value));

describe("local-search tokenization", () => {
  test.each([
    ["AES courses", ["aes", "course"]],
    ["人工智慧", ["人工智慧"]],
    ["", []],
  ])("builds query terms for %j", (query, expected) => {
    expect(queryTerms(query)).toEqual(expected);
  });

  test.each([
    ["courses", ["courses"]],
    ["人工", ["人", "工", "人工"]],
  ])("tokenizes %s", (value, expected) => {
    expect(tokenizeCjk(value)).toEqual(expected);
  });

  test.each([
    ["classes", "class"],
    ["buses", "buse"],
    ["analysis", "analysis"],
  ])("normalizes latin word %s", (value, expected) => {
    expect(normalizeLatinWord(value)).toBe(expected);
  });

  test("matches CJK phrases and word prefixes without mid-word expansion", () => {
    const value = record();
    expect(matchesLocalQuery(value, "環境微生物")).toBe(true);
    expect(matchesLocalQuery(value, "env")).toBe(true);
    expect(matchesLocalQuery(value, "wang")).toBe(true);
    expect(
      matchesLocalQuery(record({ name_en: "Artificial Intelligence" }), "art"),
    ).toBe(true);
    expect(matchesLocalQuery(record({ name_en: "Air Pollution" }), "AI")).toBe(
      false,
    );
    expect(matchesLocalQuery(record({ department: "EECS" }), "EECS")).toBe(
      true,
    );
  });

  test.each([
    ["CS1355", ["11510CS  135501", "11510CS  135502"]],
    ["cs1355", ["11510CS  135501", "11510CS  135502"]],
    ["EE2310", ["11510EE  231001", "11510EE  231002"]],
    ["EE 2310", ["11510EE  231001", "11510EE  231002"]],
    ["CS 135500", ["11510CS  135501", "11510CS  135502"]],
    ["CS135500", ["11510CS  135501", "11510CS  135502"]],
    ["11510CS  135500", ["11510CS  135501", "11510CS  135502"]],
    ["11510CS135500", ["11510CS  135501", "11510CS  135502"]],
  ] as const)(
    "finds all sections for code-like query %s",
    (query, expected) => {
      const ids = fullRecords
        .filter((value) => matchesLocalQuery(value, query))
        .map((value) => value.objectID);
      expect(parseCourseCodeQuery(query)).toBeDefined();
      expect(ids).toEqual(expected);
    },
  );

  test("matches a parsed course code against the course number prefix", () => {
    const value = record({ department: "CS", course: "1355" });
    expect(matchesCourseCode(value, parseCourseCodeQuery("CS135500")!)).toBe(
      true,
    );
    expect(parseCourseCodeQuery("11510")).toBeUndefined();
    expect(isSemesterOnlyQuery("11510")).toBe(true);
    expect(
      fullRecords.filter((item) => matchesLocalQuery(item, "11510")),
    ).toEqual([]);
  });
});

describe("local-search projection and ranking", () => {
  test("normalizes fixture-shaped nullable fields and derives search fields", () => {
    const value = record({ credits: "3", enrolled: "20", separate_times: [] });
    expect(value).toMatchObject({
      objectID: "11510AES 450100",
      credits: 3,
      enrolled: 20,
      separate_times: ["W2", "W3", "W4"],
      for_class: ["原科院學士班112B"],
    });
    expect(searchableText(value)).toContain("environmental microbiology");
    expect(facetValues(value, "department")).toEqual(["AES"]);
  });

  test("ranks exact and prefix matches before stable id tie-breaks", () => {
    const exact = record({ raw_id: "11510AES 450100", course: "450" });
    const prefix = record({ raw_id: "11510AES 450200", course: "4502" });
    expect(remoteRankScore(exact, ["450"])).toBeGreaterThan(
      remoteRankScore(prefix, ["450"]),
    );
    expect(rankLocalIds([prefix, exact], [0, 1], "450")).toEqual([1, 0]);
  });

  test("ranks department codes before exact titles and exact titles before prefixes", () => {
    const code = record({
      raw_id: "11510ART 100100",
      objectID: "11510ART 100100",
      department: "ART",
      name_en: "Art Basics",
    });
    const exactTitle = record({
      raw_id: "11510ZZZ 200100",
      objectID: "11510ZZZ 200100",
      department: "ZZZ",
      name_en: "Art",
    });
    const titlePrefix = record({
      raw_id: "11510ZZZ 300100",
      objectID: "11510ZZZ 300100",
      department: "ZZZ",
      name_en: "Artificial Intelligence",
    });

    expect(
      rankLocalIds([titlePrefix, exactTitle, code], [0, 1, 2], "art"),
    ).toEqual([2, 1, 0]);
  });

  test("ranks short-gap CJK ordinal matches below contiguous matches", () => {
    const contiguous = record({ name_zh: "微積分一" });
    const separated = record({ name_zh: "微積分Ａ一" });
    expect(rankLocalIds([separated, contiguous], [0, 1], "微積分一")).toEqual([
      1, 0,
    ]);
  });

  test("checks later leading ordinal occurrences after a long first gap", () => {
    expect(cjkTermMatchScore("一甲乙丙丁一微積", "一微積")).toBe(1);
  });

  test.each([
    ["chen", "teacher_en"],
    ["李清福", "teacher_zh"],
    ["LEE, CHING-FU", "teacher_en"],
  ] as const)(
    "puts whole-token teacher matches first for %s",
    (query, field) => {
      const ids = fullRecords.flatMap((value, index) =>
        matchesLocalQuery(value, query) ? [index] : [],
      );
      const ranked = rankLocalIds(fullRecords, ids, query);
      const teacherMatch = (value: (typeof fullRecords)[number]) =>
        value[field].some((teacher) => {
          const normalizedTeacher = teacher.normalize("NFKC").toLowerCase();
          const normalizedQuery = query.normalize("NFKC").toLowerCase();
          if (normalizedTeacher === normalizedQuery) return true;
          const tokens = tokenizeCjk(normalizedTeacher);
          return queryTerms(query).every((term) => tokens.includes(term));
        });
      const wholeTeacherMatches = ranked.filter((index) =>
        teacherMatch(fullRecords[index]!),
      ).length;
      expect(
        ranked
          .slice(0, Math.min(10, wholeTeacherMatches))
          .every((index) => teacherMatch(fullRecords[index]!)),
      ).toBe(true);
    },
  );

  test("ranks a whole-token Chen teacher above incidental title matches", () => {
    const records = teacherFixture.map((value) => prepareSearchRecord(value));
    expect(rankLocalIds(records, [0, 1], "chen")).toEqual([1, 0]);
  });

  const orderingRecords = [
    record({
      raw_id: "11510MATH 101002",
      objectID: "11510MATH 101002",
      department: "MATH",
      course: "1010",
      class: "2",
      name_en: "Calculus",
    }),
    record({
      raw_id: "11510CS  101002",
      objectID: "11510CS  101002",
      department: "CS",
      course: "1010",
      class: "2",
      name_en: "Calculus",
    }),
    record({
      raw_id: "11510CS  200001",
      objectID: "11510CS  200001",
      department: "CS",
      course: "2000",
      class: "1",
      name_en: "Calculus",
    }),
    record({
      raw_id: "11510CS  101001",
      objectID: "11510CS  101001",
      department: "CS",
      course: "1010",
      class: "1",
      name_en: "Calculus",
    }),
  ];

  test.each([
    ["browse", "", [3, 2, 1, 0], [3, 2, 1, 0]],
    ["query", "1010", [0, 1, 3], [3, 0, 1]],
  ] as const)(
    "%s keeps the old course ordering contract",
    (_name, query, input, expected) => {
      expect(rankLocalIds(orderingRecords, input, query)).toEqual(expected);
    },
  );
});

describe("time masks and local refinements", () => {
  test.each([
    ["M", "1", 0],
    ["U", "d", 97],
    ["?", "1", -1],
  ])("maps time slot %s%s", (day, period, expected) => {
    expect(slotIndex(day, period)).toBe(expected);
  });

  test("handles compact and separate timetable values at boundaries", () => {
    const compact = maskFromTimes(["M1M2", "Ud"]);
    const separate = maskFromSeparateTimes(["M1", "M2", "Ud"]);
    expect(maskHasOverlap(compact, separate)).toBe(true);
    expect(freeOnDay(compact, "T")).toBe(true);
    expect(freeOnDay(compact, 7)).toBe(false);
    expect(usesOnly(["M1"], separate)).toBe(true);
  });

  test("treats unknown schedules conservatively and preserves collection order", () => {
    const occupied = maskFromSeparateTimes(["M1"]);
    expect(conflict([], occupied)).toBe(true);
    expect(zeroConflicts(["M1"], occupied)).toBe(false);
    expect(zeroConflicts([["M2"], ["M1"], []], occupied)).toEqual([["M2"]]);
  });

  test("combines facet groups, numeric limits, and expression filters", () => {
    const value = record();
    const matcher = compileRefinements({
      facetFilters: [["department:AES", "department:BAI"], "language=英"],
      numericFilters: ["credits>=3"],
      filters: "courseLevel=4000 OR tags:X-Class",
    });
    expect(matcher(value)).toBe(true);
    expect(matchesCondition(value, parseFilterCondition("credits>3")!)).toBe(
      false,
    );
    expect(parseFilterExpression("(department:AES AND credits=3)")).not.toBe(
      null,
    );
  });
});
