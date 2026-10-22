export const TRACKED_COURSE_FIELDS = [
  "times",
  "venues",
  "teacher_zh",
  "teacher_en",
  "capacity",
  "reserve",
  "credits",
  "closed_mark",
  "no_extra_selection",
  "note",
  "restrictions",
] as const;

export type TrackedCourseField = (typeof TRACKED_COURSE_FIELDS)[number];
export type CourseChangeKind = "changed" | "removed" | "reappeared";

export type CourseSnapshot = {
  raw_id: string;
  semester: string;
} & Partial<Record<TrackedCourseField, unknown>>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type CourseChange = {
  raw_id: string;
  semester: string;
  field: TrackedCourseField | "course";
  old_value: JsonValue | null;
  new_value: JsonValue | null;
  kind: CourseChangeKind;
};

export type CourseDiffOptions = {
  previouslyRemovedIds?: ReadonlySet<string>;
};

const normalizeValue = (value: unknown): JsonValue => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map(normalizeValue)
      .filter((item) => item !== null);
    return normalized.length === 0 ? null : normalized;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value as JsonValue;
};

const snapshotValues = (course: CourseSnapshot): Record<string, JsonValue> =>
  Object.fromEntries(
    TRACKED_COURSE_FIELDS.map((field) => [field, normalizeValue(course[field])]),
  );

const sameValue = (left: JsonValue, right: JsonValue) =>
  JSON.stringify(left) === JSON.stringify(right);

export const isCompleteCourseSnapshot = (
  previousRows: readonly CourseSnapshot[],
  newRows: readonly CourseSnapshot[],
): boolean => newRows.length >= previousRows.length * 0.9;

/**
 * Compare two snapshots for one semester. The caller supplies IDs whose
 * latest persisted change is `removed`, allowing a later snapshot to be
 * distinguished from a genuinely new course row.
 */
export const diffCourseRows = (
  previousRows: readonly CourseSnapshot[],
  newRows: readonly CourseSnapshot[],
  options: CourseDiffOptions = {},
): CourseChange[] => {
  if (previousRows.length === 0) return [];

  const previouslyRemovedIds = options.previouslyRemovedIds ?? new Set<string>();
  const previousById = new Map(
    previousRows
      .filter((course) => !previouslyRemovedIds.has(course.raw_id))
      .map((course) => [course.raw_id, course]),
  );
  const newById = new Map(newRows.map((course) => [course.raw_id, course]));
  const changes: CourseChange[] = [];

  if (isCompleteCourseSnapshot(previousRows, newRows)) {
    for (const previous of previousById.values()) {
      if (!newById.has(previous.raw_id)) {
        changes.push({
          raw_id: previous.raw_id,
          semester: previous.semester,
          field: "course",
          old_value: snapshotValues(previous),
          new_value: null,
          kind: "removed",
        });
      }
    }
  }

  for (const current of newRows) {
    const previous = previousById.get(current.raw_id);
    if (!previous) {
      if (previouslyRemovedIds.has(current.raw_id)) {
        changes.push({
          raw_id: current.raw_id,
          semester: current.semester,
          field: "course",
          old_value: null,
          new_value: snapshotValues(current),
          kind: "reappeared",
        });
      }
      continue;
    }

    const oldValues = snapshotValues(previous);
    const newValues = snapshotValues(current);
    for (const field of TRACKED_COURSE_FIELDS) {
      const oldValue = oldValues[field];
      const newValue = newValues[field];
      const oldIsEmpty = oldValue === null;
      const newIsEmpty = newValue === null;

      if (oldIsEmpty && !newIsEmpty) continue;
      if (sameValue(oldValue, newValue)) continue;

      changes.push({
        raw_id: current.raw_id,
        semester: current.semester,
        field,
        old_value: oldValue,
        new_value: newValue,
        kind: "changed",
      });
    }
  }

  return changes;
};
