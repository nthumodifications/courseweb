// ── Worker-local mirror of packages/shared/src/utils/course-audience-tags.ts ─
// The Worker cannot import @courseweb/shared here: its package export points at
// dist, which CI does not build, and the canonical source is outside this
// package's rootDir. search-audience-parity.test.ts compares this mirror with
// the canonical source.

export type CourseAudienceTagRelation =
  | "restriction"
  | "exclusion"
  | "priority";

export type CourseAudienceTagValue =
  | "year-1"
  | "year-2"
  | "year-3"
  | "year-4"
  | "undergraduate"
  | "graduate"
  | "master"
  | "doctoral"
  | "own-department"
  | "male"
  | "female"
  | "international";

export type CourseAudienceTag = {
  kind: "year" | "level" | "department" | "other";
  value: CourseAudienceTagValue;
  relation: CourseAudienceTagRelation;
  /** The exact note/restriction phrase that caused this tag. */
  source: string;
  /** The academic level qualified by a year tag, when the source says so. */
  scope?: Extract<
    CourseAudienceTagValue,
    "undergraduate" | "graduate" | "master" | "doctoral"
  >;
};

export type CourseAudienceText = {
  note?: string | null;
  restrictions?: string | null;
};

type ParsedClause = {
  relation: CourseAudienceTagRelation;
  source: string;
};

const CLAUSE_END = "[^,，。；;\\n]{1,160}";

const LIMIT_PATTERN = new RegExp(`(?:限制|限定|限)${CLAUSE_END}`, "gu");
const EXCLUSION_PATTERN = new RegExp(
  `(?:排除|恕?(?:不開放|不开放)|不接受|不得|不可(?:以)?)${CLAUSE_END}`,
  "gu",
);
const EXCLUSION_AFTER_AUDIENCE_PATTERN = new RegExp(
  `([^,，。；;\\n]{1,120}?)(?:不得|不可(?:以)?)(?:修習|選修|修|選課|點選|選)`,
  "gu",
);
const IMPLICIT_LIMIT_PATTERN = new RegExp(
  `([^,，。；;\\n]{1,160}?)(?:始得|才可|方可)(?:選課|修習|選修|點選)`,
  "gu",
);
const PRIORITY_PATTERN = new RegExp(`([^。；;\\n]{1,160}?)(?:優先|优先)`, "gu");
const YEAR_RANGE_PATTERN = new RegExp(
  `[^,，。；;\\n]{0,120}?(?:[大碩硕博][1-4一二三四]|[1-4一二三四](?:年級|年级|年))\\s*(?:以上|以下|以後|以后|之後|之后)`,
  "gu",
);
const COMPACT_YEAR_RANGE_PATTERN = new RegExp(
  `[^,，。；;\\n]{0,120}?[大碩硕博][1-4](?:\\s*[,、]\\s*[1-4])+\\s*以上`,
  "gu",
);

const ENGLISH_AUDIENCE_PATTERN =
  /\b(?:restricted to|limited to|undergraduates?|graduate(?: students?)?|postgraduate(?: students?)?|master(?:'s)?(?: students?)?|doctoral(?: students?)?|phd(?: students?)?|freshmen?|sophomores?|juniors?|seniors?|male(?: students?)?|female(?: students?)?|international(?: students?)?)[^.!?;，。；\n]{0,100}/giu;
const ENGLISH_EXCLUSION_PATTERN =
  /\b(?:not\s+open\s+to|not\s+for|not\s+accepting|not\s+accepted\s+for)\s+(?:undergraduates?|graduate(?: students?)?|postgraduate(?: students?)?|master(?:'s)?(?: students?)?|doctoral(?: students?)?|phd(?: students?)?)[^.!?;，。；\n]{0,100}/giu;
const ENGLISH_AUDIENCE_TRIGGER =
  /\b(?:only|excluded|not\s+accepted|above|restricted|limited|priority|preferred)\b/i;

const ACADEMIC_LEVELS = new Set<CourseAudienceTagValue>([
  "undergraduate",
  "graduate",
  "master",
  "doctoral",
]);

const isAcademicLevel = (
  value: CourseAudienceTagValue,
): value is Extract<
  CourseAudienceTagValue,
  "undergraduate" | "graduate" | "master" | "doctoral"
> => ACADEMIC_LEVELS.has(value);

const tagKind = (value: CourseAudienceTagValue): CourseAudienceTag["kind"] => {
  if (value.startsWith("year-")) return "year";
  if (isAcademicLevel(value)) return "level";
  if (value === "own-department") return "department";
  return "other";
};

const chineseNumber = (value: string): number | undefined => {
  const number = Number(value);
  if (Number.isInteger(number) && number >= 1 && number <= 4) return number;
  return { 一: 1, 二: 2, 三: 3, 四: 4 }[value as "一" | "二" | "三" | "四"];
};

const yearValue = (year: number): CourseAudienceTagValue =>
  `year-${year}` as CourseAudienceTagValue;

const extractYears = (source: string) => {
  const years = new Set<number>();
  const chineseYearPattern =
    /(?:[大碩硕博][1-4一二三四]|[1-4一二三四](?:年級|年级|年)|第[1-4一二三四]年)/gu;

  for (const match of source.matchAll(chineseYearPattern)) {
    const numberCharacter = match[0].match(/[1-4一二三四]/u)?.[0];
    const number = numberCharacter ? chineseNumber(numberCharacter) : undefined;
    if (number) years.add(number);
  }

  const compactYearPattern = /[大碩硕博]([1-4])(?:\s*[,、]\s*([1-4]))+/gu;
  for (const match of source.matchAll(compactYearPattern)) {
    for (const numberCharacter of match[0].matchAll(/[1-4]/gu))
      years.add(Number(numberCharacter[0]));
  }

  if (/\b(?:freshman|freshmen|first[- ]year(?!['’]s))\b/i.test(source))
    years.add(1);
  if (/\b(?:sophomore|sophomores|second[- ]year(?!['’]s))\b/i.test(source))
    years.add(2);
  if (/\b(?:junior|juniors|third[- ]year)\b/i.test(source)) years.add(3);
  // "Senior" is ambiguous for graduate programmes. Only use it when the
  // source explicitly says undergraduate.
  if (
    /\b(?:senior|seniors|fourth[- ]year)\b/i.test(source) &&
    /\bundergraduates?\b/i.test(source)
  ) {
    years.add(4);
  }

  return [...years].sort((left, right) => left - right);
};

const extractValues = (source: string): CourseAudienceTagValue[] => {
  const values: CourseAudienceTagValue[] = [];
  const add = (value: CourseAudienceTagValue) => {
    if (!values.includes(value)) values.push(value);
  };

  if (
    /(?:大學(?:部|生)?|大学(?:部|生)?|學士班|学士班|\bundergraduates?\b)/iu.test(
      source,
    )
  )
    add("undergraduate");
  if (
    /(?:研究所|研究生|\bgraduate(?: students?)?\b|\bpostgraduate(?: students?)?\b)/iu.test(
      source,
    )
  )
    add("graduate");
  if (
    /(?:碩(?:士|班|[1-4一二三四])|硕(?:士|班|[1-4一二三四])|\bmaster(?:'s)?\b)/iu.test(
      source,
    )
  )
    add("master");
  if (/(?:博士|博班|博[1-4一二三四]|\bdoctoral\b|\bphd\b)/iu.test(source))
    add("doctoral");
  if (/(?:碩博|硕博)/u.test(source)) {
    add("master");
    add("doctoral");
  }

  const hasInstructorContext =
    /(?:教師|教师|教授|老師|老师|teacher|instructor|professor)/iu.test(source);
  if (
    !hasInstructorContext &&
    /(?:本系|本所|\bown (?:department|institute)\b)/iu.test(source)
  )
    add("own-department");
  if (/(?:男生|男性|\bmale(?: students?)?\b)/iu.test(source)) add("male");
  if (/(?:女生|女性|\bfemale(?: students?)?\b)/iu.test(source)) add("female");
  if (/(?:外籍生|\binternational(?: students?)?\b)/iu.test(source))
    add("international");

  return values;
};

const yearScope = (
  source: string,
  values: readonly CourseAudienceTagValue[],
): CourseAudienceTag["scope"] => {
  if (/[大][1-4一二三四]/u.test(source)) return "undergraduate";
  if (/[碩硕][1-4一二三四]/u.test(source)) return "master";
  if (/[博][1-4一二三四]/u.test(source)) return "doctoral";

  const levels = values.filter(isAcademicLevel);
  return levels.length === 1 ? levels[0] : undefined;
};

const expandYearRanges = (source: string, years: readonly number[]) => {
  // Keep the existing one-year tag model: a lower/upper bound becomes one
  // tag for each included year, which the existing UI already renders.
  const expanded = new Set(years);
  const rangePattern =
    /(?:以上|以下|以後|以后|之後|之后|\b(?:and|or)\s+(?:above|below)\b|\babove\b|\bbelow\b)/giu;

  for (const range of source.matchAll(rangePattern)) {
    const beforeRange = source.slice(0, range.index ?? 0);
    const precedingYears = extractYears(beforeRange);
    const start = precedingYears.at(-1);
    if (!start) continue;

    if (/(?:以上|以後|以后|之後|之后|above)/iu.test(range[0])) {
      for (let year = start; year <= 4; year++) expanded.add(year);
    } else {
      for (let year = 1; year <= start; year++) expanded.add(year);
    }
  }

  return [...expanded].sort((left, right) => left - right);
};

const addClause = (
  clauses: ParsedClause[],
  relation: ParsedClause["relation"],
  source: string,
) => {
  const trimmed = source.trim();
  if (!trimmed) return;
  if (
    clauses.some(
      (clause) => clause.relation === relation && clause.source === trimmed,
    )
  )
    return;
  clauses.push({ relation, source: trimmed });
};

const extractClauses = (source: string): ParsedClause[] => {
  const clauses: ParsedClause[] = [];

  for (const match of source.matchAll(LIMIT_PATTERN))
    addClause(clauses, "restriction", match[0]);
  for (const match of source.matchAll(EXCLUSION_PATTERN))
    addClause(clauses, "exclusion", match[0]);
  for (const match of source.matchAll(EXCLUSION_AFTER_AUDIENCE_PATTERN))
    addClause(clauses, "exclusion", match[0]);
  for (const match of source.matchAll(IMPLICIT_LIMIT_PATTERN))
    addClause(clauses, "restriction", match[0]);
  for (const match of source.matchAll(PRIORITY_PATTERN))
    addClause(clauses, "priority", match[0]);
  for (const match of source.matchAll(YEAR_RANGE_PATTERN)) {
    if (!clauses.some((clause) => clause.source.includes(match[0])))
      addClause(clauses, "restriction", match[0]);
  }
  for (const match of source.matchAll(COMPACT_YEAR_RANGE_PATTERN)) {
    if (!clauses.some((clause) => clause.source.includes(match[0])))
      addClause(clauses, "restriction", match[0]);
  }

  for (const match of source.matchAll(ENGLISH_EXCLUSION_PATTERN))
    addClause(clauses, "exclusion", match[0]);

  for (const match of source.matchAll(ENGLISH_AUDIENCE_PATTERN)) {
    const phrase = match[0].trim();
    if (!ENGLISH_AUDIENCE_TRIGGER.test(phrase)) continue;
    const relation = /\b(?:excluded|not for|not\s+accepted)\b/i.test(phrase)
      ? "exclusion"
      : /\b(?:priority|preferred)\b/i.test(phrase)
        ? "priority"
        : "restriction";
    addClause(clauses, relation, phrase);
  }

  return clauses;
};

const parseClause = (clause: ParsedClause): CourseAudienceTag[] => {
  const values = extractValues(clause.source);
  const years = expandYearRanges(clause.source, extractYears(clause.source));
  if (values.length === 0 && years.length === 0) return [];

  const tags: CourseAudienceTag[] = [];
  const seen = new Set<string>();
  const scope = years.length > 0 ? yearScope(clause.source, values) : undefined;
  const add = (
    value: CourseAudienceTagValue,
    tagScope?: CourseAudienceTag["scope"],
  ) => {
    const key = `${clause.relation}:${value}:${tagScope ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    tags.push({
      kind: tagKind(value),
      value,
      relation: clause.relation,
      source: clause.source,
      ...(tagScope ? { scope: tagScope } : {}),
    });
  };

  for (const value of values) {
    // "排除碩士班1年級" is a year-scoped exclusion, not a claim that every
    // master's student is excluded. Keep the precise year tag below.
    if (
      clause.relation === "exclusion" &&
      years.length > 0 &&
      isAcademicLevel(value)
    )
      continue;
    add(value);
  }
  for (const year of years) add(yearValue(year), scope);

  return tags;
};

/**
 * Parse explicit audience wording from course notes and restrictions.
 *
 * The parser intentionally requires a restriction, exclusion, priority, or
 * explicit eligibility phrase before interpreting a year/level token. This
 * keeps ordinary course names such as "大一英文" out of the audience tags.
 */
export const parseCourseAudienceTags = ({
  note,
  restrictions,
}: CourseAudienceText): CourseAudienceTag[] => {
  const tags: CourseAudienceTag[] = [];
  const seen = new Set<string>();

  for (const source of [restrictions, note]) {
    if (typeof source !== "string" || !source.trim()) continue;
    for (const clause of extractClauses(source)) {
      for (const tag of parseClause(clause)) {
        const key = `${tag.relation}:${tag.value}:${tag.scope ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tags.push(tag);
      }
    }
  }

  return tags;
};

/**
 * Stable search values for audience tags.
 *
 * Non-year tags use relation:value. A scoped year tag appends its academic
 * level so that "碩三" and "大三" remain distinct; an unscoped year keeps the
 * relation:value form. This is the serialized facet contract shared by the
 * local, fallback, and Algolia indexes.
 */
export const courseAudienceFacetValue = (tag: CourseAudienceTag) =>
  `${tag.relation}:${tag.value}${
    tag.kind === "year" && tag.scope ? `:${tag.scope}` : ""
  }`;

export const courseAudienceFacetValues = (text: CourseAudienceText) => [
  ...new Set(parseCourseAudienceTags(text).map(courseAudienceFacetValue)),
];
