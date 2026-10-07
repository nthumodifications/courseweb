import { buildPrerequisiteGraph } from "./prerequisite-graph";
import { parsePrerequisites } from "./prerequisites";

const course = {
  raw_id: "11510CS  210401",
  semester: "11510",
  department: "CS",
  course: "210401",
  name_zh: "資料結構",
};

const row = (
  values: Partial<{
    raw_id: string;
    semester: string;
    department: string;
    course: string;
    name_zh: string;
    prerequisites: string | null;
  }> = {},
) => ({
  raw_id: "11510CS  110101",
  semester: "11510",
  department: "CS",
  course: "110101",
  name_zh: "程式設計",
  name_en: null,
  prerequisites: "先修科目 : 曾修資料結構上述條件一定要有，則不擋修。",
  ...values,
});

describe("buildPrerequisiteGraph", () => {
  test("builds any and all groups, including grades and not-taken items", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 離散數學-成績需C-以上曾修線性代數上述條件任選一科，而且未修過資料庫系統上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, []);

    expect(graph.requirements).toEqual([
      {
        mode: "any",
        items: [{ name: "離散數學", minimumGrade: "C-" }, { name: "線性代數" }],
      },
      {
        mode: "all",
        items: [{ name: "資料庫系統", mustNotHaveTaken: true }],
      },
    ]);
    expect(graph.unlocks).toEqual([]);
  });

  test("resolves exact names by department, then newest semester", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修資料結構上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, [
      row({
        raw_id: "11510EE  210001",
        department: "EE",
        course: "210001",
        name_zh: "資料結構",
      }),
      row({
        raw_id: "11420CS  210001",
        semester: "11420",
        department: "CS",
        course: "210001",
        name_zh: "資料結構",
      }),
      row({
        raw_id: "11510CS  210001",
        department: "CS",
        course: "210001",
        name_zh: "資料結構",
      }),
    ]);

    expect(graph.requirements[0].items[0].courseRawId).toBe("11510CS  210001");
  });

  test("leaves unresolved names plain", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修不存在的課程上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, []);

    expect(graph.requirements[0].items[0]).toEqual({
      name: "不存在的課程",
    });
  });

  test("deduplicates unlocks, keeps newest offerings, sorts, and excludes itself", () => {
    const graph = buildPrerequisiteGraph(course, parsePrerequisites(""), [
      row({
        raw_id: "11420EE  300001",
        semester: "11420",
        department: "EE",
        course: "300001",
        name_zh: "舊訊號處理",
      }),
      row({
        raw_id: "11510EE  300001",
        semester: "11510",
        department: "EE",
        course: "300001",
        name_zh: "訊號處理",
      }),
      row({
        raw_id: "11510EE  300001-02",
        semester: "11510",
        department: "EE",
        course: "300001",
        name_zh: "訊號處理第二班",
      }),
      row({
        raw_id: "11510AA  100001",
        department: "AA",
        course: "100001",
        name_zh: "跨域課程",
      }),
      row({
        raw_id: course.raw_id,
        department: course.department,
        course: course.course,
        name_zh: course.name_zh,
      }),
    ]);

    expect(graph.unlocks).toEqual([
      { name: "跨域課程", courseRawId: "11510AA  100001" },
      { name: "訊號處理", courseRawId: "11510EE  300001" },
    ]);
  });
});
