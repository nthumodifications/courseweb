import { describe, expect, test } from "bun:test";
import {
  courseAudienceFacetValues,
  parseCourseAudienceTags,
  type CourseAudienceTag,
  type CourseAudienceTagValue,
} from "./course-audience-tags";
import {
  COURSE_AUDIENCE_NON_MATCHING_CASES,
  COURSE_AUDIENCE_PARSE_CASES,
  COURSE_AUDIENCE_PARSE_TEXT_CASES,
} from "./course-audience-tags.cases";

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
  shorthand
    ? shorthand.split(" ").map((code) => {
        const [relation, value, scope] = code.split(":") as [
          RelationCode,
          ValueCode,
          ValueCode | undefined,
        ];
        const tag: ExpectedTag = scope
          ? [relationCodes[relation], valueCodes[value], valueCodes[scope]]
          : [relationCodes[relation], valueCodes[value]];
        return tag;
      })
    : [];

const parseCases = [
  ...COURSE_AUDIENCE_PARSE_CASES.map(
    ([source, shorthand]) => [{ note: source }, shorthand] as const,
  ),
  ...COURSE_AUDIENCE_PARSE_TEXT_CASES,
];

describe("course audience tags", () => {
  test("serializes stable facet values and keeps scoped years distinct", () => {
    expect(
      courseAudienceFacetValues({
        note: "限碩二以上",
        restrictions: "本課程不開放大學部修習",
      }),
    ).toEqual([
      "exclusion:undergraduate",
      "restriction:master",
      "restriction:year-2:master",
      "restriction:year-3:master",
      "restriction:year-4:master",
    ]);
    expect(
      courseAudienceFacetValues({ note: "Restricted to juniors and above." }),
    ).toEqual(["restriction:year-3", "restriction:year-4"]);
  });

  test.each(parseCases)("parses %j", (text, shorthand) => {
    expect(project(parseCourseAudienceTags(text))).toEqual(
      buildExpectedTags(shorthand),
    );
  });

  test.each(COURSE_AUDIENCE_NON_MATCHING_CASES)(
    "does not infer an audience from ordinary text: %s",
    (note) => {
      expect(parseCourseAudienceTags({ note })).toEqual([]);
    },
  );

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
