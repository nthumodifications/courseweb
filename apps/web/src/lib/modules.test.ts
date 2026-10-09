import { describe, expect, mock, test } from "bun:test";
import {
  aggregateModuleOfferings,
  aggregateModuleHistoryRows,
  aggregateModuleSearchRows,
  createModuleKey,
  getInstructorOfferings,
  getModuleHistoryVariant,
  getModuleInstructorSummaries,
  getModuleScores,
  getModuleVariant,
  normalizeCourseTitle,
  parseModuleKey,
  rankModuleSearchResults,
  serializePostgresArrayElement,
} from "./modules";

type SupabaseCall = {
  table: string;
  filter?: { column: string; operator: string; value: string };
  orders: Array<{ column: string; ascending: boolean }>;
  range?: [number, number];
};

const offeringPages: unknown[][] = [];
const supabaseCalls: SupabaseCall[] = [];
const scoreChunks: string[][] = [];

const fakeSupabase = {
  from(table: string) {
    const call: SupabaseCall = { table, orders: [] };
    supabaseCalls.push(call);

    const builder = {
      select: (_columns: string) => builder,
      filter: (column: string, operator: string, value: string) => {
        call.filter = { column, operator, value };
        return builder;
      },
      order: (column: string, options: { ascending: boolean }) => {
        call.orders.push({ column, ascending: options.ascending });
        return builder;
      },
      range: async (from: number, to: number) => {
        call.range = [from, to];
        return { data: offeringPages.shift() ?? [], error: null };
      },
      in: async (_column: string, values: string[]) => {
        scoreChunks.push(values);
        return {
          data: values.map((raw_id) => ({
            raw_id,
            average: 80,
            std_dev: 10,
            type: "percent",
            enrollment: 30,
          })),
          error: null,
        };
      },
    };
    return builder;
  },
};

mock.module("@/config/supabase", () => ({ default: fakeSupabase }));

type ModuleOfferingRow = Parameters<typeof aggregateModuleOfferings>[0][number];
type ModuleSearchRow = Parameters<typeof aggregateModuleSearchRows>[0][number];

const courseRow = (
  rawId: string,
  semester: string,
  classCode: string,
  title = "資料結構導論",
  credits = 3,
): ModuleOfferingRow => ({
  raw_id: rawId,
  semester,
  department: "CS",
  course: "1355",
  class: classCode,
  name_zh: title,
  name_en: "Data Structures",
  prerequisites: null,
  credits,
  language: "英",
  teacher_zh: ["教師"],
  teacher_en: ["Teacher"],
  times: ["M7M8"],
  venues: ["台達館"],
  capacity: 90,
  enrolled: 0,
});

const searchRow = (
  rawId: string,
  semester: string,
  department: string,
  course: string,
  title = "資料結構導論",
  teacher = "教師",
): ModuleSearchRow => ({
  raw_id: rawId,
  semester,
  department,
  course,
  name_zh: title,
  name_en: "Data Structures",
  credits: 3,
  teacher_zh: [teacher],
  teacher_en: [teacher],
});

describe("module keys and title normalization", () => {
  test("normalizes department and course while excluding semester and class", () => {
    expect(createModuleKey(" CS ", " 1355 ")).toBe("CS:1355");
    expect(parseModuleKey("CS:1355")).toEqual({
      department: "CS",
      course: "1355",
    });
    expect(parseModuleKey("CS1355")).toBeNull();
  });

  test("collapses full-width, whitespace, and editorial punctuation", () => {
    expect(normalizeCourseTitle("  資料　結構導論。 ")).toBe("資料 結構導論");
    expect(normalizeCourseTitle("資料 結構導論．")).toBe("資料 結構導論");
  });
});

describe("Supabase module queries", () => {
  test("serializes one PostgreSQL array element", () => {
    expect(
      ["A,B", "{A}", 'A"B', "A\\B", "教師"].map(serializePostgresArrayElement),
    ).toEqual(['"A,B"', '"{A}"', '"A\\"B"', '"A\\\\B"', '"教師"']);
  });

  test("pages instructor offerings past the PostgREST row cap", async () => {
    offeringPages.push(
      Array.from({ length: 1000 }, (_, index) => ({
        raw_id: `first-${index}`,
        semester: "11510",
        department: "CS",
        course: "1355",
      })),
      [
        {
          raw_id: "last",
          semester: "11520",
          department: "CS",
          course: "1355",
        },
      ],
    );

    const offerings = await getInstructorOfferings("A,B");

    expect(offerings).toHaveLength(1001);
    expect(supabaseCalls.map(({ range }) => range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(supabaseCalls[0]?.filter).toEqual({
      column: "teacher_zh",
      operator: "cs",
      value: '{"A,B"}',
    });
    expect(supabaseCalls[0]?.orders).toEqual([
      { column: "semester", ascending: true },
      { column: "raw_id", ascending: true },
    ]);
  });

  test("requests every score id in bounded chunks", async () => {
    const rawIds = Array.from({ length: 601 }, (_, index) => `id-${index}`);

    const scores = await getModuleScores(rawIds);

    expect(scoreChunks).toEqual([
      rawIds.slice(0, 300),
      rawIds.slice(300, 600),
      rawIds.slice(600),
    ]);
    expect(scores.map(({ raw_id }) => raw_id)).toEqual(rawIds);
  });
});

describe("module variants and aggregation", () => {
  test("keeps sections in one stable title variant and sorts semesters", () => {
    const module = aggregateModuleOfferings([
      courseRow("10910CS135502", "10910", "2"),
      courseRow("10810CS135501", "10810", "1"),
      courseRow("10910CS135501", "10910", "1"),
      courseRow("10820CS135500", "10820", "0"),
    ]);

    expect(module?.key).toBe("CS:1355");
    expect(module?.variants).toHaveLength(1);
    expect(module?.variants[0].semesters).toEqual(["10810", "10820", "10910"]);
    expect(
      module?.variants[0].history.map((item) => [
        item.semester,
        item.offerings.length,
      ]),
    ).toEqual([
      ["10810", 1],
      ["10820", 1],
      ["10910", 2],
    ]);
  });

  test("keeps overlapping reused titles separate and selects by URL title", () => {
    const module = aggregateModuleOfferings([
      courseRow("11410CS135501", "11410", "1", "專題研究一", 2),
      courseRow("11510CS135501", "11510", "1", "專題研究二", 2),
      courseRow("11420CS135502", "11420", "2", "專題研究一", 2),
    ]);

    expect(module?.variants).toHaveLength(2);
    expect(getModuleVariant(module!, "專題研究一")?.semesters).toEqual([
      "11410",
      "11420",
    ]);
    expect(getModuleVariant(module!, "unknown")?.nameZh).toBe("專題研究二");
  });

  test("merges a conservative same-credit adjacent rename", () => {
    const module = aggregateModuleOfferings([
      courseRow("11210CS135501", "11210", "1", "資料結構導論"),
      courseRow("11220CS135501", "11220", "1", "資料結構導論"),
      courseRow("11310CS135501", "11310", "1", "資料結構與演算法"),
      courseRow("11320CS135501", "11320", "1", "資料結構與演算法"),
    ]);

    expect(module?.variants).toHaveLength(1);
    expect(module?.variants[0].mergedRename).toBe(true);
    expect(module?.variants[0].titles.map((title) => title.nameZh)).toEqual([
      "資料結構導論",
      "資料結構與演算法",
    ]);
  });

  test("does not merge sequential special-topic titles", () => {
    const module = aggregateModuleOfferings([
      courseRow("11210CS135501", "11210", "1", "專題研究一", 1),
      courseRow("11220CS135501", "11220", "1", "專題研究一", 1),
      courseRow("11310CS135501", "11310", "1", "專題研究二", 1),
      courseRow("11320CS135501", "11320", "1", "專題研究二", 1),
    ]);

    expect(module?.variants).toHaveLength(2);
  });

  test("builds instructor summaries", () => {
    const module = aggregateModuleOfferings([
      courseRow("11010CS135501", "11010", "1"),
      courseRow("11210CS135501", "11210", "1"),
      {
        ...courseRow("11510CS135502", "11510", "2"),
        teacher_zh: ["教師", "助教"],
        teacher_en: ["Teacher", "Assistant"],
      },
    ]);
    const variant = module!.variants[0];

    expect(getModuleInstructorSummaries(variant)).toEqual([
      {
        key: "教師",
        nameZh: "教師",
        nameEn: "Teacher",
        semesterCount: 3,
        latestSemester: "11510",
      },
      {
        key: "助教",
        nameZh: "助教",
        nameEn: "Assistant",
        semesterCount: 1,
        latestSemester: "11510",
      },
    ]);
  });

  test("history-only aggregation selects a title without offering columns", () => {
    const history = aggregateModuleHistoryRows([
      {
        semester: "11410",
        department: "CS",
        course: "1355",
        name_zh: "資料結構導論",
        name_en: "Data Structures",
        credits: 3,
      },
      {
        semester: "11510",
        department: "CS",
        course: "1355",
        name_zh: "資料結構與演算法",
        name_en: "Data Structures and Algorithms",
        credits: 3,
      },
    ]);

    expect(history?.variants).toHaveLength(2);
    expect(
      history && getModuleHistoryVariant(history, "資料結構導論")?.semesters,
    ).toEqual(["11410"]);
  });

  test("groups search rows into module title variants and ranks exact codes first", () => {
    const results = aggregateModuleSearchRows([
      searchRow("11510MA135501", "11510", "MA", "1355", "微積分", "甲老師"),
      searchRow("11310CS135501", "11310", "CS", "1355", "資料結構", "乙老師"),
      searchRow("11410CS135501", "11410", "CS", "1355", "資料結構", "丙老師"),
    ]);

    const ranked = rankModuleSearchResults(results, "CS 1355");
    expect(ranked.map((result) => result.key)).toEqual(["CS:1355", "MA:1355"]);
    expect(ranked[0].latestSemester).toBe("11410");
    expect(
      ranked[0].instructors.map((instructor) => instructor.nameZh),
    ).toEqual(["丙老師"]);
  });
});
