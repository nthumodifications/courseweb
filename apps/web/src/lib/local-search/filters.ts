import {
  normalizedFacetValues,
  type SearchProjectionRecord,
} from "./projection";
import {
  maskFromSeparateTimes,
  maskFromTimes,
  type TimeMask,
  usesAny,
  usesOnly,
} from "./time-mask";

export type FilterOperator = ":" | "=" | "!=" | ">" | ">=" | "<" | "<=";

export type FilterCondition = {
  attribute: string;
  operator: FilterOperator;
  value: string;
  negated?: boolean;
};

const OPERATORS = /^(.*?)(>=|<=|!=|=|>|<|:)(.*)$/;

const unquote = (value: string) => {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const parseFilterCondition = (
  expression: string,
): FilterCondition | null => {
  let source = expression.trim();
  let negated = false;
  if (source.startsWith("-")) {
    negated = true;
    source = source.slice(1).trim();
  }
  const match = OPERATORS.exec(source);
  if (!match) return null;
  const attribute = match[1].trim();
  const operator = match[2] as FilterOperator;
  if (!attribute) return null;
  return {
    attribute,
    operator,
    value: unquote(match[3]),
    negated,
  };
};

const isWrapped = (value: string) => {
  if (!value.startsWith("(") || !value.endsWith(")")) return false;
  let depth = 0;
  let quote = "";
  for (let i = 0; i < value.length; i += 1) {
    const character = value[i];
    if (quote) {
      if (character === quote && value[i - 1] !== "\\") quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0 && i !== value.length - 1) return false;
    }
  }
  return depth === 0;
};

const splitTopLevel = (value: string, operator: "AND" | "OR") => {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let i = 0; i <= value.length - operator.length; i += 1) {
    const character = value[i];
    if (quote) {
      if (character === quote && value[i - 1] !== "\\") quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") {
      depth += 1;
      continue;
    }
    if (character === ")") {
      depth -= 1;
      continue;
    }
    if (
      depth === 0 &&
      value.slice(i, i + operator.length).toUpperCase() === operator &&
      (i === 0 || /\s/.test(value[i - 1])) &&
      (i + operator.length === value.length ||
        /\s/.test(value[i + operator.length]))
    ) {
      parts.push(value.slice(start, i).trim());
      start = i + operator.length;
      i = start - 1;
    }
  }
  if (parts.length === 0) return null;
  parts.push(value.slice(start).trim());
  return parts;
};

type FilterExpression =
  | { kind: "condition"; condition: FilterCondition }
  | { kind: "and" | "or"; children: FilterExpression[] };

const parseExpression = (source: string): FilterExpression | null => {
  let value = source.trim();
  while (isWrapped(value)) value = value.slice(1, -1).trim();
  const orParts = splitTopLevel(value, "OR");
  if (orParts) {
    return {
      kind: "or",
      children: orParts
        .map(parseExpression)
        .filter((part): part is FilterExpression => part !== null),
    };
  }
  const andParts = splitTopLevel(value, "AND");
  if (andParts) {
    return {
      kind: "and",
      children: andParts
        .map(parseExpression)
        .filter((part): part is FilterExpression => part !== null),
    };
  }
  const condition = parseFilterCondition(value);
  return condition ? { kind: "condition", condition } : null;
};

export const parseFilterExpression = (value: unknown) =>
  typeof value === "string" && value.trim() ? parseExpression(value) : null;

const normalized = (value: unknown) =>
  String(value ?? "").toLocaleLowerCase("zh-TW");

const normalizedFilterValues = new Map<string, string>();
const normalizedFilterValue = (value: unknown) => {
  const raw = String(value ?? "");
  const cached = normalizedFilterValues.get(raw);
  if (cached !== undefined) return cached;
  const valueLower = normalized(raw);
  normalizedFilterValues.set(raw, valueLower);
  return valueLower;
};

const separateTimeMaskCache = new Map<string, TimeMask>();
const recordSeparateTimeMaskCache = new WeakMap<
  SearchProjectionRecord,
  TimeMask
>();
const separateTimeMaskForValue = (value: string) => {
  const cached = separateTimeMaskCache.get(value);
  if (cached) return cached;
  const mask = maskFromSeparateTimes([value]);
  separateTimeMaskCache.set(value, mask);
  return mask;
};
const separateTimeMaskForRecord = (record: SearchProjectionRecord) => {
  const cached = recordSeparateTimeMaskCache.get(record);
  if (cached) return cached;
  const mask = maskFromSeparateTimes(record.separate_times);
  recordSeparateTimeMaskCache.set(record, mask);
  return mask;
};

const numericValue = (record: SearchProjectionRecord, attribute: string) => {
  const value = record[attribute];
  return value === null || value === undefined || value === ""
    ? Number.NaN
    : typeof value === "number"
      ? value
      : Number(value);
};

const exactValue = (
  record: SearchProjectionRecord,
  attribute: string,
  value: string,
  expected = normalizedFilterValue(value),
  wantedTimeMask = separateTimeMaskForValue(value),
) => {
  if (attribute === "separate_times") {
    return usesAny(separateTimeMaskForRecord(record), wantedTimeMask);
  }
  if (attribute === "times") {
    return normalizedFacetValues(record, "times").some(
      (candidate) => candidate === expected,
    );
  }
  return normalizedFacetValues(record, attribute).some(
    (candidate) => candidate === expected,
  );
};

const matchesConditionWithExpected = (
  record: SearchProjectionRecord,
  condition: FilterCondition,
  expected = normalizedFilterValue(condition.value),
  wantedTimeMask = separateTimeMaskForValue(condition.value),
) => {
  let matched = false;
  if (
    (condition.operator === ":" || condition.operator === "=") &&
    condition.attribute === "credits"
  ) {
    matched =
      numericValue(record, condition.attribute) === Number(condition.value);
  } else if (condition.operator === ":" || condition.operator === "=") {
    matched = exactValue(
      record,
      condition.attribute,
      condition.value,
      expected,
      wantedTimeMask,
    );
  } else if (condition.attribute === "separate_times") {
    const actual = separateTimeMaskForRecord(record);
    matched =
      condition.operator === "!="
        ? !usesAny(actual, wantedTimeMask)
        : false;
  } else if (condition.attribute === "times") {
    const actual = normalizedFacetValues(record, "times").some(
      (candidate) => candidate === expected,
    );
    matched = condition.operator === "!=" ? !actual : false;
  } else if (condition.operator === "!=") {
    matched =
      !exactValue(
        record,
        condition.attribute,
        condition.value,
        expected,
        wantedTimeMask,
      );
  } else {
    const actual = numericValue(record, condition.attribute);
    const expected = Number(condition.value);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    switch (condition.operator) {
      case ">":
        matched = actual > expected;
        break;
      case ">=":
        matched = actual >= expected;
        break;
      case "<":
        matched = actual < expected;
        break;
      case "<=":
        matched = actual <= expected;
        break;
      default:
        matched = false;
    }
  }
  return condition.negated ? !matched : matched;
};

export const matchesCondition = (
  record: SearchProjectionRecord,
  condition: FilterCondition,
) => matchesConditionWithExpected(record, condition);

type CompiledCondition = (record: SearchProjectionRecord) => boolean;

const compileCondition = (condition: FilterCondition): CompiledCondition => {
  const expected = normalizedFilterValue(condition.value);
  const wantedTimeMask = separateTimeMaskForValue(condition.value);
  return (record) =>
    matchesConditionWithExpected(record, condition, expected, wantedTimeMask);
};

const compileExpression = (
  expression: FilterExpression | null,
  excludedAttribute?: string,
): CompiledCondition => {
  if (!expression) return () => true;
  if (expression.kind === "condition") {
    return expression.condition.attribute === excludedAttribute
      ? () => true
      : compileCondition(expression.condition);
  }
  const children = expression.children.map((child) =>
    compileExpression(child, excludedAttribute),
  );
  return expression.kind === "and"
    ? (record) => children.every((child) => child(record))
    : (record) => children.some((child) => child(record));
};

type FilterInput =
  | string
  | readonly string[]
  | ReadonlyArray<readonly string[] | string>
  | undefined;

const toArray = (value: FilterInput): Array<string | readonly string[]> => {
  if (typeof value === "string") return [value];
  return value ? [...value] : [];
};

const parseMaybeJsonArray = (value: unknown): FilterInput => {
  if (typeof value !== "string") return value as FilterInput;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as FilterInput) : value;
  } catch {
    return value;
  }
};

const facetFilterGroups = (value: unknown) => {
  const groups = toArray(parseMaybeJsonArray(value));
  return groups.map((group) => (Array.isArray(group) ? [...group] : [group]));
};

export type RefinementSpec = {
  facetFilters?: unknown;
  numericFilters?: unknown;
  filters?: unknown;
};

/** Apply Algolia's AND-of-OR facet groups plus filters/numericFilters. */
export const compileRefinements = (
  spec: RefinementSpec,
  excludedFacet?: string,
) => {
  const groups = facetFilterGroups(spec.facetFilters);
  const numericConditions = toArray(
    parseMaybeJsonArray(spec.numericFilters),
  ).flatMap((value) => (Array.isArray(value) ? [...value] : [value]));
  const facetConditions = groups.map((group) =>
    group
      .map(parseFilterCondition)
      .filter((condition): condition is FilterCondition => condition !== null)
      .filter((condition) => condition.attribute !== excludedFacet),
  );
  const parsedNumericConditions = numericConditions.map((value) =>
    parseFilterCondition(String(value)),
  );
  const expression = parseFilterExpression(
    typeof spec.filters === "string"
      ? spec.filters
      : typeof spec.filters === "undefined"
        ? ""
        : String(spec.filters),
  );

  const compiledFacetConditions = facetConditions.map((group) =>
    group.map(compileCondition),
  );
  const compiledNumericConditions = parsedNumericConditions.map((condition) =>
    condition ? compileCondition(condition) : undefined,
  );
  const expressionMatcher = compileExpression(expression, excludedFacet);

  const matcher = ((record: SearchProjectionRecord) => {
    const facetMatch = compiledFacetConditions.every(
      (conditions) =>
        conditions.length === 0 ||
        conditions.some((condition) => condition(record)),
    );
    if (!facetMatch) return false;

    if (
      !compiledNumericConditions.every(
        (condition) => condition && condition(record),
      )
    ) {
      return false;
    }

    return expressionMatcher(record);
  }) as ((record: SearchProjectionRecord) => boolean) & { isNoop: boolean };
  matcher.isNoop =
    facetConditions.every((conditions) => conditions.length === 0) &&
    parsedNumericConditions.length === 0 &&
    expression === null;
  return matcher;
};

export const matchesRefinements = (
  record: SearchProjectionRecord,
  spec: RefinementSpec,
  excludedFacet?: string,
) => compileRefinements(spec, excludedFacet)(record);

export const timeMaskForFilterValue = (attribute: string, value: string) =>
  attribute === "times"
    ? maskFromTimes([value])
    : maskFromSeparateTimes([value]);

export const usesOnlyTimeFilter = (
  record: SearchProjectionRecord,
  allowed: TimeMask,
) => usesOnly(maskFromTimes(record.times), allowed);
