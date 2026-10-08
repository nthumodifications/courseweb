import corpus from "./__fixtures__/prerequisite-corpus.json";
import courseCatalog from "./__fixtures__/prerequisite-course-catalog.json";
import samples from "./__fixtures__/prerequisite-samples.json";
import {
  countPrerequisiteItemMarkers,
  parsePrerequisites,
  type PrerequisiteCourseCandidate,
  type PrerequisiteNode,
} from "./prerequisites";

const catalog: PrerequisiteCourseCandidate[] = [
  {
    raw_id: "11510-CHEM1010-01",
    department: "CHEM",
    course: "1010",
    name_zh: "普通化學一",
  },
  {
    raw_id: "11510-CHEM1020-01",
    department: "CHEM",
    course: "1020",
    name_zh: "普通化學二",
  },
  {
    raw_id: "11510-MATH1010-01",
    department: "MATH",
    course: "1010",
    name_zh: "微積分一",
  },
  {
    raw_id: "11510-MATH1010-02",
    department: "MATH",
    course: "1010",
    name_zh: "微積分一",
  },
  {
    raw_id: "11510-CS2100-01",
    department: "CS",
    course: "2100",
    name_zh: "資料結構",
  },
  {
    raw_id: "11510-EE2100-01",
    department: "EE",
    course: "2100",
    name_zh: "資料結構",
  },
];

const courseTree = (node: PrerequisiteNode): unknown => {
  if (node.type === "course") {
    return {
      type: "course",
      name: node.name,
      ...(node.minimumGrade ? { minimumGrade: node.minimumGrade } : {}),
      ...(node.mustNotHaveTaken ? { mustNotHaveTaken: true } : {}),
    };
  }
  if (node.type === "allOf" || node.type === "anyOf") {
    return { type: node.type, children: node.children.map(courseTree) };
  }
  return { type: node.type, rawText: node.rawText };
};

const courseNodes = (nodes: readonly PrerequisiteNode[]): PrerequisiteNode[] =>
  nodes.flatMap((node) => {
    if (node.type === "course") return [node];
    if (node.type === "allOf" || node.type === "anyOf") {
      return courseNodes(node.children);
    }
    return [];
  });

describe("parsePrerequisites", () => {
  test("parses the official all-of wording and keeps the audience separately", () => {
    const parsed = parsePrerequisites(
      "擋修對象 : 全校\n先修科目 : 普通化學一-成績需C-以上普通化學二-成績需C-以上上述條件一定要有，則不擋修。",
      catalog,
      { currentDepartment: "CHEM" },
    );

    expect(parsed.coverage).toBe("full");
    expect(parsed.audience).toBe("全校");
    expect(parsed.nodes.map(courseTree)).toEqual([
      {
        type: "allOf",
        children: [
          { type: "course", name: "普通化學一", minimumGrade: "C-" },
          { type: "course", name: "普通化學二", minimumGrade: "C-" },
        ],
      },
    ]);
  });

  test("keeps the exact course name while resolving all matching offerings", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 資料結構-成績需C-以上上述條件一定要有，則不擋修。",
      catalog,
      { currentDepartment: "CS" },
    );
    const node = courseNodes(parsed.nodes)[0];

    expect(node).toMatchObject({
      type: "course",
      name: "資料結構",
      resolvedCourseKeys: ["11510-CS2100-01", "11510-EE2100-01"],
      preferredCourseKey: "11510-CS2100-01",
      ambiguous: true,
    });
  });

  test("never resolves a shorter catalog name inside an isolated item", () => {
    const nameCatalog: PrerequisiteCourseCandidate[] = [
      {
        raw_id: "engineering",
        department: "IEEM",
        course: "0000",
        name_zh: "工程數學",
      },
      {
        raw_id: "mathematics",
        department: "MATH",
        course: "0001",
        name_zh: "數學",
      },
    ];
    const parsed = parsePrerequisites(
      "先修科目 : 工程數學-成績需C-以上上述條件一定要有，則不擋修。",
      nameCatalog,
    );
    const node = courseNodes(parsed.nodes)[0];

    expect(node).toMatchObject({
      type: "course",
      name: "工程數學",
      resolvedCourseKeys: ["engineering"],
      ambiguous: false,
      minimumGrade: "C-",
    });
  });

  test("normalizes full-width names for exact resolution", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修Ｃ語言上述條件一定要有，則不擋修。",
      [
        {
          raw_id: "c-language",
          department: "CS",
          course: "0000",
          name_zh: "C語言",
        },
      ],
    );
    const node = courseNodes(parsed.nodes)[0];

    expect(node).toMatchObject({
      type: "course",
      name: "C語言",
      resolvedCourseKeys: ["c-language"],
    });
  });

  test("accepts generated whitespace, punctuation, grade, and name variants", () => {
    const parsed = parsePrerequisites(
      "擋修對象：藝設系\n先修課程：曾修具有以上說明(一)\n未修過第二項(二)數值門檻-成績須B+以上另一個數值門檻-成績需75分以上上述條件任選一科，並且曾修第三項(三)上述條件皆須,則不擋修.",
    );

    expect(parsed).toMatchObject({
      coverage: "full",
      audience: "藝設系",
    });
    expect(parsed.nodes.map(courseTree)).toEqual([
      {
        type: "allOf",
        children: [
          {
            type: "anyOf",
            children: [
              { type: "course", name: "具有以上說明(一)" },
              { type: "course", name: "第二項(二)", mustNotHaveTaken: true },
              { type: "course", name: "數值門檻", minimumGrade: "B+" },
              { type: "course", name: "另一個數值門檻", minimumGrade: "75分" },
            ],
          },
          {
            type: "allOf",
            children: [{ type: "course", name: "第三項(三)" }],
          },
        ],
      },
    ]);
  });

  test("does not split a catalog name that contains an item marker", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修具有曾修字樣的名稱上述條件一定要有，則不擋修。",
      [
        {
          raw_id: "marker-name",
          department: "TEST",
          course: "0000",
          name_zh: "具有曾修字樣的名稱",
        },
      ],
    );

    expect(parsed.coverage).toBe("full");
    expect(parsed.nodes.map(courseTree)).toEqual([
      {
        type: "allOf",
        children: [{ type: "course", name: "具有曾修字樣的名稱" }],
      },
    ]);
  });

  test("parses the five reported corpus examples into the corrected trees", () => {
    const cases = [
      {
        text: "先修科目 : 中級日語二-成績需C-以上高級日語二-成績需C-以上高級日語一-成績需C-以上日語會話二-成績需C-以上曾修日本語能力試驗N3級通過上述條件任選一科，則不擋修。",
        expected: [
          {
            type: "anyOf",
            children: [
              { type: "course", name: "中級日語二", minimumGrade: "C-" },
              { type: "course", name: "高級日語二", minimumGrade: "C-" },
              { type: "course", name: "高級日語一", minimumGrade: "C-" },
              { type: "course", name: "日語會話二", minimumGrade: "C-" },
              {
                type: "course",
                name: "日本語能力試驗N3級通過",
              },
            ],
          },
        ],
      },
      {
        text: "先修科目 : 曾修計算機概論二曾修程式語言曾修資訊系統應用曾修Ｃ語言曾修計算機概論上述條件任選一科，而且曾修工程數學曾修應用數學曾修工程數學一曾修應用數學一上述條件任選一科，則不擋修。",
        expected: [
          {
            type: "allOf",
            children: [
              {
                type: "anyOf",
                children: [
                  { type: "course", name: "計算機概論二" },
                  { type: "course", name: "程式語言" },
                  { type: "course", name: "資訊系統應用" },
                  { type: "course", name: "C語言" },
                  { type: "course", name: "計算機概論" },
                ],
              },
              {
                type: "anyOf",
                children: [
                  { type: "course", name: "工程數學" },
                  { type: "course", name: "應用數學" },
                  { type: "course", name: "工程數學一" },
                  { type: "course", name: "應用數學一" },
                ],
              },
            ],
          },
        ],
      },
      {
        text: "先修科目 : 未修過現代社會與心理未修過心理學與現代生活未修過普通心理學未修過心理學未修過心理學(基本科目免修測試)未修過普通心理學一未修過普通心理學二上述條件一定要有，則不擋修。",
        expected: [
          {
            type: "allOf",
            children: [
              {
                type: "course",
                name: "現代社會與心理",
                mustNotHaveTaken: true,
              },
              {
                type: "course",
                name: "心理學與現代生活",
                mustNotHaveTaken: true,
              },
              {
                type: "course",
                name: "普通心理學",
                mustNotHaveTaken: true,
              },
              { type: "course", name: "心理學", mustNotHaveTaken: true },
              {
                type: "course",
                name: "心理學(基本科目免修測試)",
                mustNotHaveTaken: true,
              },
              {
                type: "course",
                name: "普通心理學一",
                mustNotHaveTaken: true,
              },
              {
                type: "course",
                name: "普通心理學二",
                mustNotHaveTaken: true,
              },
            ],
          },
        ],
      },
      {
        text: "先修科目 : 大學中文-成績需C-以上基礎寫作-成績需C-以上上述條件任選一科，則不擋修。",
        expected: [
          {
            type: "anyOf",
            children: [
              { type: "course", name: "大學中文", minimumGrade: "C-" },
              { type: "course", name: "基礎寫作", minimumGrade: "C-" },
            ],
          },
        ],
      },
      {
        text: "先修科目 : CEFR A1通過-成績需C-以上中級法語一-成績需C-以上上述條件任選一科，則不擋修。",
        expected: [
          {
            type: "anyOf",
            children: [
              { type: "course", name: "CEFR A1通過", minimumGrade: "C-" },
              { type: "course", name: "中級法語一", minimumGrade: "C-" },
            ],
          },
        ],
      },
    ];

    for (const testCase of cases) {
      const parsed = parsePrerequisites(testCase.text);
      expect(parsed.coverage).toBe("full");
      expect(parsed.unparsedRemainder).toBe("");
      expect(parsed.nodes.map(courseTree)).toEqual(testCase.expected);
    }
  });

  test("preserves full-width names inside a corrected any-of group", () => {
    const parsed = parsePrerequisites(
      "先修科目 : 曾修計算機概論二曾修程式語言曾修資訊系統應用曾修Ｃ語言曾修計算機概論上述條件任選一科，則不擋修。",
    );

    expect(parsed.nodes.map(courseTree)).toEqual([
      {
        type: "anyOf",
        children: [
          { type: "course", name: "計算機概論二" },
          { type: "course", name: "程式語言" },
          { type: "course", name: "資訊系統應用" },
          { type: "course", name: "C語言" },
          { type: "course", name: "計算機概論" },
        ],
      },
    ]);
  });

  test.each(samples.entries)(
    "handles the hand-checked sample: $category",
    (sample) => {
      const parsed = parsePrerequisites(sample.text);
      const grammarCategories = new Set([
        "courseName",
        "anyOf",
        "allOf",
        "grade",
      ]);

      if (grammarCategories.has(sample.category)) {
        expect(parsed.coverage).toBe("full");
        expect(parsed.unparsedRemainder).toBe("");
      } else {
        expect(parsed.coverage).toBe("untouched");
        expect(parsed.nodes).toEqual([
          { type: "unparsed", rawText: sample.text },
        ]);
      }
    },
  );

  test("the sample table covers every observed category", () => {
    const categories = new Set(
      samples.entries.map((sample) => sample.category),
    );

    expect(samples.entries).toHaveLength(84);
    expect(categories).toEqual(
      new Set([
        "courseName",
        "courseNumber",
        "anyOf",
        "allOf",
        "grade",
        "departmentYear",
        "corequisite",
        "consent",
        "html",
        "english",
        "garbage",
      ]),
    );
  });

  test("parses every generated corpus entry with the exact item count", () => {
    const results = corpus.entries.map((text) =>
      parsePrerequisites(text, courseCatalog.entries),
    );
    const itemCounts = results.map(
      (result) => courseNodes(result.nodes).length,
    );

    expect(results.every((result) => result.coverage === "full")).toBe(true);
    expect(results.every((result) => result.unparsedRemainder === "")).toBe(
      true,
    );
    corpus.entries.forEach((text, index) => {
      expect(itemCounts[index]).toBe(countPrerequisiteItemMarkers(text));
    });

    const totalItems = itemCounts.reduce((sum, count) => sum + count, 0);
    console.log(
      `Prerequisite grammar coverage: ${results.length}/${results.length} full; ${totalItems} items; 0 remainder`,
    );
    expect(totalItems).toBe(960);
  });

  test("leaves non-prerequisite free-form text verbatim", () => {
    const raw = "請參閱系網頁最新公告。";
    const parsed = parsePrerequisites(raw, catalog);

    expect(parsed.coverage).toBe("untouched");
    expect(parsed.unparsedRemainder).toBe(raw);
    expect(parsed.nodes).toEqual([{ type: "unparsed", rawText: raw }]);
  });
});
