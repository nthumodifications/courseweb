/**
 * The course system's restrictions are a small, regular grammar. Keep this
 * module dependency-free so it can be used by the Worker and by tests without
 * pulling in the shared package's unbuilt dist entrypoint.
 */

export type EligibilityLevel =
  | "undergraduate"
  | "master"
  | "doctoral"
  | "special-program"
  | "advanced-student"
  | "international-student"
  | "secondary-teacher-education"
  | "primary-teacher-education"
  | "male"
  | "female";

export type EligibilityKind = "include" | "exclude";

export type EligibilityClause = {
  kind: EligibilityKind;
  unit?: string;
  level?: EligibilityLevel;
  years?: number[];
};

export type CourseEligibility = {
  clauses: EligibilityClause[];
  unparsed: string[];
  /** A selection-round preference is understood but is not a permanent gate. */
  selectionPriority?: true;
};

export type EligibilitySourceSpan = {
  kind: "clause" | "unparsed";
  text: string;
};

export type StudentForEligibility = {
  unit?: string;
  level?: EligibilityLevel | string;
  year?: number;
};

type LevelToken = {
  word: string;
  level: EligibilityLevel;
};

/** Machine words observed in both course fixtures. Long words must match first. */
export const LEVEL_TOKENS: readonly LevelToken[] = [
  { word: "中等教育學程生", level: "secondary-teacher-education" },
  { word: "國小教育學程生", level: "primary-teacher-education" },
  { word: "大學部", level: "undergraduate" },
  { word: "碩士班", level: "master" },
  { word: "博士班", level: "doctoral" },
  { word: "專班", level: "special-program" },
  { word: "進階生", level: "advanced-student" },
  { word: "外籍生", level: "international-student" },
  { word: "男生", level: "male" },
  { word: "女生", level: "female" },
];

const PRIORITY_SUFFIX = "優先，第3次選課起開放全校修習";
const PRIORITY_QUALIFIER = /(?:清班|華班|梅班|單號|雙號|男生|女生|外籍生)$/;
const YEAR_PATTERN = /\d+年級/g;
const WHITESPACE = /\s+/g;
const UNSUPPORTED_STUDENT_QUALIFIER = /^(?:前標生|中級生|初級生|頂標生)$/;

const trimUnit = (value: string) => value.replace(WHITESPACE, " ").trim();

/** NFKC handles full-width ASCII while retaining the unit spelling itself. */
export const normalizeEligibilityUnit = (value: string) =>
  value.normalize("NFKC").replace(WHITESPACE, " ").trim();

const levelAt = (value: string, start: number): LevelToken | undefined => {
  for (const token of LEVEL_TOKENS) {
    if (value.startsWith(token.word, start)) return token;
  }
  return undefined;
};

const markerPositions = (value: string) => {
  const positions: Array<{ start: number; end: number; token: LevelToken }> =
    [];
  let index = 0;
  while (index < value.length) {
    const token = levelAt(value, index);
    if (token) {
      positions.push({
        start: index,
        end: index + token.word.length,
        token,
      });
      index += token.word.length;
    } else {
      index += 1;
    }
  }
  return positions;
};

/**
 * A trailing 專班 is a level marker only when the source makes that clear.
 * For example, EMBA專班 is a programme name, while
 * EMBA專班專班2年級 has a programme followed by a special-program level.
 */
const usableMarkers = (value: string) => {
  const positions = markerPositions(value);
  const specialPositions = positions.filter(
    ({ token }) => token.word === "專班",
  );
  const hasNonSpecial = positions.some(({ token }) => token.word !== "專班");

  return positions.filter(({ start, end, token }, position) => {
    if (token.word !== "專班") return true;
    const after = value.slice(end);
    const hasYearsAfter = /^\d+年級/.test(after);
    const isStandalone = start === 0 && !value.slice(end).trim();
    const isAfterAnotherMarker = position > 0;
    const isLastSpecial =
      specialPositions.length > 1 &&
      start === specialPositions[specialPositions.length - 1]?.start;
    return (
      hasYearsAfter ||
      isStandalone ||
      isAfterAnotherMarker ||
      isLastSpecial ||
      (!hasNonSpecial && specialPositions.length === 1 && start === 0)
    );
  });
};

const yearsIn = (value: string) =>
  [...value.matchAll(YEAR_PATTERN)].map((match) =>
    Number(match[0].slice(0, -2)),
  );

const withoutYears = (value: string) => value.replace(YEAR_PATTERN, "");

type GroupParse = {
  clauses: EligibilityClause[];
  unparsed: string[];
  sourceSpans: EligibilitySourceSpan[];
};

const sourceSpan = (
  kind: EligibilitySourceSpan["kind"],
  text: string,
): EligibilitySourceSpan[] => (text.trim() ? [{ kind, text }] : []);

const parseGroup = (value: string, kind: EligibilityKind): GroupParse => {
  const group = value.trim();
  if (!group)
    return {
      clauses: [],
      unparsed: value.trim() ? [value.trim()] : [],
      sourceSpans: sourceSpan("unparsed", value),
    };

  const markers = usableMarkers(group);
  if (markers.length === 0) {
    if (UNSUPPORTED_STUDENT_QUALIFIER.test(group))
      return {
        clauses: [],
        unparsed: [group],
        sourceSpans: sourceSpan("unparsed", group),
      };
    const years = yearsIn(group);
    const unit = trimUnit(withoutYears(group));
    const clause: EligibilityClause = { kind };
    if (unit) clause.unit = unit;
    if (years.length > 0) clause.years = years;
    return {
      clauses: [clause],
      unparsed: [],
      sourceSpans: sourceSpan("clause", group),
    };
  }

  const firstMarker = markers[0];
  const unit = trimUnit(group.slice(0, firstMarker.start));
  const clauses: EligibilityClause[] = [];
  const unparsed: string[] = [];
  const sourceSpans: EligibilitySourceSpan[] = sourceSpan(
    "clause",
    group.slice(0, firstMarker.start),
  );

  markers.forEach((marker, index) => {
    const segmentEnd = markers[index + 1]?.start ?? group.length;
    const segment = group.slice(marker.end, segmentEnd);
    const years = yearsIn(segment);
    const leftover = withoutYears(segment).trim();
    if (leftover) unparsed.push(leftover);

    sourceSpans.push(
      ...sourceSpan("clause", group.slice(marker.start, marker.end)),
    );
    let segmentStart = marker.end;
    for (const year of segment.matchAll(YEAR_PATTERN)) {
      const yearStart = marker.end + (year.index ?? 0);
      sourceSpans.push(
        ...sourceSpan("unparsed", group.slice(segmentStart, yearStart)),
      );
      sourceSpans.push(
        ...sourceSpan(
          "clause",
          group.slice(yearStart, yearStart + year[0].length),
        ),
      );
      segmentStart = yearStart + year[0].length;
    }
    sourceSpans.push(
      ...sourceSpan("unparsed", group.slice(segmentStart, segmentEnd)),
    );

    const clause: EligibilityClause = {
      kind,
      level: marker.token.level,
    };
    if (unit) clause.unit = unit;
    if (years.length > 0) clause.years = years;
    clauses.push(clause);
  });

  return { clauses, unparsed, sourceSpans };
};

const parseBody = (value: string, kind: EligibilityKind): GroupParse => {
  const clauses: EligibilityClause[] = [];
  const unparsed: string[] = [];
  const sourceSpans: EligibilitySourceSpan[] = [];
  const groups = value.split(/[,，]/);
  for (const group of groups) {
    const parsed = parseGroup(group, kind);
    clauses.push(...parsed.clauses);
    unparsed.push(...parsed.unparsed);
    sourceSpans.push(...parsed.sourceSpans);
  }
  return { clauses, unparsed, sourceSpans };
};

const parsePriorityBody = (value: string): GroupParse => {
  // Class/number/gender priority is not a permanent eligibility gate. It is
  // consumed as part of the known priority form and retained as metadata.
  const body = value.replace(PRIORITY_QUALIFIER, "").replace(/[,，]+$/, "");
  return parseBody(body, "include");
};

type ParsedRestriction = {
  eligibility: CourseEligibility;
  sourceSpans: EligibilitySourceSpan[];
};

const parseCourseRestrictionsInternal = (
  input: string | null | undefined,
): ParsedRestriction => {
  const source = typeof input === "string" ? input.trim() : "";
  if (!source)
    return {
      eligibility: { clauses: [], unparsed: [] },
      sourceSpans: [],
    };

  if (source.endsWith(PRIORITY_SUFFIX)) {
    const priorityBody = source.slice(0, -PRIORITY_SUFFIX.length).trim();
    const parsed = parsePriorityBody(priorityBody);
    const qualifier = priorityBody.match(PRIORITY_QUALIFIER)?.[0];
    const parsedBody = qualifier
      ? priorityBody.slice(0, -qualifier.length).trim()
      : priorityBody;
    const qualifierStart = parsedBody.length;
    const sourceSpans = [...parsed.sourceSpans];
    if (qualifier)
      sourceSpans.push(
        ...sourceSpan("clause", priorityBody.slice(qualifierStart)),
      );
    sourceSpans.push(...sourceSpan("clause", PRIORITY_SUFFIX));
    return {
      eligibility: {
        clauses: parsed.clauses,
        unparsed: parsed.unparsed,
        ...(parsed.unparsed.length === 0 ? { selectionPriority: true } : {}),
      },
      sourceSpans,
    };
  }

  const clauses: EligibilityClause[] = [];
  const unparsed: string[] = [];
  const sourceSpans: EligibilitySourceSpan[] = [];
  const parts = source.split(/\s+(?=(?:限|排除))/);
  for (const part of parts) {
    const kind = part.startsWith("限")
      ? "include"
      : part.startsWith("排除")
        ? "exclude"
        : undefined;
    if (!kind) {
      unparsed.push(part);
      sourceSpans.push(...sourceSpan("unparsed", part));
      continue;
    }
    const prefixLength = kind === "include" ? 1 : 2;
    const parsed = parseBody(part.slice(prefixLength), kind);
    clauses.push(...parsed.clauses);
    unparsed.push(...parsed.unparsed);
    sourceSpans.push(
      ...sourceSpan(
        parsed.clauses.length > 0 ? "clause" : "unparsed",
        part.slice(0, prefixLength),
      ),
      ...parsed.sourceSpans,
    );
  }

  return { eligibility: { clauses, unparsed }, sourceSpans };
};

/** Parse the machine-generated restrictions field without inference. */
export const parseCourseRestrictions = (
  input: string | null | undefined,
): CourseEligibility => parseCourseRestrictionsInternal(input).eligibility;

/** Test-only view used to verify that parsing accounts for every source span. */
export const parseCourseRestrictionsWithSpans = (
  input: string | null | undefined,
) => parseCourseRestrictionsInternal(input);

// Short alias for callers that naturally refer to the field as restrictions.
export const parseRestrictions = parseCourseRestrictions;

const isKnownLevel = (value: string): value is EligibilityLevel =>
  LEVEL_TOKENS.some((token) => token.level === value);

const matchesUnit = (clauseUnit: string, studentUnit: string | undefined) => {
  if (!studentUnit) return "unknown" as const;
  const left = normalizeEligibilityUnit(clauseUnit);
  const right = normalizeEligibilityUnit(studentUnit);
  if (!left || !right) return "unknown" as const;
  if (left === right) return "yes" as const;
  return "unknown" as const;
};

const matchesClause = (
  clause: EligibilityClause,
  student: StudentForEligibility,
) => {
  if (clause.unit) {
    const unitResult = matchesUnit(clause.unit, student.unit);
    if (unitResult !== "yes") return unitResult;
  }
  if (clause.level) {
    if (typeof student.level !== "string" || !isKnownLevel(student.level))
      return "unknown" as const;
    if (student.level !== clause.level) return "no" as const;
  }
  if (clause.years) {
    const year = student.year;
    if (typeof year !== "number" || !Number.isInteger(year) || year < 1)
      return "unknown" as const;
    if (!clause.years.includes(year)) return "no" as const;
  }
  return "yes" as const;
};

/**
 * Evaluate hard clauses. Any parser remainder or selection-round qualifier is
 * deliberately unknown; only a certain hard exclusion can return no.
 */
export const canSelect = (
  eligibility: CourseEligibility,
  student: StudentForEligibility,
): "yes" | "no" | "unknown" => {
  const excludes = eligibility.clauses.filter(
    (clause) => clause.kind === "exclude",
  );
  const includes = eligibility.clauses.filter(
    (clause) => clause.kind === "include",
  );
  let hasUnknown = eligibility.unparsed.length > 0;

  for (const clause of excludes) {
    const result = matchesClause(clause, student);
    if (result === "yes") return "no";
    if (result === "unknown") hasUnknown = true;
  }

  if (includes.length === 0) return hasUnknown ? "unknown" : "yes";

  let hasMatchingInclude = false;
  for (const clause of includes) {
    const result = matchesClause(clause, student);
    if (result === "yes") hasMatchingInclude = true;
    if (result === "unknown") hasUnknown = true;
  }
  if (hasUnknown) return "unknown";
  if (hasMatchingInclude) return "yes";
  if (eligibility.selectionPriority) return "unknown";
  return "no";
};

export const eligibilitySummary = (
  restrictions: string | null | undefined,
  student?: StudentForEligibility,
) => {
  const parsed = parseCourseRestrictions(restrictions);
  const summary: {
    clauses: EligibilityClause[];
    unparsed?: string[];
    status: "open" | "parsed" | "has additional restrictions";
    selection_priority?: true;
    can_select?: "yes" | "no" | "unknown";
  } = {
    clauses: parsed.clauses,
    status:
      parsed.unparsed.length > 0 || parsed.selectionPriority
        ? "has additional restrictions"
        : parsed.clauses.length > 0
          ? "parsed"
          : "open",
  };
  if (parsed.unparsed.length > 0) summary.unparsed = parsed.unparsed;
  if (parsed.selectionPriority) summary.selection_priority = true;
  if (student) summary.can_select = canSelect(parsed, student);
  return summary;
};
