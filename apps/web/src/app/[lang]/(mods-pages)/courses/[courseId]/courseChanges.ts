import { format } from "date-fns";

export const COURSE_CHANGE_FIELDS = [
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

export type CourseChangeField = (typeof COURSE_CHANGE_FIELDS)[number];
export type CourseChangeKind = "changed" | "removed" | "reappeared";

export type CourseChangeCourse = {
  raw_id: string;
  name_zh: string;
  name_en: string;
  department: string;
  course: string;
  class: string;
};

export type CourseChangeRecord = {
  id: number;
  raw_id: string;
  semester: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  kind: CourseChangeKind;
  detected_at: string;
  course?: CourseChangeCourse | null;
};

export type CourseChangeCourseGroup = {
  rawId: string;
  course: CourseChangeCourse | null;
  changes: CourseChangeRecord[];
};

export type CourseChangeDepartmentGroup = {
  department: string;
  courses: CourseChangeCourseGroup[];
};

export type CourseChangeLabels = {
  fields: Record<string, string>;
  removed: string;
  reappeared: string;
  empty: string;
  trueValue: string;
  falseValue: string;
  valueSeparator: string;
  teacherField: "teacher_zh" | "teacher_en";
};

export type FormattedCourseChange = {
  id: number;
  dateLabel: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  statusLabel: string | null;
};

const isEmptyValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0);

/** Ignore initial empty-to-set writes emitted by the course synchronizer. */
export const filterCourseChanges = (
  changes: readonly CourseChangeRecord[],
): CourseChangeRecord[] =>
  changes.filter(
    (change) =>
      change.kind !== "changed" ||
      !(isEmptyValue(change.old_value) && !isEmptyValue(change.new_value)),
  );

export const getCourseChangeDepartment = (rawId: string): string =>
  rawId.slice(5, 9).trim().replace(/^-/, "");

export const getCourseChangeCourseName = (
  course: CourseChangeCourse | null,
  language: "zh" | "en",
): string => {
  if (!course) return "";
  return language === "en"
    ? course.name_en || course.name_zh
    : course.name_zh || course.name_en;
};

export const groupCourseChanges = (
  changes: readonly CourseChangeRecord[],
): CourseChangeDepartmentGroup[] => {
  const groups = new Map<string, Map<string, CourseChangeCourseGroup>>();

  for (const change of changes) {
    const department =
      change.course?.department ||
      getCourseChangeDepartment(change.raw_id) ||
      "?";
    const courses = groups.get(department) ?? new Map();
    const existing = courses.get(change.raw_id);
    if (existing) {
      existing.changes.push(change);
    } else {
      courses.set(change.raw_id, {
        rawId: change.raw_id,
        course: change.course ?? null,
        changes: [change],
      });
    }
    groups.set(department, courses);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([department, courses]) => ({
      department,
      courses: [...courses.values()].sort((left, right) =>
        left.rawId.localeCompare(right.rawId),
      ),
    }));
};

const COURSE_CHANGE_KINDS: ReadonlySet<string> = new Set([
  "changed",
  "removed",
  "reappeared",
]);

const isCourseChangeKind = (value: unknown): value is CourseChangeKind =>
  typeof value === "string" && COURSE_CHANGE_KINDS.has(value);

const isJsonValue = (value: unknown): boolean => {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value).every(isJsonValue);
  }
  return false;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCourseChangeRecord = (value: unknown): value is CourseChangeRecord => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    Number.isFinite(value.id) &&
    typeof value.raw_id === "string" &&
    typeof value.semester === "string" &&
    typeof value.field === "string" &&
    isCourseChangeKind(value.kind) &&
    typeof value.detected_at === "string" &&
    isJsonValue(value.old_value) &&
    isJsonValue(value.new_value)
  );
};

export const parseCourseChanges = (payload: unknown): CourseChangeRecord[] => {
  if (!Array.isArray(payload) || !payload.every(isCourseChangeRecord)) {
    throw new Error("Invalid course changes payload");
  }
  return payload;
};

const isTeacherField = (field: string): field is "teacher_zh" | "teacher_en" =>
  field === "teacher_zh" || field === "teacher_en";

const syncKey = (change: CourseChangeRecord) =>
  `${change.raw_id}\u0000${change.semester}\u0000${change.detected_at}`;

const formatValue = (
  value: unknown,
  field: string,
  labels: CourseChangeLabels,
): string => {
  if (value === null || value === undefined || value === "") {
    return labels.empty;
  }
  if (typeof value === "boolean") {
    return value ? labels.trueValue : labels.falseValue;
  }
  if (Array.isArray(value)) {
    const values = value.map((item) => formatValue(item, field, labels));
    return values.join(field === "times" ? "" : labels.valueSeparator);
  }
  if (typeof value === "object") {
    return JSON.stringify(value) ?? labels.empty;
  }
  return String(value);
};

const formatDate = (detectedAt: string) => {
  const date = new Date(detectedAt);
  return Number.isNaN(date.getTime()) ? detectedAt : format(date, "yyyy-MM-dd");
};

export const formatCourseChanges = (
  changes: readonly CourseChangeRecord[],
  labels: CourseChangeLabels,
): FormattedCourseChange[] => {
  const teacherFieldsBySync = new Map<string, Set<string>>();
  for (const change of changes) {
    if (!isTeacherField(change.field)) continue;
    const fields =
      teacherFieldsBySync.get(syncKey(change)) ?? new Set<string>();
    fields.add(change.field);
    teacherFieldsBySync.set(syncKey(change), fields);
  }

  return changes.flatMap((change) => {
    if (
      isTeacherField(change.field) &&
      teacherFieldsBySync.get(syncKey(change))?.size === 2 &&
      change.field !== labels.teacherField
    ) {
      return [];
    }

    const isStatusChange =
      change.kind === "removed" || change.kind === "reappeared";
    return [
      {
        id: change.id,
        dateLabel: formatDate(change.detected_at),
        fieldLabel: isTeacherField(change.field)
          ? labels.fields.teacher
          : labels.fields[change.field],
        oldValue: isStatusChange
          ? null
          : formatValue(change.old_value, change.field, labels),
        newValue: isStatusChange
          ? null
          : formatValue(change.new_value, change.field, labels),
        statusLabel:
          change.kind === "removed"
            ? labels.removed
            : change.kind === "reappeared"
              ? labels.reappeared
              : null,
      },
    ];
  });
};
