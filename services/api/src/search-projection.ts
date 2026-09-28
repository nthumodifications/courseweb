import type { Database } from "./types/supabase";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

/**
 * Increment this when the serialized search projection changes. It is part of
 * the manifest and chunk payload so clients can invalidate old cached indexes.
 * Version 2 is the two-tier shape: UI course fields in the search chunk and
 * syllabus text in a separate text chunk.
 */
export const SEARCH_PROJECTION_FORMAT_VERSION = 2 as const;

/** The attributes exposed by the existing fallback search's facet inventory. */
export const SUPPORTED_FACETS = [
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

const DERIVED_SEARCH_FIELDS = [
  "objectID",
  "courseLevel",
  "separate_times",
  "for_class",
] as const;

/**
 * The complete server-to-client search projection contract. Tests derive
 * their required-field assertions from this one list so a field cannot drift
 * out of the projection silently.
 */
export const SEARCH_PROJECTION_FIELDS = [
  "raw_id",
  "semester",
  "department",
  "course",
  "class",
  "name_zh",
  "name_en",
  "teacher_zh",
  "teacher_en",
  "credits",
  "venues",
  "times",
  "language",
  "closed_mark",
  "capacity",
  "reserve",
  "enrolled",
  "tags",
  "ge_target",
  "ge_type",
  "restrictions",
  "note",
  "prerequisites",
  "cross_discipline",
  "first_specialization",
  "second_specialization",
  "compulsory_for",
  "elective_for",
  ...DERIVED_SEARCH_FIELDS,
] as const;

/** Raw course columns emitted in the search chunk. */
export const SEARCH_SOURCE_COLUMNS = SEARCH_PROJECTION_FIELDS.filter(
  (field) => !DERIVED_SEARCH_FIELDS.includes(field as never),
) as readonly (keyof CourseRow)[];

/** Compatibility name used by the row loader and previous implementation. */
export const SEARCH_QUERY_COLUMNS = SEARCH_SOURCE_COLUMNS;

export type SearchSourceCourse = Pick<
  CourseRow,
  (typeof SEARCH_QUERY_COLUMNS)[number]
> &
  Pick<CourseRow, "updated_at">;

export type SearchDerivedFields = {
  objectID: string;
  courseLevel: string;
  separate_times: string[];
  for_class: string[];
};

export type SearchProjection = Pick<
  CourseRow,
  Extract<(typeof SEARCH_PROJECTION_FIELDS)[number], keyof CourseRow>
> &
  SearchDerivedFields;

/**
 * Keep these expressions byte-for-byte equivalent to search-fallback.ts's
 * existing hit derivation. In particular, `match` uses the JS dot semantics,
 * and for_class deliberately appends elective values before compulsory ones.
 */
export const deriveSearchFields = (
  course: Pick<
    CourseRow,
    "raw_id" | "course" | "times" | "elective_for" | "compulsory_for"
  >,
): SearchDerivedFields => ({
  objectID: course.raw_id,
  courseLevel: `${course.course[0] ?? ""}000`,
  separate_times: course.times.flatMap((time) => time.match(/.{1,2}/g) ?? []),
  for_class: [...(course.elective_for ?? []), ...(course.compulsory_for ?? [])],
});

/** Build the only row shape that the client-side course index receives. */
export const toSearchProjection = (
  course: SearchSourceCourse,
): SearchProjection => {
  const derivedFields = deriveSearchFields(course);
  return Object.fromEntries(
    SEARCH_PROJECTION_FIELDS.map((field) => [
      field,
      field in derivedFields
        ? derivedFields[field as keyof SearchDerivedFields]
        : course[field as keyof CourseRow],
    ]),
  ) as SearchProjection;
};

/**
 * Course order is part of the serialized representation. Sorting by the
 * stable primary key prevents page/order changes from causing unstable bytes.
 */
export const sortSearchProjections = (courses: SearchProjection[]) =>
  [...courses].sort((a, b) =>
    a.raw_id < b.raw_id ? -1 : a.raw_id > b.raw_id ? 1 : 0,
  );

export type SearchChunkData = {
  schemaVersion: number;
  semester: string;
  courses: SearchProjection[];
};

/** The uncompressed HTTP representation served to browser clients. */
export const serializeSearchChunk = (
  semester: string,
  courses: SearchProjection[],
  schemaVersion = SEARCH_PROJECTION_FORMAT_VERSION,
) =>
  JSON.stringify({
    success: true,
    data: {
      schemaVersion,
      semester,
      courses: sortSearchProjections(courses),
    },
  });
