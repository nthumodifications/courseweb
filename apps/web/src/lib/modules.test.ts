import { describe, expect, test } from "bun:test";
import {
  aggregateModuleOfferings,
  aggregateModuleHistoryRows,
  aggregateModuleSearchRows,
  createModuleKey,
  getAvailableTerms,
  getModuleAcademicYearGroups,
  getModuleAcademicYears,
  getModuleHistoryVariant,
  getModuleInstructorSummaries,
  getModuleVariant,
  getRecentModuleAcademicYearGroups,
  getRecentSemesterSlots,
  getOfferingPattern,
  inferNextOffering,
  normalizeCourseTitle,
  parseModuleKey,
  rankModuleSearchResults,
  type ModuleOfferingRow,
  type ModuleSearchRow,
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

  test("builds a continuous year range and instructor summaries", () => {
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

    expect(getModuleAcademicYears(variant, "11610")).toEqual([
      "110",
      "111",
      "112",
      "113",
      "114",
      "115",
      "116",
    ]);
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

  test("groups terms inside each academic year in semester order", () => {
    expect(
      getModuleAcademicYearGroups(["10810", "10920", "11030"], "11110"),
    ).toEqual([
      {
        year: "108",
        slots: [
          { semester: "10810", term: "fall", offered: true, predicted: false },
          {
            semester: "10820",
            term: "spring",
            offered: false,
            predicted: false,
          },
          {
            semester: "10830",
            term: "summer",
            offered: false,
            predicted: false,
          },
        ],
      },
      {
        year: "109",
        slots: [
          { semester: "10910", term: "fall", offered: false, predicted: false },
          {
            semester: "10920",
            term: "spring",
            offered: true,
            predicted: false,
          },
          {
            semester: "10930",
            term: "summer",
            offered: false,
            predicted: false,
          },
        ],
      },
      {
        year: "110",
        slots: [
          { semester: "11010", term: "fall", offered: false, predicted: false },
          {
            semester: "11020",
            term: "spring",
            offered: false,
            predicted: false,
          },
          {
            semester: "11030",
            term: "summer",
            offered: true,
            predicted: false,
          },
        ],
      },
      {
        year: "111",
        slots: [
          { semester: "11110", term: "fall", offered: false, predicted: true },
          {
            semester: "11120",
            term: "spring",
            offered: false,
            predicted: false,
          },
          {
            semester: "11130",
            term: "summer",
            offered: false,
            predicted: false,
          },
        ],
      },
    ]);
  });

  test("keeps only the newest academic-year groups for compact strips", () => {
    const groups = getModuleAcademicYearGroups(
      ["10810", "10920", "11010", "11120", "11210"],
      "11310",
    );

    expect(
      getRecentModuleAcademicYearGroups(groups, 4).map((group) => group.year),
    ).toEqual(["110", "111", "112", "113"]);
    expect(getRecentModuleAcademicYearGroups(groups, 10)).toHaveLength(6);
  });

  test("fills recent detail dots with hollow gaps", () => {
    expect(getRecentSemesterSlots(["11410", "11510"], 4)).toEqual([
      { semester: "11320", offered: false },
      { semester: "11410", offered: true },
      { semester: "11420", offered: false },
      { semester: "11510", offered: true },
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
