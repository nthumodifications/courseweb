import type { Database } from "./types/supabase";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

/**
 * Increment this when the serialized search projection changes. It is part of
 * both the manifest and each chunk payload so clients can invalidate old
 * cached indexes after a format change.
 */
export const SEARCH_PROJECTION_FORMAT_VERSION = 1 as const;

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

/**
 * Raw columns needed to build a search hit. Keep this explicit: selecting '*'
 * here would put syllabus/detail-only columns back into every downloaded
 * semester chunk.
 */
export const SEARCH_SOURCE_COLUMNS = [
  "raw_id",
  "semester",
  "department",
  "course",
  "class",
  "name_en",
  "name_zh",
  "credits",
  "capacity",
  "reserve",
  "enrolled",
  "language",
  "ge_target",
  "ge_type",
  "closed_mark",
  "note",
  "prerequisites",
  "restrictions",
  "cross_discipline",
  "teacher_en",
  "teacher_zh",
  "first_specialization",
  "second_specialization",
  "times",
  "venues",
  "tags",
  "updated_at",
] as const satisfies readonly (keyof CourseRow)[];

/** Source-only columns needed to calculate the derived for_class facet. */
export const SEARCH_DERIVATION_COLUMNS = [
  "elective_for",
  "compulsory_for",
] as const satisfies readonly (keyof CourseRow)[];

export const SEARCH_QUERY_COLUMNS = [
  ...SEARCH_SOURCE_COLUMNS,
  ...SEARCH_DERIVATION_COLUMNS,
] as const;

export type SearchSourceCourse = Pick<
  CourseRow,
  (typeof SEARCH_QUERY_COLUMNS)[number]
>;

export type SearchDerivedFields = {
  objectID: string;
  courseLevel: string;
  separate_times: string[];
  for_class: string[];
};

export type SearchProjection = Pick<
  CourseRow,
  (typeof SEARCH_SOURCE_COLUMNS)[number]
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
  const { objectID: _objectID, ...derivedFields } = deriveSearchFields(course);
  return {
    objectID: course.raw_id,
    raw_id: course.raw_id,
    semester: course.semester,
    department: course.department,
    course: course.course,
    class: course.class,
    name_en: course.name_en,
    name_zh: course.name_zh,
    credits: course.credits,
    capacity: course.capacity,
    reserve: course.reserve,
    enrolled: course.enrolled,
    language: course.language,
    ge_target: course.ge_target,
    ge_type: course.ge_type,
    closed_mark: course.closed_mark,
    note: course.note,
    prerequisites: course.prerequisites,
    restrictions: course.restrictions,
    cross_discipline: course.cross_discipline,
    teacher_en: course.teacher_en,
    teacher_zh: course.teacher_zh,
    first_specialization: course.first_specialization,
    second_specialization: course.second_specialization,
    times: course.times,
    venues: course.venues,
    tags: course.tags,
    updated_at: course.updated_at,
    ...derivedFields,
  };
};

/**
 * Course order is part of the serialized representation. Sorting by the
 * stable primary key prevents page/order changes from causing false hashes.
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

/**
 * This is the uncompressed HTTP representation whose SHA-256 is advertised
 * in the manifest and ETag. The JSON envelope is included intentionally, so
 * the hash describes the bytes of the actual successful chunk response.
 */
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
