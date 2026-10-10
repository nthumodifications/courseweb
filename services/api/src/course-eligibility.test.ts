import { describe, expect, test } from "bun:test";
import {
  canSelect,
  eligibilitySummary,
  parseCourseRestrictions,
  parseCourseRestrictionsWithSpans,
  type CourseEligibility,
  type EligibilityClause,
} from "./course-eligibility";

type FixtureCourse = { raw_id: string; restrictions?: string | null };

const fixture = (await Bun.file(
  new URL(
    "../../../apps/web/src/lib/local-search/__fixtures__/courses-11510.json",
    import.meta.url,
  ),
).json()) as FixtureCourse[];
const fullFixture = (await Bun.file(
  new URL(
    "../../../apps/web/src/lib/local-search/__fixtures__/courses-11510-full.json",
    import.meta.url,
  ),
).json()) as FixtureCourse[];

const clause = (
  kind: "include" | "exclude",
  values: Omit<EligibilityClause, "kind">,
): EligibilityClause => ({ kind, ...values });

describe("course restriction grammar", () => {
  test.each([
    ["限大學部", [clause("include", { level: "undergraduate" })]],
    [
      "排除碩士班1年級2年級",
      [clause("exclude", { level: "master", years: [1, 2] })],
    ],
    [
      "限資工系大學部3年級4年級",
      [
        clause("include", {
          unit: "資工系",
          level: "undergraduate",
          years: [3, 4],
        }),
      ],
    ],
    [
      "限碩士班博士班",
      [
        clause("include", { level: "master" }),
        clause("include", { level: "doctoral" }),
      ],
    ],
    [
      "限電機系大學部3年級4年級,電資院學士班大學部3年級4年級",
      [
        clause("include", {
          unit: "電機系",
          level: "undergraduate",
          years: [3, 4],
        }),
        clause("include", {
          unit: "電資院學士班",
          level: "undergraduate",
          years: [3, 4],
        }),
      ],
    ],
    [
      "限大學部1年級2年級專班1年級2年級",
      [
        clause("include", { level: "undergraduate", years: [1, 2] }),
        clause("include", { level: "special-program", years: [1, 2] }),
      ],
    ],
  ] as const)("parses %s", (source, expected) => {
    expect(parseCourseRestrictions(source)).toEqual({
      clauses: expected,
      unparsed: [],
    });
  });

  test.each([
    [
      "醫環系優先，第3次選課起開放全校修習",
      [clause("include", { unit: "醫環系" })],
    ],
    [
      "數學系大學部1年級,理學院學士班大學部1年級優先，第3次選課起開放全校修習",
      [
        clause("include", {
          unit: "數學系",
          level: "undergraduate",
          years: [1],
        }),
        clause("include", {
          unit: "理學院學士班",
          level: "undergraduate",
          years: [1],
        }),
      ],
    ],
  ] as const)(
    "consumes recognized selection priority %s",
    (source, expected) => {
      expect(parseCourseRestrictions(source)).toEqual({
        clauses: expected,
        unparsed: [],
        selectionPriority: true,
      });
    },
  );

  test("keeps unknown text as an exact unparsed remainder", () => {
    expect([
      parseCourseRestrictions("限大學部2年級以上"),
      parseCourseRestrictions("限大學部,前標生"),
    ]).toEqual([
      {
        clauses: [clause("include", { level: "undergraduate", years: [2] })],
        unparsed: ["以上"],
      },
      {
        clauses: [clause("include", { level: "undergraduate" })],
        unparsed: ["前標生"],
      },
    ]);
  });

  test("accepts multiple machine clauses separated by whitespace", () => {
    expect(parseCourseRestrictions("限大學部 排除碩士班1年級")).toEqual({
      clauses: [
        clause("include", { level: "undergraduate" }),
        clause("exclude", { level: "master", years: [1] }),
      ],
      unparsed: [],
    });
  });

  test.each([
    [
      "排除EMBA專班專班1年級",
      [
        clause("exclude", {
          unit: "EMBA專班",
          level: "special-program",
          years: [1],
        }),
      ],
    ],
    [
      "限MBA專班專班2年級",
      [
        clause("include", {
          unit: "MBA專班",
          level: "special-program",
          years: [2],
        }),
      ],
    ],
    [
      "限專班1年級",
      [clause("include", { level: "special-program", years: [1] })],
    ],
    [
      "限幼教系在職專班專班",
      [clause("include", { unit: "幼教系在職專班", level: "special-program" })],
    ],
    [
      "限EMBA雙聯專班1年級2年級3年級4年級",
      [
        clause("include", {
          unit: "EMBA雙聯",
          level: "special-program",
          years: [1, 2, 3, 4],
        }),
      ],
    ],
    ["限EMBA專班", [clause("include", { unit: "EMBA專班" })]],
    [
      "限亞際文化碩士學程碩士班",
      [
        clause("include", {
          unit: "亞際文化碩士學程",
          level: "master",
        }),
      ],
    ],
    [
      "限全球營運管理碩士學程碩士班2年級3年級4年級",
      [
        clause("include", {
          unit: "全球營運管理碩士學程",
          level: "master",
          years: [2, 3, 4],
        }),
      ],
    ],
    [
      "限中等教育學程生",
      [clause("include", { level: "secondary-teacher-education" })],
    ],
    [
      "限國小教育學程生",
      [clause("include", { level: "primary-teacher-education" })],
    ],
    [
      "限智慧生醫博士學程博士班1年級",
      [
        clause("include", {
          unit: "智慧生醫博士學程",
          level: "doctoral",
          years: [1],
        }),
      ],
    ],
    [
      "限學前特教在職學位學程專班",
      [clause("include", { unit: "學前特教在職學位學程專班" })],
    ],
    [
      "限幼教系,幼教系在職專班",
      [
        clause("include", { unit: "幼教系" }),
        clause("include", { unit: "幼教系在職專班" }),
      ],
    ],
    ["限環文系在職專班", [clause("include", { unit: "環文系在職專班" })]],
    [
      "限運科系在職專班專班",
      [
        clause("include", {
          unit: "運科系在職專班",
          level: "special-program",
        }),
      ],
    ],
    [
      "限碩士班博士班專班",
      [
        clause("include", { level: "master" }),
        clause("include", { level: "doctoral" }),
        clause("include", { level: "special-program" }),
      ],
    ],
    [
      "限財金專班專班1年級",
      [
        clause("include", {
          unit: "財金專班",
          level: "special-program",
          years: [1],
        }),
      ],
    ],
    [
      "限華德福在職學位學程專班2年級3年級4年級",
      [
        clause("include", {
          unit: "華德福在職學位學程",
          level: "special-program",
          years: [2, 3, 4],
        }),
      ],
    ],
    [
      "限AI智造暨聯網產碩專班碩士班2年級3年級4年級",
      [
        clause("include", {
          unit: "AI智造暨聯網產碩專班",
          level: "master",
          years: [2, 3, 4],
        }),
      ],
    ],
    [
      "限國際半導體IC專班碩士班2年級",
      [
        clause("include", {
          unit: "國際半導體IC專班",
          level: "master",
          years: [2],
        }),
      ],
    ],
    [
      "限半導體學院碩士班博士班,材料系碩士班博士班,前瞻產博學程碩士班博士班",
      [
        clause("include", { unit: "半導體學院", level: "master" }),
        clause("include", { unit: "半導體學院", level: "doctoral" }),
        clause("include", { unit: "材料系", level: "master" }),
        clause("include", { unit: "材料系", level: "doctoral" }),
        clause("include", { unit: "前瞻產博學程", level: "master" }),
        clause("include", { unit: "前瞻產博學程", level: "doctoral" }),
      ],
    ],
    [
      "排除大學部1年級2年級專班1年級2年級",
      [
        clause("exclude", { level: "undergraduate", years: [1, 2] }),
        clause("exclude", { level: "special-program", years: [1, 2] }),
      ],
    ],
    [
      "限教育學院,專班",
      [
        clause("include", { unit: "教育學院" }),
        clause("include", { level: "special-program" }),
      ],
    ],
    [
      "限永續科技學程碩士班",
      [clause("include", { unit: "永續科技學程", level: "master" })],
    ],
    [
      "限華語文碩士學位學程",
      [clause("include", { unit: "華語文碩士學位學程" })],
    ],
  ] as const)("parses real row %s", (source, expected) => {
    expect(parseCourseRestrictions(source)).toEqual({
      clauses: expected,
      unparsed: [],
    });
  });

  test("does not mistake a programme name ending in 專班 for a level", () => {
    expect(parseCourseRestrictions("限EMBA專班")).toEqual({
      clauses: [clause("include", { unit: "EMBA專班" })],
      unparsed: [],
    });
  });
});

describe("canSelect", () => {
  test.each([
    [
      "open course",
      parseCourseRestrictions(""),
      { level: "undergraduate", year: 2 },
      "yes",
    ],
    [
      "matching level and year",
      parseCourseRestrictions("限大學部2年級3年級"),
      { level: "undergraduate", year: 3 },
      "yes",
    ],
    [
      "wrong level",
      parseCourseRestrictions("限大學部2年級3年級"),
      { level: "master", year: 3 },
      "no",
    ],
    [
      "matching exact unit",
      parseCourseRestrictions("限資工系大學部"),
      { unit: "資工系", level: "undergraduate", year: 2 },
      "yes",
    ],
    [
      "different unit is unknown",
      parseCourseRestrictions("限資工系大學部"),
      { unit: "電機系", level: "undergraduate", year: 2 },
      "unknown",
    ],
    [
      "non-exact unit spelling is unknown",
      parseCourseRestrictions("限資工系大學部"),
      { unit: "CS", level: "undergraduate", year: 2 },
      "unknown",
    ],
    [
      "non-exact Chinese short unit is unknown",
      parseCourseRestrictions("限資工系大學部"),
      { unit: "資工", level: "undergraduate", year: 2 },
      "unknown",
    ],
    [
      "matching exclusion",
      parseCourseRestrictions("排除大學部1年級"),
      { level: "undergraduate", year: 1 },
      "no",
    ],
    [
      "nonmatching exclusion",
      parseCourseRestrictions("排除大學部1年級"),
      { level: "undergraduate", year: 2 },
      "yes",
    ],
    [
      "missing comparison data",
      parseCourseRestrictions("限資工系大學部"),
      { level: "undergraduate", year: 2 },
      "unknown",
    ],
    [
      "additional restriction",
      parseCourseRestrictions("限大學部2年級以上"),
      { level: "undergraduate", year: 3 },
      "unknown",
    ],
    [
      "selection priority",
      parseCourseRestrictions("資工系優先，第3次選課起開放全校修習"),
      { unit: "資工系", level: "undergraduate", year: 2 },
      "yes",
    ],
  ] as const)("returns %s", (_name, eligibility, student, expected) => {
    expect(canSelect(eligibility, student)).toBe(expected);
  });

  test.each([
    ["open", "", { level: "undergraduate" }, "yes"],
    ["nonmatching exclusion", "排除大學部", { level: "master" }, "yes"],
    ["matching exclusion", "排除大學部", { level: "undergraduate" }, "no"],
    [
      "different unit exclusion is unknown",
      "排除資工系",
      { unit: "電機系" },
      "unknown",
    ],
    ["unknown exclusion", "排除資工系", { level: "undergraduate" }, "unknown"],
    ["matching inclusion", "限大學部", { level: "undergraduate" }, "yes"],
    ["nonmatching inclusion", "限大學部", { level: "master" }, "no"],
    ["unknown inclusion", "限資工系", { level: "undergraduate" }, "unknown"],
    [
      "matching inclusion plus unknown exclusion",
      "排除資工系 限大學部",
      { level: "undergraduate" },
      "unknown",
    ],
    [
      "nonmatching inclusion plus unknown exclusion",
      "排除資工系 限大學部",
      { level: "master" },
      "unknown",
    ],
    [
      "review mixed case with unknown exclusion",
      "排除CS 限大學部",
      { level: "undergraduate" },
      "unknown",
    ],
    [
      "definite exclusion wins over unknown inclusion",
      "排除大學部 限資工系",
      { level: "undergraduate" },
      "no",
    ],
    [
      "matching inclusion plus unknown inclusion",
      "限大學部,資工系",
      { level: "undergraduate" },
      "unknown",
    ],
    [
      "priority match",
      "資工系優先，第3次選課起開放全校修習",
      { unit: "資工系" },
      "yes",
    ],
    [
      "priority nonmatch lifts the limit",
      "資工系優先，第3次選課起開放全校修習",
      { unit: "電機系" },
      "unknown",
    ],
    [
      "priority missing unit",
      "資工系優先，第3次選課起開放全校修習",
      {},
      "unknown",
    ],
    [
      "unparsed plus definite exclusion",
      "排除大學部 限大學部2年級以上",
      { level: "undergraduate" },
      "no",
    ],
  ] as const)(
    "predicate combination: %s",
    (_name, source, student, expected) => {
      expect(canSelect(parseCourseRestrictions(source), student)).toBe(
        expected,
      );
    },
  );

  test("normalizes width and whitespace but does not resolve aliases", () => {
    expect(
      canSelect(parseCourseRestrictions("限CS 大學部"), {
        unit: "ＣＳ",
        level: "undergraduate",
      }),
    ).toBe("yes");
    expect(
      canSelect(parseCourseRestrictions("限資工系大學部"), {
        unit: "資工",
        level: "undergraduate",
      }),
    ).toBe("unknown");
  });

  test("marks a priority restriction when its inclusion limit can lift", () => {
    expect(
      eligibilitySummary("資工系優先，第3次選課起開放全校修習", {
        unit: "電機系",
      }),
    ).toMatchObject({
      status: "has additional restrictions",
      selection_priority: true,
      can_select: "unknown",
    });
  });
});

describe("11510 restriction corpus", () => {
  test("never throws and parses at least 90% with no remainder", () => {
    let nonEmpty = 0;
    let fullyParsed = 0;

    for (const course of fixture) {
      expect(() => parseCourseRestrictions(course.restrictions)).not.toThrow();
      const parsed = parseCourseRestrictions(course.restrictions);
      if (course.restrictions?.trim()) {
        nonEmpty += 1;
        if (parsed.unparsed.length === 0) fullyParsed += 1;
      }
    }

    expect(nonEmpty).toBe(383);
    expect(fullyParsed / nonEmpty).toBeGreaterThanOrEqual(0.9);
    expect(fullyParsed).toBe(383);
  });

  test("parses every row in the larger fixture without throwing", () => {
    let nonEmpty = 0;
    let fullyParsed = 0;
    for (const course of fullFixture) {
      expect(() => parseCourseRestrictions(course.restrictions)).not.toThrow();
      if (course.restrictions?.trim()) {
        nonEmpty += 1;
        if (parseCourseRestrictions(course.restrictions).unparsed.length === 0)
          fullyParsed += 1;
      }
    }
    expect([nonEmpty, fullyParsed]).toEqual([1897, 1765]);
    expect(fullyParsed / nonEmpty).toBeGreaterThanOrEqual(0.9);
  });

  test("source spans round-trip every row after removing whitespace and separators", () => {
    const withoutSeparators = (value: string) => value.replace(/[\s,，]/g, "");
    for (const corpus of [fixture, fullFixture]) {
      for (const course of corpus) {
        const source = course.restrictions?.trim();
        if (!source) continue;
        const parsed = parseCourseRestrictionsWithSpans(source);
        expect(
          withoutSeparators(
            parsed.sourceSpans.map((span) => span.text).join(""),
          ),
        ).toBe(withoutSeparators(source));
      }
    }
  });
});
