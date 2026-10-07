import { describe, expect, test } from "bun:test";
import {
  aggregateModuleOfferings,
  aggregateModuleHistoryRows,
  createModuleKey,
  getAvailableTerms,
  getModuleHistoryVariant,
  getModuleVariant,
  getOfferingPattern,
  inferNextOffering,
  normalizeCourseTitle,
  parseModuleKey,
  type ModuleOfferingRow,
} from "./modules";

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
  credits,
  language: "英",
  teacher_zh: ["教師"],
  teacher_en: ["Teacher"],
  times: ["M7M8"],
  venues: ["台達館"],
  capacity: 90,
  enrolled: 0,
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

  test("only exposes terms that occur in the selected variant", () => {
    const module = aggregateModuleOfferings([
      courseRow("11410CS135501", "11410", "1"),
      courseRow("11510CS135501", "11510", "1"),
    ]);

    expect(getAvailableTerms(module!.variants[0])).toEqual(["fall"]);
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
});

describe("module offering prediction", () => {
  test("predicts a fall-only course still running after the newest known term", () => {
    expect(inferNextOffering(["11310", "11410", "11510"])).toEqual({
      kind: "next",
      semester: "11610",
      term: "fall",
    });
  });

  test("reports a fall-only course stopped after two missed slots", () => {
    expect(inferNextOffering(["11110", "11210"], "11510")).toEqual({
      kind: "stopped",
      semester: "11310",
      term: "fall",
    });
  });

  test("predicts the next spring for an every-semester course", () => {
    expect(
      inferNextOffering(["11310", "11320", "11410", "11420", "11510"]),
    ).toEqual({
      kind: "next",
      semester: "11520",
      term: "spring",
    });
  });

  test("detects an alternating-year course", () => {
    expect(inferNextOffering(["11110", "11310", "11510"])).toEqual({
      kind: "next",
      semester: "11710",
      term: "fall",
    });
  });

  test("supports summer-only histories even though live data has no summer rows", () => {
    expect(inferNextOffering(["11330", "11430", "11530"], "11530")).toEqual({
      kind: "next",
      semester: "11630",
      term: "summer",
    });
  });

  test("does not guess for a brand-new or irregular course", () => {
    expect(inferNextOffering(["11510"])).toBeNull();
    expect(inferNextOffering(["11310", "11420", "11510"])).toBeNull();
  });

  test("recognizes the fall/spring pattern in real semester IDs", () => {
    expect(getOfferingPattern(["10810", "10820", "10910", "10920"])).toBe(
      "fall_spring",
    );
  });
});
