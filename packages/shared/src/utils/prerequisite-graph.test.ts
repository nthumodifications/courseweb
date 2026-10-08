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
        items: [
          {
            name: "離散數學",
            courseSearchQuery: "離散數學",
            minimumGrade: "C-",
          },
          { name: "線性代數", courseSearchQuery: "線性代數" },
        ],
      },
      {
        mode: "all",
        items: [
          {
            name: "資料庫系統",
            courseSearchQuery: "資料庫系統",
            mustNotHaveTaken: true,
          },
        ],
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

    expect(graph.requirements[0].items[0]).toMatchObject({
      courseRawId: "11510CS  210001",
      moduleDepartment: "CS",
      moduleCourse: "210001",
    });
  });

  test("resolves prerequisite codes to a module identity", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修NT239上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, [
      row({
        raw_id: "11510NT  000239",
        department: "NT",
        course: "000239",
        name_zh: "歷史與現代世界",
      }),
    ]);

    expect(graph.requirements[0].items[0]).toMatchObject({
      courseRawId: "11510NT  000239",
      moduleDepartment: "NT",
      moduleCourse: "000239",
    });
  });

  test("leaves unresolved names plain", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修不存在的課程上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, []);

    expect(graph.requirements[0].items[0]).toEqual({
      name: "不存在的課程",
      courseSearchQuery: "不存在的課程",
    });
  });

  test("keeps exemption and AP prerequisite names as plain chips", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修微積分一(基本科目免修測試)曾修微積分一(AP先修課程)上述條件任選一科，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, []);

    expect(graph.requirements[0].items).toEqual([
      { name: "微積分一(基本科目免修測試)" },
      { name: "微積分一(AP先修課程)" },
    ]);
  });

  test("does not resolve ambiguous same-department names", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修資料結構上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, [
      row({ course: "210001", name_zh: "資料結構" }),
      row({ course: "210002", name_zh: "資料結構" }),
    ]);

    expect(graph.requirements[0].items[0]).toEqual({
      name: "資料結構",
      courseSearchQuery: "資料結構",
    });
  });

  test("prefers a unique same-department name before other departments", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修邏輯設計上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(
      { ...course, department: "AA" },
      parsed,
      [
        row({
          raw_id: "11510AA  101001",
          department: "AA",
          course: "1010",
          name_zh: "邏輯設計",
        }),
        row({
          raw_id: "11510EECS101001",
          department: "EECS",
          course: "1010",
          name_zh: "邏輯設計",
        }),
      ],
    );

    expect(graph.requirements[0].items[0]).toMatchObject({
      courseRawId: "11510AA  101001",
      moduleDepartment: "AA",
      moduleCourse: "1010",
    });
  });

  test("treats the CS and EECS department family as same-department names", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修邏輯設計上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(course, parsed, [
      row({
        raw_id: "11510EECS101001",
        department: "EECS",
        course: "1010",
        name_zh: "邏輯設計",
      }),
      row({
        raw_id: "11510XA  113300",
        department: "XA",
        course: "1133",
        name_zh: "邏輯設計",
      }),
    ]);

    expect(graph.requirements[0].items[0]).toMatchObject({
      courseRawId: "11510EECS101001",
      moduleDepartment: "EECS",
      moduleCourse: "1010",
    });
  });

  test("uses a unique module across departments when same-department is absent", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修邏輯設計上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(
      { ...course, department: "MATH" },
      parsed,
      [
        row({
          raw_id: "11510EECS101001",
          department: "EECS",
          course: "1010",
          name_zh: "邏輯設計",
        }),
        row({
          raw_id: "11510EECS101002",
          department: "EECS",
          course: "1010",
          name_zh: "邏輯設計",
        }),
      ],
    );

    expect(graph.requirements[0].items[0]).toMatchObject({
      courseRawId: "11510EECS101001",
      moduleDepartment: "EECS",
      moduleCourse: "1010",
    });
  });

  test("leaves a name unresolved when multiple modules remain across departments", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修邏輯設計上述條件一定要有，則不擋修。",
    );
    const graph = buildPrerequisiteGraph(
      { ...course, department: "MATH" },
      parsed,
      [
        row({
          raw_id: "11510EECS101001",
          department: "EECS",
          course: "1010",
          name_zh: "邏輯設計",
        }),
        row({
          raw_id: "11510XA  113300",
          department: "XA",
          course: "1133",
          name_zh: "邏輯設計",
        }),
      ],
    );

    expect(graph.requirements[0].items[0]).toEqual({
      name: "邏輯設計",
      courseSearchQuery: "邏輯設計",
    });
  });

  test("uses the requiring department when deciding whether a name-only prerequisite unlocks a module", () => {
    const chemicalCourse = {
      raw_id: "11510CHE 211001",
      semester: "11510",
      department: "CHE",
      course: "2110",
      name_zh: "工程數學一",
    };
    const prerequisite =
      "先修科目 : 曾修工程數學一上述條件一定要有，則不擋修。";
    const graph = buildPrerequisiteGraph(
      chemicalCourse,
      parsePrerequisites(""),
      [
        row({
          raw_id: chemicalCourse.raw_id,
          semester: chemicalCourse.semester,
          department: chemicalCourse.department,
          course: chemicalCourse.course,
          name_zh: chemicalCourse.name_zh,
          prerequisites: null,
        }),
        row({
          raw_id: "11510BMES211100",
          department: "BMES",
          course: "2111",
          name_zh: "工程數學一",
          prerequisites: null,
        }),
        row({
          raw_id: "11420BMES211200",
          semester: "11420",
          department: "BMES",
          course: "2112",
          name_zh: "工程數學二",
          prerequisites: prerequisite,
        }),
        row({
          raw_id: "11420CHE 212001",
          semester: "11420",
          department: "CHE",
          course: "2120",
          name_zh: "工程數學二",
          prerequisites: prerequisite,
        }),
        row({
          raw_id: "11420CHE 212002",
          semester: "11420",
          department: "CHE",
          course: "2120",
          name_zh: "工程數學二",
          prerequisites: prerequisite,
        }),
      ],
    );

    expect(graph.unlocks).toEqual([
      {
        name: "工程數學二",
        courseRawId: "11420CHE 212001",
        moduleDepartment: "CHE",
        moduleCourse: "2120",
      },
    ]);
  });

  test("keeps same-name unlock modules distinct and puts the anchor department first", () => {
    const anchor = {
      raw_id: "11510AA  100000",
      semester: "11510",
      department: "AA",
      course: "100000",
      name_zh: "錨點課程",
    };
    const prerequisite = "先修科目 : 曾修錨點課程上述條件一定要有，則不擋修。";
    const graph = buildPrerequisiteGraph(anchor, parsePrerequisites(""), [
      row({
        raw_id: anchor.raw_id,
        semester: anchor.semester,
        department: anchor.department,
        course: anchor.course,
        name_zh: anchor.name_zh,
        prerequisites: null,
      }),
      row({
        raw_id: "11420AA  200000",
        semester: "11420",
        department: "AA",
        course: "200000",
        name_zh: "舊同名解鎖",
        prerequisites: prerequisite,
      }),
      row({
        raw_id: "11510AA  200000",
        department: "AA",
        course: "200000",
        name_zh: "同名解鎖",
        prerequisites: prerequisite,
      }),
      row({
        raw_id: "11510BB  200000",
        department: "BB",
        course: "200000",
        name_zh: "同名解鎖",
        prerequisites: prerequisite,
      }),
      row({
        raw_id: "11510CC  300000",
        department: "CC",
        course: "300000",
        name_zh: "同名解鎖",
        prerequisites: prerequisite,
      }),
    ]);

    expect(graph.unlocks).toEqual([
      {
        name: "同名解鎖",
        courseRawId: "11510AA  200000",
        moduleDepartment: "AA",
        moduleCourse: "200000",
      },
      {
        name: "同名解鎖",
        courseRawId: "11510BB  200000",
        moduleDepartment: "BB",
        moduleCourse: "200000",
      },
      {
        name: "同名解鎖",
        courseRawId: "11510CC  300000",
        moduleDepartment: "CC",
        moduleCourse: "300000",
      },
    ]);
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
      {
        name: "跨域課程",
        courseRawId: "11510AA  100001",
        moduleDepartment: "AA",
        moduleCourse: "100001",
      },
      {
        name: "訊號處理",
        courseRawId: "11510EE  300001",
        moduleDepartment: "EE",
        moduleCourse: "300001",
      },
    ]);
  });
});
