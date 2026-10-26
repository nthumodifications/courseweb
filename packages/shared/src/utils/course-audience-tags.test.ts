import { describe, expect, test } from "bun:test";
import {
  parseCourseAudienceTags,
  type CourseAudienceTag,
  type CourseAudienceTagValue,
} from "./course-audience-tags";

const fixture = (await Bun.file(
  new URL("./__fixtures__/course-audience-tags.json", import.meta.url),
).json()) as Array<{ note: string; restrictions: string }>;

type ExpectedTag = [
  CourseAudienceTag["relation"],
  CourseAudienceTagValue,
  CourseAudienceTag["scope"]?,
];

const project = (tags: readonly CourseAudienceTag[]) =>
  tags.map(({ relation, value, scope }) =>
    scope ? ([relation, value, scope] as const) : ([relation, value] as const),
  );

describe("course audience tags", () => {
  test.each([
    ["限大學部", [["restriction", "undergraduate"]]],
    ["限制大学部", [["restriction", "undergraduate"]]],
    ["限研究所", [["restriction", "graduate"]]],
    ["限碩士班", [["restriction", "master"]]],
    ["限硕士班", [["restriction", "master"]]],
    ["限博士班", [["restriction", "doctoral"]]],
    ["排除大學部", [["exclusion", "undergraduate"]]],
    ["排除大学部", [["exclusion", "undergraduate"]]],
    ["排除碩士班1年級", [["exclusion", "year-1", "master"]]],
    ["限本系學生", [["restriction", "own-department"]]],
    ["限本系", [["restriction", "own-department"]]],
    ["限男生", [["restriction", "male"]]],
    ["限女生", [["restriction", "female"]]],
    ["限外籍生", [["restriction", "international"]]],
    [
      "限大學部1年級",
      [
        ["restriction", "undergraduate"],
        ["restriction", "year-1", "undergraduate"],
      ],
    ],
    [
      "限大學部2年級3年級4年級",
      [
        ["restriction", "undergraduate"],
        ["restriction", "year-2", "undergraduate"],
        ["restriction", "year-3", "undergraduate"],
        ["restriction", "year-4", "undergraduate"],
      ],
    ],
    ["限大一", [["restriction", "year-1", "undergraduate"]]],
    ["限大二以上", [["restriction", "year-2", "undergraduate"]]],
    ["限大三下以後", [["restriction", "year-3", "undergraduate"]]],
    ["限大四期間", [["restriction", "year-4", "undergraduate"]]],
    [
      "限碩二以上",
      [
        ["restriction", "master"],
        ["restriction", "year-2", "master"],
      ],
    ],
    [
      "限博三以上",
      [
        ["restriction", "doctoral"],
        ["restriction", "year-3", "doctoral"],
      ],
    ],
    [
      "限大學部二年級以上",
      [
        ["restriction", "undergraduate"],
        ["restriction", "year-2", "undergraduate"],
      ],
    ],
    [
      "限博士班第二年始得選課",
      [
        ["restriction", "doctoral"],
        ["restriction", "year-2", "doctoral"],
      ],
    ],
    [
      "材料系大學部1年級清班優先",
      [
        ["priority", "undergraduate"],
        ["priority", "year-1", "undergraduate"],
      ],
    ],
    [
      "工學院學士班大學部1年級,醫科系大學部1年級,單號優先",
      [
        ["priority", "undergraduate"],
        ["priority", "year-1", "undergraduate"],
      ],
    ],
    ["資工系大二優先", [["priority", "year-2", "undergraduate"]]],
    ["男生優先", [["priority", "male"]]],
    ["Undergraduate students only", [["restriction", "undergraduate"]]],
    ["Graduate students only", [["restriction", "graduate"]]],
    ["Master's students only", [["restriction", "master"]]],
    ["PhD students only", [["restriction", "doctoral"]]],
    ["Restricted to juniors and above.", [["restriction", "year-3"]]],
    ["Undergraduates excluded", [["exclusion", "undergraduate"]]],
    [
      "大學部及碩士班同學不得點選",
      [
        ["exclusion", "undergraduate"],
        ["exclusion", "master"],
      ],
    ],
    ["限制男生選課", [["restriction", "male"]]],
    [
      "限大学部二年级以上",
      [
        ["restriction", "undergraduate"],
        ["restriction", "year-2", "undergraduate"],
      ],
    ],
    [
      "限硕二以上",
      [
        ["restriction", "master"],
        ["restriction", "year-2", "master"],
      ],
    ],
    [
      "限博三以上",
      [
        ["restriction", "doctoral"],
        ["restriction", "year-3", "doctoral"],
      ],
    ],
    ["限本所學生", [["restriction", "own-department"]]],
    ["限女性", [["restriction", "female"]]],
    ["International students only", [["restriction", "international"]]],
    [
      "Limited to undergraduate juniors",
      [
        ["restriction", "undergraduate"],
        ["restriction", "year-3", "undergraduate"],
      ],
    ],
    ["Graduate students excluded", [["exclusion", "graduate"]]],
    ["Doctoral students preferred", [["priority", "doctoral"]]],
  ] as const)("parses %s", (source, expected: readonly ExpectedTag[]) => {
    expect(project(parseCourseAudienceTags({ note: source }))).toEqual(
      expected,
    );
  });

  test.each([
    "大一英文是共同必修。",
    "本課程介紹大一英文，不代表修課限制。",
    "碩一必修。",
    "博士班專題研究一。",
    "Undergraduate Research",
    "Advanced Undergraduate Research",
    "優先",
    "英文授課，請詳閱課綱。",
  ])("does not infer an audience from ordinary text: %s", (note) => {
    expect(parseCourseAudienceTags({ note })).toEqual([]);
  });

  test("does not turn an instructor restriction into an own-department student tag", () => {
    expect(parseCourseAudienceTags({ note: "指導教授限本系教師。" })).toEqual(
      [],
    );
  });

  test("does not treat an English prerequisite sentence as another audience year", () => {
    expect(
      project(
        parseCourseAudienceTags({
          note: "限化工系博二以上同學，Selectable after successfully completing first year's coursework",
        }),
      ),
    ).toEqual([
      ["restriction", "doctoral"],
      ["restriction", "year-2", "doctoral"],
    ]);
  });

  test("preserves the exact source phrase and prefers restrictions over notes when deduplicating", () => {
    expect(
      parseCourseAudienceTags({
        note: "限大學部二年級以上修習。",
        restrictions: "限大學部2年級",
      }),
    ).toEqual([
      {
        kind: "level",
        value: "undergraduate",
        relation: "restriction",
        source: "限大學部2年級",
      },
      {
        kind: "year",
        value: "year-2",
        relation: "restriction",
        source: "限大學部2年級",
        scope: "undergraduate",
      },
    ]);
  });

  test("parses the trimmed real-course fixture without throwing", () => {
    const taggedRows = fixture.filter(
      ({ note, restrictions }) =>
        parseCourseAudienceTags({ note, restrictions }).length > 0,
    );

    expect(fixture.length).toBe(42);
    expect(taggedRows.length).toBeGreaterThanOrEqual(38);
  });
});
