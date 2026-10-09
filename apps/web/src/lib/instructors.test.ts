import { describe, expect, test } from "bun:test";
import {
  clusterEnglishNames,
  getInstructorGradeHistory,
  getInstructorEnglishNames,
  groupInstructorOfferings,
  isInstructorPageName,
  normaliseInstructorName,
  pairInstructorNames,
} from "./instructors";
import type { ModuleOffering } from "./modules";
import type { InsightOffering } from "./module-insights";

const offering = (over: Partial<ModuleOffering>): ModuleOffering => ({
  raw_id: "11310CS  135501",
  semester: "11310",
  department: "CS",
  course: "1355",
  class: "01",
  name_zh: "課程",
  name_en: "Course",
  prerequisites: null,
  credits: 3,
  language: "英",
  teacher_zh: ["王嬿婷"],
  teacher_en: ["WANG, YEN-TING"],
  times: ["M7M8R6"],
  venues: ["台達館"],
  capacity: 50,
  enrolled: 40,
  ...over,
});

const insightOffering = (over: Partial<InsightOffering>): InsightOffering => ({
  raw_id: "a",
  semester: "11310",
  teacher_zh: ["王嬿婷"],
  teacher_en: ["WANG, YEN-TING"],
  times: [],
  language: null,
  capacity: null,
  enrolled: null,
  ...over,
});

describe("instructor helpers", () => {
  test("normalises entities, width, whitespace, and trimming", () => {
    expect(normaliseInstructorName("  ＨＵＡＮＧ,&nbsp; PO-CHIUN&#160; ")).toBe(
      "HUANG, PO-CHIUN",
    );
  });

  test("clusters spelling variants but preserves namesakes", () => {
    const cases = [
      ["HUANG, PO-CHIUN", "HUANG, PO-CHUN", "HUANG, PO-CHIUN&#160;"],
      ["ALBERT KONG", "KWOK HING ALBERT KONG"],
      ["LIN, ZONG-HONG", "LIN, TZONG-HONG"],
      ["CHEN, CHIEN-CHUN", "CHEN, CHEIN-CHUN"],
    ];
    for (const names of cases) {
      expect(clusterEnglishNames(names)).toHaveLength(1);
    }
    expect(clusterEnglishNames(["TAN KOK HWA", "CHEN, KUO-HUA"])).toHaveLength(
      2,
    );
    expect(clusterEnglishNames(["HSU,JEN-HAO", "XU, REN-HAO"])).toHaveLength(2);
  });

  test("pairs bilingual names only on equal-length rows", () => {
    expect(
      pairInstructorNames(["王嬿婷", "陳國華"], ["WANG, YEN-TING"]),
    ).toEqual([]);
    expect(
      pairInstructorNames(
        ["王嬿婷", "陳國華"],
        ["WANG, YEN-TING", "CHEN, KUO-HUA"],
      ),
    ).toEqual([
      { nameZh: "王嬿婷", nameEn: "WANG, YEN-TING" },
      { nameZh: "陳國華", nameEn: "CHEN, KUO-HUA" },
    ]);
    expect(
      getInstructorEnglishNames(
        [
          offering({ teacher_en: ["WANG, YEN-TING"] }),
          offering({ teacher_en: ["WANG, YEN-TING"] }),
          offering({ teacher_en: ["WANG, YEN-TING&#160;"] }),
          offering({ teacher_zh: ["王嬿婷", "陳國華"], teacher_en: ["WANG"] }),
        ],
        "王嬿婷",
      ),
    ).toEqual(["WANG, YEN-TING"]);
  });

  test("recognises person names and excludes known group labels", () => {
    expect(isInstructorPageName("")).toBe(false);
    expect(isInstructorPageName("EMS境外專班")).toBe(false);
    expect(isInstructorPageName("清華學院學士班")).toBe(false);
    expect(isInstructorPageName("SNHCC Prog")).toBe(false);
    expect(isInstructorPageName("服科所全體教師")).toBe(false);
    expect(isInstructorPageName("王嬿婷")).toBe(true);
    expect(isInstructorPageName("NYCU洪慧念")).toBe(true);
    expect(isInstructorPageName("TORSTEN MEYE")).toBe(true);
  });

  test("groups module offerings by the existing module key, newest first", () => {
    const groups = groupInstructorOfferings([
      offering({ raw_id: "a", semester: "11210" }),
      offering({ raw_id: "b", semester: "11310" }),
      offering({
        raw_id: "c",
        department: "MATH",
        course: "1010",
        semester: "11320",
      }),
    ]);
    expect(groups.map(({ key }) => key)).toEqual(["MATH:1010", "CS:1355"]);
    expect(groups[1].offerings.map(({ semester }) => semester)).toEqual([
      "11310",
      "11210",
    ]);
  });

  test("uses per-offering grades below three published offerings", () => {
    const offerings = [
      insightOffering({ raw_id: "a", semester: "11310" }),
      insightOffering({ raw_id: "b", semester: "11320" }),
    ];
    const history = getInstructorGradeHistory(
      offerings,
      offerings.map((item) => ({
        raw_id: item.raw_id,
        average: 80,
        std_dev: 10,
        type: "percent",
        enrollment: 30,
      })),
      "王嬿婷",
    );
    expect(history.mode).toBe("offerings");
    expect(history.average).toEqual({
      type: "percent",
      count: 2,
      average: 80,
    });
    expect(history.offerings.map(({ raw_id }) => raw_id)).toEqual(["a", "b"]);
  });

  test("uses the module-page summary rule after three published offerings", () => {
    const offerings = [
      insightOffering({ raw_id: "a", semester: "11310" }),
      insightOffering({ raw_id: "b", semester: "11320" }),
      insightOffering({ raw_id: "c", semester: "11330" }),
    ];
    const history = getInstructorGradeHistory(
      offerings,
      offerings.map((item, index) => ({
        raw_id: item.raw_id,
        average: 70 + index * 10,
        std_dev: 10,
        type: "percent",
        enrollment: 30,
      })),
      "王嬿婷",
    );
    expect(history.mode).toBe("average");
    expect(history.average).toEqual({
      type: "percent",
      count: 3,
      average: 80,
    });
  });
});
