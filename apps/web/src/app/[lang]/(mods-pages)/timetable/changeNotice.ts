import type { CourseChangeRecord } from "../courses/[courseId]/courseChanges";

export type CourseChangeNoticeGroup = {
  raw_id: string;
  changes: CourseChangeRecord[];
};

export const getCourseChangesForNotice = (
  changes: readonly CourseChangeRecord[] | undefined,
  isLoading: boolean,
  error: unknown,
): readonly CourseChangeRecord[] => {
  if (isLoading || (error && !changes)) return [];
  return changes ?? [];
};

const isEmptyOldValue = (value: unknown) =>
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const isUrgentChange = (change: CourseChangeRecord) => {
  if (change.kind === "removed" || change.kind === "reappeared") return true;
  return (
    change.kind === "changed" &&
    (change.field === "times" || change.field === "venues") &&
    !isEmptyOldValue(change.old_value)
  );
};

const compareNewestFirst = (
  left: CourseChangeRecord,
  right: CourseChangeRecord,
) => {
  const detectedAt = right.detected_at.localeCompare(left.detected_at);
  return detectedAt || right.id - left.id;
};

export const selectUrgentCourseChanges = (
  changes: readonly CourseChangeRecord[],
  seenIds: ReadonlySet<number>,
): CourseChangeNoticeGroup[] => {
  const newestFirst = changes
    .filter((change) => !seenIds.has(change.id) && isUrgentChange(change))
    .sort(compareNewestFirst);
  const groups = new Map<string, Map<string, CourseChangeRecord>>();

  for (const change of newestFirst) {
    const fields = groups.get(change.raw_id) ?? new Map();
    if (!fields.has(change.field)) fields.set(change.field, change);
    groups.set(change.raw_id, fields);
  }

  return [...groups].map(([raw_id, fields]) => ({
    raw_id,
    changes: [...fields.values()].sort(compareNewestFirst),
  }));
};
