import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import type { Database } from "./types/supabase";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseHit = CourseRow & {
  objectID: string;
  courseLevel: string;
  separate_times: string[];
  for_class: string[];
};

const MAX_SCAN_ROWS = 10_000;
const MAX_HITS_PER_PAGE = 100;
const CACHE_CONTROL =
  "public, max-age=30, s-maxage=300, stale-while-revalidate=60";
const SUPPORTED_FACETS = [
  "semester",
  "department",
  "language",
  "ge_target",
  "ge_type",
  "tags",
  "times",
  "venues",
  "first_specialization",
  "second_specialization",
  "cross_discipline",
  "courseLevel",
  "separate_times",
  "for_class",
  "credits",
] as const;

type FilterCondition = {
  attribute: string;
  operator: ":" | "=" | "!=" | ">" | ">=" | "<" | "<=";
  value: string;
};

type FacetFilterGroup = string[];

const MAX_FILTER_LENGTH = 2000;

/**
 * Escape a value embedded in a PostgREST `.or(...)` expression. Backslashes
 * must be escaped first so the escapes added for the other grammar markers
 * remain literal.
 */
export const escapePostgrestValue = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/([,()*%_])/g, "\\$1");

const parseJsonParam = (value?: string): unknown => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseFacetFilterGroups = (value?: string): FacetFilterGroup[] => {
  const parsed = parseJsonParam(value);
  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => [item]);
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((group) =>
      Array.isArray(group)
        ? group.filter((item): item is string => typeof item === "string")
        : typeof group === "string"
          ? [group]
          : [],
    )
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
  const source = Array.isArray(parsed)
    ? parsed
        .filter((item): item is string => typeof item === "string")
        .join(" AND ")
    : typeof parsed === "string"
      ? parsed
      : value;
  const conditions: FilterCondition[] = [];
  const matcher =
    /([A-Za-z_][A-Za-z0-9_]{0,63})[ 	]{0,8}(>=|<=|!=|=|>|<|:)[ 	]{0,8}(?:"([^"]{0,256})"|'([^']{0,256})'|([^\s()]{1,256}))/g;
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

const getCourseHit = (course: CourseRow): CourseHit => ({
  ...course,
  objectID: course.raw_id,
  courseLevel: `${course.course[0] ?? ""}000`,
  separate_times: course.times.flatMap((time) => time.match(/.{1,2}/g) ?? []),
  for_class: [...(course.elective_for ?? []), ...(course.compulsory_for ?? [])],
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

const matchesFacetGroups = (course: CourseHit, groups: FacetFilterGroup[]) =>
  groups.every((group) =>
    group.some((filter) => {
      const condition = parseFacetFilter(filter);
      return condition ? matchesCondition(course, condition) : false;
    }),
  );

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
  const exactIndex = fields.findIndex((value) => value === normalizedQuery);
  if (exactIndex >= 0) return 100 - exactIndex;
  const prefixIndex = fields.findIndex((value) =>
    value.startsWith(normalizedQuery),
  );
  if (prefixIndex >= 0) return 50 - prefixIndex;
  return 0;
};

const toSearchHit = (course: CourseHit, attributes?: string[]) => {
  if (!attributes || attributes.length === 0 || attributes.includes("*")) {
    return course;
  }

  const hit: Record<string, unknown> = { objectID: course.objectID };
  for (const attribute of attributes) {
    if (attribute in course)
      hit[attribute] = course[attribute as keyof CourseHit];
  }
  return hit;
};

const createCourseQuery = (
  c: Parameters<typeof supabase_server>[0],
  text?: string,
) => {
  let query = supabase_server(c).from("courses").select("*");
  if (text) {
    const escaped = escapePostgrestValue(text.trim());
    query = query.or(
      ["name_zh", "name_en", "course", "raw_id", "department"]
        .map((column) => `${column}.ilike.*${escaped}*`)
        .join(","),
    );
  }
  return query
    .order("raw_id", { ascending: false })
    .range(0, MAX_SCAN_ROWS - 1);
};

const loadCourses = async (
  c: Parameters<typeof supabase_server>[0],
  query: string,
) => {
  // PostgREST cannot apply `ilike` to text[] columns such as teacher_zh. The
  // scalar `.or(...)` query narrows the common case, while the bounded scan
  // supplies teacher matches that PostgREST cannot express safely.
  const requests = query.trim()
    ? [createCourseQuery(c, query), createCourseQuery(c)]
    : [createCourseQuery(c)];
  const results = await Promise.all(requests);
  const errors = results.map((result) => result.error).filter(Boolean);
  if (errors.length > 0) throw errors[0];

  const courses = new Map<string, CourseHit>();
  for (const result of results) {
    for (const course of (result.data ?? []) as CourseRow[]) {
      courses.set(course.raw_id, getCourseHit(course));
    }
  }
  return [...courses.values()];
};

const getRequestedFacets = (value?: string) => {
  const parsed = parseJsonParam(value);
  const parsedValues = Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : typeof parsed === "string"
      ? [parsed]
      : [];
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

const fallbackQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  page: z.coerce.number().int().min(0).optional().default(0),
  hitsPerPage: z.coerce.number().int().min(1).max(MAX_HITS_PER_PAGE).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_HITS_PER_PAGE).optional(),
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
    const conditions = [
      ...parseConditions(values.filters),
      ...parseConditions(values.numericFilters),
    ];
    const { facets: requestedFacets, warnings } = getRequestedFacets(
      values.facets,
    );
    const attributes = values.attributesToRetrieve
      ? (parseJsonParam(values.attributesToRetrieve) as unknown)
      : undefined;
    const attributesToRetrieve = Array.isArray(attributes)
      ? attributes.filter(
          (attribute): attribute is string => typeof attribute === "string",
        )
      : undefined;

    try {
      const courses = await loadCourses(c, values.facetName ? "" : query);
      const filteredCourses = courses.filter(
        (course) =>
          matchesFacetGroups(course, facetGroups) &&
          conditions.every((condition) =>
            matchesCondition(course, condition),
          ) &&
          (values.facetName ? true : matchesQuery(course, query)),
      );

      if (values.facetName) {
        const facetHits =
          buildFacets(
            filteredCourses,
            [values.facetName],
            values.maxFacetHits ?? 20,
          )[values.facetName] ?? {};
        const facetQuery = (values.facetQuery ?? "").toLocaleLowerCase();
        const filteredFacetHits = Object.entries(facetHits)
          .filter(([value]) => value.toLocaleLowerCase().includes(facetQuery))
          .slice(0, values.maxFacetHits ?? 20)
          .map(([value, count]) => ({ value, highlighted: value, count }));

        c.header("Cache-Control", CACHE_CONTROL);
        return c.json({
          success: true,
          data: { facetHits: filteredFacetHits },
        });
      }

      const hitsPerPage = values.hitsPerPage ?? values.limit ?? 20;
      const page = values.page;
      const sortedCourses = [...filteredCourses].sort(
        (a, b) =>
          rankCourse(b, query) - rankCourse(a, query) ||
          b.raw_id.localeCompare(a.raw_id),
      );
      const start = page * hitsPerPage;
      const hits = sortedCourses
        .slice(start, start + hitsPerPage)
        .map((course) => toSearchHit(course, attributesToRetrieve));
      const processingTimeMS = 0;

      c.header("Cache-Control", CACHE_CONTROL);
      return c.json({
        success: true,
        data: {
          hits,
          nbHits: sortedCourses.length,
          page,
          nbPages: Math.ceil(sortedCourses.length / hitsPerPage),
          hitsPerPage,
          processingTimeMS,
          query,
          params: new URL(c.req.url).searchParams.toString(),
          facets: buildFacets(
            filteredCourses,
            requestedFacets,
            values.maxValuesPerFacet ?? 100,
          ),
          warnings,
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
