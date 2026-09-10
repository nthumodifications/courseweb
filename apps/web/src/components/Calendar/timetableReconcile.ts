import { CalendarEvent } from "./calendar.types";

/**
 * The fields that are persisted for a timetable-generated event. The actual
 * RxDB documents also contain actualEnd, but that value is derived from the
 * repeat definition and is therefore covered by comparing repeat below.
 */
export type PersistedTimetableEvent = Partial<CalendarEvent> &
  Pick<CalendarEvent, "id">;

export type TimetableReconcileInput = {
  generated: CalendarEvent[];
  /** Persisted generated events already narrowed to the semester being visited. */
  persisted: PersistedTimetableEvent[];
  semester: string;
};

const dateValue = (value: Date | string | undefined) => {
  if (value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const comparableEvent = (event: PersistedTimetableEvent) => ({
  id: event.id,
  title: event.title,
  details: event.details ?? "",
  location: event.location ?? "",
  allDay: event.allDay,
  start: dateValue(event.start),
  end: dateValue(event.end),
  repeat: event.repeat,
  color: event.color,
  tag: event.tag,
  courseId: event.courseId ?? null,
  excludedDates: (event.excludedDates ?? []).map(dateValue),
  parentId: event.parentId ?? "",
});

const eventsEqual = (
  left: PersistedTimetableEvent,
  right: PersistedTimetableEvent,
) => {
  const fullEventFields = [
    "title",
    "allDay",
    "start",
    "end",
    "repeat",
    "color",
    "tag",
  ] as const;
  // Keep the pure API useful with the compact { id, courseId } shape too.
  // Real RxDB documents contain these required fields, so metadata changes
  // still produce an upsert in the application path.
  if (
    !fullEventFields.every((field) =>
      Object.prototype.hasOwnProperty.call(right, field),
    )
  ) {
    return true;
  }

  const leftComparable = comparableEvent(left);
  const rightComparable = comparableEvent(right);
  return JSON.stringify(leftComparable) === JSON.stringify(rightComparable);
};

/**
 * Return the semesters that need a reconciliation pass. In particular, a
 * checkpoint without a current course key is still a visit with an empty
 * generated set.
 */
export const getTimetableSyncSemesters = (
  currentSemesters: readonly string[],
  checkpoints: readonly { semester: string }[],
) => [
  ...new Set([
    ...currentSemesters,
    ...checkpoints.map(({ semester }) => semester),
  ]),
];

/**
 * Diff one semester's generated timetable events against its persisted
 * generated events. Hand-made events are never candidates for either side of
 * the mutation, even if their id resembles a timetable event id.
 */
export const reconcileTimetableEvents = ({
  generated,
  persisted,
  semester: _semester,
}: TimetableReconcileInput): {
  toUpsert: CalendarEvent[];
  toDelete: string[];
} => {
  const handMadeIds = new Set(
    persisted
      .filter((event) => event.courseId == null)
      .map((event) => event.id),
  );
  const persistedGenerated = persisted.filter(
    (event) => event.courseId != null && !handMadeIds.has(event.id),
  );
  const generatedById = new Map(
    generated
      .filter((event) => event.courseId != null && !handMadeIds.has(event.id))
      .map((event) => [event.id, event]),
  );
  const persistedById = new Map(
    persistedGenerated.map((event) => [event.id, event]),
  );

  const toDelete = persistedGenerated
    .filter((event) => !generatedById.has(event.id))
    .map((event) => event.id);
  const toUpsert = [...generatedById.values()].filter((event) => {
    const existing = persistedById.get(event.id);
    return !existing || !eventsEqual(event, existing);
  });

  return { toUpsert, toDelete };
};
