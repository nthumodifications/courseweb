import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import type { Database } from "./types/supabase";
import {
  deriveSearchFields,
  SUPPORTED_FACETS,
  toSearchProjection,
} from "./search-projection";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseHit = CourseRow & {
  objectID: string;
  courseLevel: string;
  separate_times: string[];
  for_class: string[];
};

const MAX_SCAN_ROWS = 10_000;
const SCAN_PAGE_SIZE = 1_000;
const MAX_HITS_PER_PAGE = 100;
const SCAN_LIMIT_WARNING =
  "Course search reached the 10,000-row scan limit; counts may be incomplete.";
const INSTRUCTOR_MATCH_WARNING = "Instructor matching unavailable";
const CACHE_CONTROL =
  "public, max-age=30, s-maxage=300, stale-while-revalidate=60";

type CourseCodeQuery = {
  department: string;
  number: string;
};

const parseCourseCodeQuery = (query: string): CourseCodeQuery | undefined => {
  const compact = query.normalize("NFKC").replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]+)(\d{4})(?:\d{2})?$/i);
  if (!match) return undefined;
  return {
    department: match[1]!.toLocaleUpperCase("en-US"),
    number: match[2]!,
  };
};

type FilterCondition = {
  attribute: string;
  operator: ":" | "=" | "!=" | ">" | ">=" | "<" | "<=";
  value: string;
};

export type FacetFilterGroup = string[];

export type SupabaseSearchOptions = {
  query?: string;
  page?: number;
  hitsPerPage?: number;
  limit?: number;
  filters?: string;
  numericFilters?: string;
  facetFilters?: FacetFilterGroup[];
  facets?: string | string[];
  maxValuesPerFacet?: number;
  attributesToRetrieve?: string[];
  facetName?: string;
  facetQuery?: string;
  maxFacetHits?: number;
  params?: string;
  useSearchProjection?: boolean;
};

export type SupabaseSearchResult = {
  hits: unknown[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  params?: string;
  facets: Record<string, Record<string, number>>;
  warnings: string[];
  facetHits?: Array<{ value: string; highlighted: string; count: number }>;
};

const MAX_FILTER_LENGTH = 2000;

const splitFilterGroups = (source: string): string[] => {
  const groups: string[] = [];
  let groupStart = 0;
  let index = 0;

  while (index < source.length) {
    if (!source[index] || !source[index]!.trim()) {
      const separatorStart = index;
      while (index < source.length && source[index]!.trim() === "") index++;
      if (source.slice(index, index + 2).toUpperCase() !== "OR") continue;
      index += 2;
      const groupEnd = index;
      while (index < source.length && source[index]!.trim() === "") index++;
      if (index === groupEnd) continue;
      groups.push(source.slice(groupStart, separatorStart));
      groupStart = index;
      continue;
    }
    index++;
  }

  groups.push(source.slice(groupStart));
  return groups;
};

/**
 * Escape a value embedded in a PostgREST `.or(...)` expression. Backslashes
 * must be escaped first so the escapes added for the other grammar markers
 * remain literal.
 */
export const escapePostgrestValue = (value: string) =>
  value
    .replaceAll("\\", String.raw`\\`)
    .replaceAll(/([,()*%_])/g, String.raw`\$1`);

const parseJsonParam = (value?: string): unknown => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const parseFacetFilterGroups = (
  value?: string | string[] | string[][],
): FacetFilterGroup[] => {
  const parsed = typeof value === "string" ? parseJsonParam(value) : value;
  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => [item]);
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((group) => {
      if (Array.isArray(group)) {
        return group.filter((item): item is string => typeof item === "string");
      }
      if (typeof group === "string") return [group];
      return [];
    })
    .filter((group) => group.length > 0);
};

const removeQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseFacetFilter = (value: string): FilterCondition | null => {
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  return {
    attribute: value.slice(0, separator).trim(),
    operator: ":",
    value: removeQuotes(value.slice(separator + 1)),
  };
};

const parseConditions = (value?: string): FilterCondition[] => {
  if (!value) return [];
  const parsed = parseJsonParam(value);
  let source = value;
  if (Array.isArray(parsed)) {
    source = parsed
      .filter((item): item is string => typeof item === "string")
      .join(" AND ");
  } else if (typeof parsed === "string") {
    source = parsed;
  }
  const conditions: FilterCondition[] = [];
  const matcher =
    /([A-Za-z_]\w{0,63})[ 	]{0,8}(>=|<=|!=|=|>|<|:)[ 	]{0,8}(?:"([^"]{0,256})"|'([^']{0,256})'|([^\s()]{1,256}))/g;
  // The filter string is caller-supplied. Bounding both its length and every
  // quantifier above keeps matching linear instead of leaving the engine free
  // to backtrack across a long run of identifier characters.
  for (const match of source.slice(0, MAX_FILTER_LENGTH).matchAll(matcher)) {
    const operator = match[2] as FilterCondition["operator"];
    conditions.push({
      attribute: match[1],
      operator,
      value: removeQuotes(match[3] ?? match[4] ?? match[5] ?? ""),
    });
  }
  return conditions;
};

const parseFilterGroups = (value?: string): FilterCondition[][] => {
  if (!value) return [];
  const parsed = parseJsonParam(value);
  let source = value;
  if (Array.isArray(parsed)) {
    source = parsed
      .filter((item): item is string => typeof item === "string")
      .join(" AND ");
  } else if (typeof parsed === "string") {
    source = parsed;
  }
  return splitFilterGroups(source.slice(0, MAX_FILTER_LENGTH))
    .map(parseConditions)
    .filter((group) => group.length > 0);
};

type DatabaseEqualityFilters = {
  semester?: string[];
};

const uniqueValues = (values: string[]) => [...new Set(values)];

const intersectValues = (left: string[], right: string[]) =>
  left.filter((value) => right.includes(value));

const getFacetSemesterValues = (
  groups: FacetFilterGroup[],
  excludedAttribute?: string,
) => {
  let values: string[] | undefined;

  for (const group of groups) {
    const conditions = group
      .map(parseFacetFilter)
      .filter((condition): condition is FilterCondition => condition !== null);
    const relevantConditions = conditions.filter(
      (condition) => condition.attribute !== excludedAttribute,
    );
    const semesterValues = relevantConditions
      .filter(
        (condition) =>
          condition.attribute === "semester" &&
          (condition.operator === ":" || condition.operator === "="),
      )
      .map((condition) => condition.value)
      .filter(Boolean);

    // A facet group is an OR expression. Only a group made entirely of
    // semester equalities can safely become a database restriction.
    if (
      semesterValues.length === 0 ||
      semesterValues.length !== relevantConditions.length ||
      conditions.length !== group.length
    ) {
      continue;
    }

    const groupValues = uniqueValues(semesterValues);
    values = values ? intersectValues(values, groupValues) : groupValues;
  }

  return values;
};

const getFilterSemesterValues = (
  groups: FilterCondition[][],
  excludedAttribute?: string,
) => {
  if (groups.length === 0) return undefined;

  const values: string[] = [];
  for (const group of groups) {
    const relevantConditions = group.filter(
      (condition) => condition.attribute !== excludedAttribute,
    );
    if (relevantConditions.length === 0) return undefined;
    const semesterValues = relevantConditions
      .filter(
        (condition) =>
          condition.attribute === "semester" &&
          (condition.operator === ":" || condition.operator === "="),
      )
      .map((condition) => condition.value)
      .filter(Boolean);

    // Filter groups are OR branches. Every branch must restrict semester for
    // the union of their semester values to be a safe database restriction.
    if (
      semesterValues.length === 0 ||
      semesterValues.length !== relevantConditions.length
    ) {
      return undefined;
    }
    values.push(...semesterValues);
  }

  return uniqueValues(values);
};

const getDatabaseEqualityFilters = (
  facetGroups: FacetFilterGroup[],
  filterGroups: FilterCondition[][],
  excludedAttribute?: string,
): DatabaseEqualityFilters => {
  const facetSemesterValues = getFacetSemesterValues(
    facetGroups,
    excludedAttribute,
  );
  const filterSemesterValues = getFilterSemesterValues(
    filterGroups,
    excludedAttribute,
  );
  const semesterValues =
    facetSemesterValues && filterSemesterValues
      ? intersectValues(facetSemesterValues, filterSemesterValues)
      : (facetSemesterValues ?? filterSemesterValues);

  return semesterValues && semesterValues.length > 0
    ? { semester: semesterValues }
    : {};
};

export const getCourseHit = (course: CourseRow): CourseHit => ({
  ...course,
  ...deriveSearchFields(course),
});

const getFacetValues = (course: CourseHit, attribute: string): string[] => {
  const value = course[attribute as keyof CourseHit];
  if (attribute === "courseLevel") return [course.courseLevel];
  if (attribute === "separate_times") return course.separate_times;
  if (attribute === "for_class") return course.for_class;
  if (attribute === "credits") return [String(course.credits)];
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
};

const matchesCondition = (course: CourseHit, condition: FilterCondition) => {
  const values = getFacetValues(course, condition.attribute);
  if (values.length === 0) return false;

  if (condition.operator === ":" || condition.operator === "=") {
    return values.some(
      (value) =>
        value.toLocaleLowerCase() === condition.value.toLocaleLowerCase(),
    );
  }

  if (condition.attribute !== "credits") return false;
  const numberValue = Number(condition.value);
  if (!Number.isFinite(numberValue)) return false;
  const courseCredits = course.credits;
  switch (condition.operator) {
    case "!=":
      return courseCredits !== numberValue;
    case ">":
      return courseCredits > numberValue;
    case ">=":
      return courseCredits >= numberValue;
    case "<":
      return courseCredits < numberValue;
    case "<=":
      return courseCredits <= numberValue;
  }
};

const matchesFacetGroups = (
  course: CourseHit,
  groups: FacetFilterGroup[],
  excludedAttribute?: string,
) =>
  groups.every((group) => {
    const conditions = group
      .map(parseFacetFilter)
      .filter((condition): condition is FilterCondition => condition !== null)
      .filter((condition) => condition.attribute !== excludedAttribute);
    if (excludedAttribute !== undefined && conditions.length === 0) return true;
    return conditions.some((condition) => matchesCondition(course, condition));
  });

const searchableCourseFields = (course: CourseHit) =>
  [
    course.name_zh,
    course.name_en,
    course.course,
    course.raw_id,
    course.department,
    ...(course.teacher_zh ?? []),
    ...(course.teacher_en ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

const matchesQuery = (course: CourseHit, query: string) => {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const searchable = searchableCourseFields(course);
  return terms.every((term) => searchable.includes(term));
};

const matchesCourseCode = (course: CourseHit, query: CourseCodeQuery) => {
  const department = course.department
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleUpperCase("en-US");
  const number = course.course.normalize("NFKC").replace(/\D/g, "");
  return (
    department === query.department &&
    (number.startsWith(query.number) || query.number.startsWith(number))
  );
};

const rankCourse = (course: CourseHit, query: string) => {
  const normalizedQuery = query.toLocaleLowerCase().trim();
  if (!normalizedQuery) return 0;
  const fields = [
    course.raw_id,
    course.course,
    course.name_zh,
    course.name_en,
    ...(course.teacher_zh ?? []),
    ...(course.teacher_en ?? []),
    course.department,
  ].map((value) => value.toLocaleLowerCase());
  const exactIndex = fields.indexOf(normalizedQuery);
  if (exactIndex >= 0) return 100 - exactIndex;
  const prefixIndex = fields.findIndex((value) =>
    value.startsWith(normalizedQuery),
  );
  if (prefixIndex >= 0) return 50 - prefixIndex;
  return 0;
};

type SyllabusText = Pick<
  Database["public"]["Tables"]["course_syllabus"]["Row"],
  "brief" | "keywords"
> &
  Partial<
    Pick<Database["public"]["Tables"]["course_syllabus"]["Row"], "content">
  >;
type SyllabusTextRow = Pick<
  Database["public"]["Tables"]["course_syllabus"]["Row"],
  "raw_id" | "brief" | "keywords"
> &
  Partial<
    Pick<Database["public"]["Tables"]["course_syllabus"]["Row"], "content">
  >;

/**
 * Syllabus text lives in course_syllabus, not courses, so a plain courses
 * select returns cards without it. Load it for the returned page only.
 */
const loadSyllabusText = async (
  c: Parameters<typeof supabase_server>[0],
  rawIds: string[],
  includeContent: boolean,
) => {
  const texts = new Map<string, SyllabusText>();
  if (rawIds.length === 0) return texts;
  const result = includeContent
    ? await supabase_server(c)
        .from("course_syllabus")
        .select("raw_id,brief,keywords,content")
        .in("raw_id", rawIds)
    : await supabase_server(c)
        .from("course_syllabus")
        .select("raw_id,brief,keywords")
        .in("raw_id", rawIds);
  const { data, error } = result;
  if (error) {
    // Cards still render without syllabus text; don't fail the search.
    console.error("Fallback syllabus text failed:", error.message);
    return texts;
  }
  for (const row of (data as SyllabusTextRow[] | null) ?? []) {
    texts.set(row.raw_id, {
      brief: row.brief,
      keywords: row.keywords,
      ...(includeContent ? { content: row.content } : {}),
    });
  }
  return texts;
};

const toSearchHit = (
  course: Record<string, unknown>,
  attributes?: string[],
) => {
  if (!attributes || attributes.length === 0 || attributes.includes("*")) {
    return course;
  }

  const hit: Record<string, unknown> = { objectID: course.objectID };
  for (const attribute of attributes) {
    if (attribute in course) hit[attribute] = course[attribute];
  }
  return hit;
};

const applyDatabaseEqualityFilters = <T>(
  query: T,
  filters: DatabaseEqualityFilters,
) => {
  if (!filters.semester || filters.semester.length === 0) return query;

  const filterable = query as T & {
    eq: (column: string, value: string) => T;
    in: (column: string, values: string[]) => T;
  };
  return filters.semester.length === 1
    ? filterable.eq("semester", filters.semester[0]!)
    : filterable.in("semester", filters.semester);
};

const createCourseQuery = (
  c: Parameters<typeof supabase_server>[0],
  text?: string,
  filters: DatabaseEqualityFilters = {},
  courseCode?: CourseCodeQuery,
  from = 0,
  to = from + SCAN_PAGE_SIZE - 1,
) => {
  let query = supabase_server(c).from("courses").select("*");
  if (courseCode) {
    query = query
      .eq("department", courseCode.department)
      .ilike("course", `${courseCode.number}%`);
  } else if (text) {
    const escaped = escapePostgrestValue(text.trim());
    query = query.or(
      ["name_zh", "name_en", "course", "raw_id", "department"]
        .map((column) => `${column}.ilike.*${escaped}*`)
        .join(","),
    );
  }
  query = applyDatabaseEqualityFilters(query, filters);
  return query.order("raw_id", { ascending: false }).range(from, to);
};

/**
 * `search_courses` is an existing database function that matches through the
 * PGroonga indexes on the course name and teacher columns. Those indexes
 * tokenize CJK correctly and cover the `text[]` teacher columns, which
 * PostgREST cannot express with `ilike` at all.
 *
 * Matching in the database also removes the unfiltered bounded scan this
 * previously needed to find teacher matches, which fetched up to
 * MAX_SCAN_ROWS full rows on every keystroke.
 */
const loadCoursesByRpc = (
  c: Parameters<typeof supabase_server>[0],
  keyword: string,
  filters: DatabaseEqualityFilters = {},
  from = 0,
  to = from + SCAN_PAGE_SIZE - 1,
) =>
  applyDatabaseEqualityFilters(
    supabase_server(c).rpc("search_courses", { keyword }),
    filters,
  )
    .order("raw_id", { ascending: false })
    .range(from, to);

type LoadedCourses = {
  courses: CourseHit[];
  truncated: boolean;
  warnings: string[];
};

type CoursePage = {
  data: unknown;
  error: unknown;
};

const scanCoursePages = async (
  loadPage: (from: number, to: number) => Promise<CoursePage>,
): Promise<Omit<LoadedCourses, "warnings">> => {
  const courses = new Map<string, CourseHit>();
  let truncated = false;

  for (let from = 0; from < MAX_SCAN_ROWS; from += SCAN_PAGE_SIZE) {
    const requestedRows = Math.min(SCAN_PAGE_SIZE, MAX_SCAN_ROWS - from);
    const { data, error } = await loadPage(from, from + requestedRows - 1);
    if (error) throw error;

    const scannedRows = Array.isArray(data) ? (data as CourseRow[]) : [];
    for (const course of scannedRows.slice(0, requestedRows)) {
      courses.set(course.raw_id, getCourseHit(course));
    }

    if (scannedRows.length < requestedRows) break;
    if (from + requestedRows >= MAX_SCAN_ROWS) {
      truncated = true;
      break;
    }
  }

  return { courses: [...courses.values()], truncated };
};

const loadCourses = async (
  c: Parameters<typeof supabase_server>[0],
  query: string,
  filters: DatabaseEqualityFilters,
): Promise<LoadedCourses> => {
  const trimmed = query.trim();
  const courseCode = parseCourseCodeQuery(trimmed);

  if (!trimmed || courseCode) {
    const loaded = await scanCoursePages(async (from, to) =>
      createCourseQuery(c, undefined, filters, courseCode, from, to),
    );
    return { ...loaded, warnings: [] };
  }

  try {
    const loaded = await scanCoursePages(async (from, to) =>
      loadCoursesByRpc(c, trimmed, filters, from, to),
    );
    return { ...loaded, warnings: [] };
  } catch (error) {
    // Keep search answering even if the function is unavailable or rejects a
    // query: degrade to the scalar `ilike` match rather than failing outright.
    // Teacher matches are lost on this path, which is why it is not the default.
    const errorDetails =
      typeof error === "object" && error !== null ? error : undefined;
    console.error("search_courses RPC failed, using ilike fallback:", {
      message:
        errorDetails && "message" in errorDetails
          ? errorDetails.message
          : "Unknown error",
      code:
        errorDetails && "code" in errorDetails ? errorDetails.code : undefined,
    });
    const scalar = await scanCoursePages(async (from, to) =>
      createCourseQuery(c, trimmed, filters, undefined, from, to),
    );
    return { ...scalar, warnings: [INSTRUCTOR_MATCH_WARNING] };
  }
};

const getRequestedFacets = (value?: string | string[]) => {
  const parsed = typeof value === "string" ? parseJsonParam(value) : value;
  let parsedValues: string[] = [];
  if (Array.isArray(parsed)) {
    parsedValues = parsed.filter(
      (item): item is string => typeof item === "string",
    );
  } else if (typeof parsed === "string") {
    parsedValues = [parsed];
  }
  const requested =
    parsedValues.length === 0 || parsedValues.includes("*")
      ? [...SUPPORTED_FACETS]
      : parsedValues;
  const unknown = requested.filter(
    (attribute) =>
      !SUPPORTED_FACETS.includes(
        attribute as (typeof SUPPORTED_FACETS)[number],
      ),
  );
  return {
    facets: requested.filter((attribute) => !unknown.includes(attribute)),
    warnings: unknown.map(
      (attribute) => `Facet ignored by fallback: ${attribute}`,
    ),
  };
};

const buildFacets = (
  courses: CourseHit[],
  attributes: string[],
  maxValues: number,
) => {
  const facets: Record<string, Record<string, number>> = {};
  for (const attribute of attributes) {
    const counts = new Map<string, number>();
    for (const course of courses) {
      for (const value of getFacetValues(course, attribute)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    facets[attribute] = Object.fromEntries(
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, maxValues),
    );
  }
  return facets;
};

export const searchSupabase = async (
  c: Parameters<typeof supabase_server>[0],
  options: SupabaseSearchOptions,
): Promise<SupabaseSearchResult> => {
  const query = options.facetName
    ? (options.facetQuery ?? "")
    : (options.query ?? "");
  const facetGroups = options.facetFilters ?? [];
  const filterGroups = parseFilterGroups(options.filters);
  const numericConditions = parseConditions(options.numericFilters);
  const databaseFilters = getDatabaseEqualityFilters(
    facetGroups,
    filterGroups,
    options.facetName,
  );
  const courseCode = options.facetName
    ? undefined
    : parseCourseCodeQuery(query);
  const { facets: requestedFacets, warnings } = getRequestedFacets(
    options.facets,
  );
  const loaded = await loadCourses(
    c,
    options.facetName ? "" : query,
    databaseFilters,
  );
  if (loaded.truncated) warnings.push(SCAN_LIMIT_WARNING);
  warnings.push(...loaded.warnings);
  const courses = loaded.courses;
  const filteredCourses = courses.filter(
    (course) =>
      matchesFacetGroups(course, facetGroups, options.facetName) &&
      (filterGroups.length === 0 ||
        filterGroups.some((group) =>
          group.every((condition) => matchesCondition(course, condition)),
        )) &&
      numericConditions.every((condition) =>
        matchesCondition(course, condition),
      ) &&
      (options.facetName
        ? true
        : courseCode
          ? matchesCourseCode(course, courseCode)
          : matchesQuery(course, query)),
  );

  const hitsPerPage = options.hitsPerPage ?? options.limit ?? 20;
  const page = options.page ?? 0;
  const facets = options.facetName
    ? buildFacets(
        filteredCourses,
        [options.facetName],
        options.maxFacetHits ?? 20,
      )
    : buildFacets(
        filteredCourses,
        requestedFacets,
        options.maxValuesPerFacet ?? 100,
      );

  if (options.facetName) {
    const facetHits = Object.entries(facets[options.facetName] ?? {})
      .filter(([value]) =>
        value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
      .slice(0, options.maxFacetHits ?? 20)
      .map(([value, count]) => ({ value, highlighted: value, count }));

    return {
      hits: [],
      nbHits: filteredCourses.length,
      page,
      nbPages: 0,
      hitsPerPage,
      processingTimeMS: 0,
      query,
      params: options.params,
      facets,
      warnings,
      facetHits,
    };
  }

  const sortedCourses = [...filteredCourses].sort(
    (a, b) =>
      rankCourse(b, query) - rankCourse(a, query) ||
      b.raw_id.localeCompare(a.raw_id),
  );
  const start = page * hitsPerPage;
  const pageCourses = sortedCourses.slice(start, start + hitsPerPage);
  const texts = await loadSyllabusText(
    c,
    pageCourses.map((course) => course.raw_id),
    options.attributesToRetrieve?.includes("content") ?? false,
  );
  const hits = pageCourses.map((course) => {
    const projected = options.useSearchProjection
      ? toSearchProjection(course)
      : course;
    return toSearchHit(
      {
        ...projected,
        ...(texts.get(course.raw_id) ?? {
          brief: null,
          keywords: null,
        }),
      },
      options.attributesToRetrieve,
    );
  });

  return {
    hits,
    nbHits: sortedCourses.length,
    page,
    nbPages:
      hitsPerPage === 0 ? 0 : Math.ceil(sortedCourses.length / hitsPerPage),
    hitsPerPage,
    processingTimeMS: 0,
    query,
    params: options.params,
    facets,
    warnings,
  };
};

const fallbackQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  page: z.coerce.number().int().min(0).optional().default(0),
  hitsPerPage: z.coerce.number().int().min(0).max(MAX_HITS_PER_PAGE).optional(),
  limit: z.coerce.number().int().min(0).max(MAX_HITS_PER_PAGE).optional(),
  filters: z.string().optional(),
  numericFilters: z.string().optional(),
  facetFilters: z.string().optional(),
  facets: z.string().optional(),
  maxValuesPerFacet: z.coerce.number().int().min(1).max(500).optional(),
  attributesToRetrieve: z.string().optional(),
  facetName: z.string().optional(),
  facetQuery: z.string().optional(),
  maxFacetHits: z.coerce.number().int().min(1).max(1000).optional(),
});

const app = new Hono().get(
  "/",
  zValidator("query", fallbackQuerySchema),
  async (c) => {
    const values = c.req.valid("query");
    const query = values.facetName
      ? (values.facetQuery ?? "")
      : (values.query ?? values.q ?? "");
    const facetGroups = parseFacetFilterGroups(values.facetFilters);
    const attributes = values.attributesToRetrieve
      ? (parseJsonParam(values.attributesToRetrieve) as unknown)
      : undefined;
    const attributesToRetrieve = Array.isArray(attributes)
      ? attributes.filter(
          (attribute): attribute is string => typeof attribute === "string",
        )
      : undefined;

    try {
      const result = await searchSupabase(c, {
        query,
        page: values.page,
        hitsPerPage: values.hitsPerPage,
        limit: values.limit,
        filters: values.filters,
        numericFilters: values.numericFilters,
        facetFilters: facetGroups,
        facets: values.facets,
        maxValuesPerFacet: values.maxValuesPerFacet,
        attributesToRetrieve,
        facetName: values.facetName,
        facetQuery: values.facetQuery,
        maxFacetHits: values.maxFacetHits,
        params: new URL(c.req.url).searchParams.toString(),
      });

      if (values.facetName) {
        c.header("Cache-Control", CACHE_CONTROL);
        return c.json({
          success: true,
          data: { facetHits: result.facetHits ?? [] },
        });
      }

      c.header("Cache-Control", CACHE_CONTROL);
      return c.json({
        success: true,
        data: {
          ...result,
        },
      });
    } catch (error) {
      console.error("Supabase fallback search error:", error);
      c.header("Cache-Control", "no-store");
      return c.json(
        {
          success: false,
          error: {
            message: "Fallback search failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        },
        500,
      );
    }
  },
);

export default app;
