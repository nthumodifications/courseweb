import { timeMaskForRecord } from "./time-mask";

export const LOCAL_FACETS = [
  "courseLevel",
  "cross_discipline",
  "department",
  "first_specialization",
  "for_class",
  "ge_target",
  "ge_type",
  "language",
  "second_specialization",
  "semester",
  "separate_times",
  "tags",
  "venues",
] as const;

export type LocalFacet = (typeof LOCAL_FACETS)[number];
export type UnknownRecord = Record<string, unknown>;

/** The fields included in searchableText and checked by matchesLocalQuery. */
export const SEARCHABLE_FIELDS = [
  "raw_id",
  "department",
  "course",
  "name_zh",
  "teacher_zh",
  "name_en",
  "teacher_en",
  "venues",
] as const;

export type SearchProjectionRecord = UnknownRecord & {
  objectID: string;
  raw_id: string;
  semester: string;
  department: string;
  course: string;
  class: string;
  name_zh: string;
  name_en: string;
  teacher_zh: string[];
  teacher_en: string[];
  credits: number | null;
  venues: string[];
  times: string[];
  language: string;
  closed_mark: string | null;
  capacity: number | null;
  reserve: number | null;
  enrolled: number;
  tags: string[];
  ge_target: string | null;
  ge_type: string | null;
  brief: string | null;
  restrictions: string | null;
  note: string | null;
  prerequisites: string | null;
  keywords: string[] | null;
  separate_times: string[];
  for_class: string[];
  courseLevel: string;
};

const asString = (value: unknown) => (value == null ? "" : String(value));

const asNullableString = (value: unknown): string | null =>
  value == null ? null : String(value);

const asNullableNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Remove presentation markup from the indexed value without changing hits. */
export const stripHtmlTags = (value: string) =>
  value.replace(/<!--[\s\S]*?-->|<[^>]*>/g, " ");

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item) => item != null && item !== "").map(String)
    : [];

export const separateTimes = (times: readonly string[] | null | undefined) =>
  asStringArray(times).flatMap((time) => String(time).match(/.{1,2}/g) ?? []);

/**
 * Convert both the raw Supabase stand-in and the server's derived projection
 * into one stable hit shape. Empty/null optional arrays are normalized because
 * the current result renderer calls .map/.includes on them directly.
 */
export const prepareSearchRecord = (
  input: UnknownRecord,
): SearchProjectionRecord => {
  const rawId = asString(input.objectID ?? input.raw_id);
  const times = asStringArray(input.times);
  const separate = asStringArray(input.separate_times);
  const compulsory = asStringArray(input.compulsory_for);
  const elective = asStringArray(input.elective_for);

  return {
    ...input,
    objectID: rawId,
    raw_id: asString(input.raw_id ?? rawId),
    semester: asString(input.semester),
    department: asString(input.department),
    course: asString(input.course),
    class: asString(input.class),
    name_zh: asString(input.name_zh),
    name_en: asString(input.name_en),
    teacher_zh: asStringArray(input.teacher_zh),
    teacher_en: asStringArray(input.teacher_en),
    credits:
      typeof input.credits === "number" && Number.isFinite(input.credits)
        ? input.credits
        : input.credits == null || input.credits === ""
          ? null
          : Number.isFinite(Number(input.credits))
            ? Number(input.credits)
            : null,
    venues: asStringArray(input.venues),
    times,
    language: asString(input.language),
    closed_mark: asNullableString(input.closed_mark),
    capacity: asNullableNumber(input.capacity),
    reserve: asNullableNumber(input.reserve),
    enrolled: asNullableNumber(input.enrolled) ?? 0,
    tags: asStringArray(input.tags),
    ge_target: asNullableString(input.ge_target),
    ge_type: asNullableString(input.ge_type),
    brief: asNullableString(input.brief),
    restrictions: asNullableString(input.restrictions),
    note: asNullableString(input.note),
    prerequisites: asNullableString(input.prerequisites),
    keywords: Array.isArray(input.keywords)
      ? input.keywords.filter((item) => item != null).map(String)
      : input.keywords == null
        ? null
        : [String(input.keywords)],
    cross_discipline: asStringArray(input.cross_discipline),
    first_specialization: asStringArray(input.first_specialization),
    second_specialization: asStringArray(input.second_specialization),
    compulsory_for: compulsory,
    elective_for: elective,
    separate_times: separate.length ? separate : separateTimes(times),
    for_class: asStringArray(input.for_class).length
      ? asStringArray(input.for_class)
      : [...elective, ...compulsory],
    courseLevel:
      asString(input.courseLevel) || `${asString(input.course)[0] ?? ""}000`,
  };
};

const searchableFieldValuesCache = new WeakMap<
  SearchProjectionRecord,
  string[][]
>();

/** Normalized searchable values grouped by source field. */
export const searchableFieldValues = (record: SearchProjectionRecord) => {
  const cached = searchableFieldValuesCache.get(record);
  if (cached) return cached;

  const values = SEARCHABLE_FIELDS.map((field) => {
    const value = record[field];
    return (Array.isArray(value) ? value : [value])
      .filter(Boolean)
      .map((item) => stripHtmlTags(String(item)).toLocaleLowerCase("zh-TW"));
  });
  searchableFieldValuesCache.set(record, values);
  return values;
};

export const searchableFields = (record: SearchProjectionRecord) =>
  searchableFieldValues(record).flat();

export const searchableText = (record: SearchProjectionRecord) =>
  searchableFields(record).join(" ");

export const recordTimeMask = timeMaskForRecord;

const facetValuesCache = new WeakMap<
  SearchProjectionRecord,
  Map<string, string[]>
>();

const normalizedFacetValuesCache = new WeakMap<
  SearchProjectionRecord,
  Map<string, string[]>
>();

export const facetValues = (
  record: SearchProjectionRecord,
  attribute: string,
): string[] => {
  const cached = facetValuesCache.get(record)?.get(attribute);
  if (cached) return cached;

  let values: string[];
  if (attribute === "courseLevel")
    values = record.courseLevel ? [record.courseLevel] : [];
  else if (attribute === "separate_times") values = record.separate_times;
  else if (attribute === "for_class") values = record.for_class;
  else if (attribute === "times") values = record.times;
  else {
    const value = record[attribute];
    if (
      attribute === "ge_target" ||
      attribute === "ge_type" ||
      attribute === "language" ||
      attribute === "semester" ||
      attribute === "department"
    ) {
      // The remote index retains an explicit empty ge_type value. Preserve
      // explicit empty scalars while still omitting absent/null fields.
      values = value == null ? [] : [String(value)];
    } else values = asStringArray(value);
  }

  const recordCache =
    facetValuesCache.get(record) ?? new Map<string, string[]>();
  recordCache.set(attribute, values);
  facetValuesCache.set(record, recordCache);
  return values;
};

/** Lowercased facet values for case-insensitive refinement checks. */
export const normalizedFacetValues = (
  record: SearchProjectionRecord,
  attribute: string,
) => {
  const cached = normalizedFacetValuesCache.get(record)?.get(attribute);
  if (cached) return cached;

  const values = facetValues(record, attribute).map((value) =>
    value.toLocaleLowerCase("zh-TW"),
  );
  const recordCache =
    normalizedFacetValuesCache.get(record) ?? new Map<string, string[]>();
  recordCache.set(attribute, values);
  normalizedFacetValuesCache.set(record, recordCache);
  return values;
};
