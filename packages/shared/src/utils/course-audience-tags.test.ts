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

const relationCodes = {
  r: "restriction",
  e: "exclusion",
  p: "priority",
} as const;

const valueCodes = {
  u: "undergraduate",
  g: "graduate",
  m: "master",
  d: "doctoral",
  o: "own-department",
  male: "male",
  female: "female",
  i: "international",
  y1: "year-1",
  y2: "year-2",
  y3: "year-3",
  y4: "year-4",
} as const;

type RelationCode = keyof typeof relationCodes;
type ValueCode = keyof typeof valueCodes;

const buildExpectedTags = (shorthand: string): ExpectedTag[] =>
  shorthand.split(" ").map((code) => {
    const [relation, value, scope] = code.split(":") as [
      RelationCode,
      ValueCode,
      ValueCode | undefined,
    ];
    const tag: ExpectedTag = scope
      ? [relationCodes[relation], valueCodes[value], valueCodes[scope]]
      : [relationCodes[relation], valueCodes[value]];
    return tag;
  });

describe("course audience tags", () => {
  test.each([
    ["限大學部", "r:u"],
    ["限制大学部", "r:u"],
    ["限研究所", "r:g"],
    ["限碩士班", "r:m"],
    ["限硕士班", "r:m"],
    ["限博士班", "r:d"],
    ["排除大學部", "e:u"],
    ["排除大学部", "e:u"],
    ["排除碩士班1年級", "e:y1:m"],
    ["限本系學生", "r:o"],
    ["限本系", "r:o"],
    ["限男生", "r:male"],
    ["限女生", "r:female"],
    ["限外籍生", "r:i"],
    ["限大學部1年級", "r:u r:y1:u"],
    ["限大學部2年級3年級4年級", "r:u r:y2:u r:y3:u r:y4:u"],
    ["限大一", "r:y1:u"],
    ["限大二以上", "r:y2:u r:y3:u r:y4:u"],
    ["限大三下以後", "r:y3:u r:y4:u"],
    ["限大四期間", "r:y4:u"],
    ["限碩二以上", "r:m r:y2:m r:y3:m r:y4:m"],
    ["限博三以上", "r:d r:y3:d r:y4:d"],
    ["限大學部二年級以上", "r:u r:y2:u r:y3:u r:y4:u"],
    ["限博士班第二年始得選課", "r:d r:y2:d"],
    ["材料系大學部1年級清班優先", "p:u p:y1:u"],
    ["工學院學士班大學部1年級,醫科系大學部1年級,單號優先", "p:u p:y1:u"],
    ["資工系大二優先", "p:y2:u"],
    ["男生優先", "p:male"],
    ["Undergraduate students only", "r:u"],
    ["Graduate students only", "r:g"],
    ["Master's students only", "r:m"],
    ["PhD students only", "r:d"],
    ["Restricted to juniors and above.", "r:y3 r:y4"],
    ["Undergraduates excluded", "e:u"],
    ["大學部及碩士班同學不得點選", "e:u e:m"],
    ["限制男生選課", "r:male"],
    ["限大学部二年级以上", "r:u r:y2:u r:y3:u r:y4:u"],
    ["限硕二以上", "r:m r:y2:m r:y3:m r:y4:m"],
    ["限博三以上", "r:d r:y3:d r:y4:d"],
    ["限本所學生", "r:o"],
    ["限女性", "r:female"],
    ["International students only", "r:i"],
    ["Limited to undergraduate juniors", "r:u r:y3:u"],
    ["Graduate students excluded", "e:g"],
    ["Doctoral students preferred", "p:d"],
    ["本課程不開放大學部修習", "e:u"],
    ["本課程不開放學士班修習", "e:u"],
    ["本课程不开放大学部修习", "e:u"],
    ["不開放大學生報名", "e:u"],
    ["不得大學部選課", "e:u"],
    ["大學部學生不可選修", "e:u"],
    ["不接受研究生選修", "e:g"],
    ["恕不開放碩士班修習", "e:m"],
    ["不得博士生選課", "e:d"],
    ["恕不開放碩博生選課", "e:m e:d"],
    ["恕不开放硕博生选课", "e:m e:d"],
    ["排除大學", "e:u"],
    ["排除研究生", "e:g"],
    ["排除碩博生", "e:m e:d"],
    ["電機系大三以上", "r:y3:u r:y4:u"],
    ["電機系大三以下", "r:y1:u r:y2:u r:y3:u"],
    ["限碩一以上", "r:m r:y1:m r:y2:m r:y3:m r:y4:m"],
    ["限博一以上", "r:d r:y1:d r:y2:d r:y3:d r:y4:d"],
    ["碩一以上同學", "r:m r:y1:m r:y2:m r:y3:m r:y4:m"],
    ["博一以上同學", "r:d r:y1:d r:y2:d r:y3:d r:y4:d"],
    ["not open to undergraduates", "e:u"],
    ["not open to graduate students", "e:g"],
    ["not open to master's students", "e:m"],
    ["not open to PhD students", "e:d"],
    ["Undergraduates not accepted", "e:u"],
    ["科管院大3,4 以上未選上者", "r:y3:u r:y4:u"],
    ["限碩博生", "r:m r:d"],
    ["限學士班", "r:u"],
    ["限大學生", "r:u"],
    ["限研究生", "r:g"],
    [
      "報名採二階段篩選,詳見課綱, 錄取後以加簽方式選課, 不接受期中停修, 不開放大一新生報名",
      "e:y1:u",
    ],
    [
      "X-Class,大三以下同學請以加簽方式,經任課教師同意後選課",
      "r:y1:u r:y2:u r:y3:u",
    ],
    ["限通訊所研究生，碩士班1年級第一學期不得選修", "r:g e:y1:m"],
    ["歡迎大三以上同學以加簽申請修習", "r:y3:u r:y4:u"],
    ["科管院大3,4 以上未選上者,請第1次上課前線上申請加簽", "r:y3:u r:y4:u"],
    [
      "限碩二以上，修畢華語文教材教法、華語文教學實務、漢語語法學、漢語語言學者",
      "r:m r:y2:m r:y3:m r:y4:m",
    ],
    [
      "大學部2年級3年級4年級優先，第3次選課起開放全校修習",
      "p:u p:y2:u p:y3:u p:y4:u",
    ],
    [
      "電機系大學部3年級4年級,電資院學士班大學部3年級4年級優先，第3次選課起開放全校修習",
      "p:u p:y3:u p:y4:u",
    ],
  ] as const)("parses %s", (source, shorthand) => {
    expect(project(parseCourseAudienceTags({ note: source }))).toEqual(
      buildExpectedTags(shorthand),
    );
  });

  test.each([
    "大一英文是共同必修。",
    "本課程介紹大一英文，不代表修課限制。",
    "碩一必修。",
    "博士班專題研究一。",
    "Undergraduate Research",
    "Advanced Undergraduate Research",
    "本課程不開放停修申請。",
    "不接受旁聽，日語為母語者勿選修。",
    "中文系碩士班學生選修，但不得列入畢業學分計算。",
    "未開放陸生選修。",
    "非本系生需經授課教師同意。",
    "本課程不可旁聽。",
    "大學部同學先修科目C-以上被擋修。",
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
      ["restriction", "year-3", "doctoral"],
      ["restriction", "year-4", "doctoral"],
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
      {
        kind: "year",
        value: "year-3",
        relation: "restriction",
        source: "限大學部二年級以上修習",
        scope: "undergraduate",
      },
      {
        kind: "year",
        value: "year-4",
        relation: "restriction",
        source: "限大學部二年級以上修習",
        scope: "undergraduate",
      },
    ]);
  });

  test("parses the trimmed real-course fixture without throwing", () => {
    const taggedRows = fixture.filter(
      ({ note, restrictions }) =>
        parseCourseAudienceTags({ note, restrictions }).length > 0,
    );

    expect(fixture.length).toBe(68);
    expect(taggedRows.length).toBeGreaterThanOrEqual(38);
  });
});
