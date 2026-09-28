/**
 * The NTHU timetable has seven day codes (including Sunday/U) and fourteen
 * period codes.  A JavaScript bitwise number only has 32 useful bits, so the
 * mask deliberately stays a four-word Uint32Array.
 */
export const TIME_DAYS = ["M", "T", "W", "R", "F", "S", "U"] as const;
export const TIME_PERIODS = [
  "1",
  "2",
  "3",
  "4",
  "n",
  "5",
  "6",
  "7",
  "8",
  "9",
  "a",
  "b",
  "c",
  "d",
] as const;

export type TimeDay = (typeof TIME_DAYS)[number];
export type TimePeriod = (typeof TIME_PERIODS)[number];
export type TimeMask = Uint32Array;

const WORD_COUNT = 4;
const BITS_PER_WORD = 32;
const SLOT_COUNT = TIME_DAYS.length * TIME_PERIODS.length;
const SLOT_PATTERN = /([MTWRFSU])([1-9nabcd])/gi;

const isTimeMask = (value: unknown): value is TimeMask =>
  value instanceof Uint32Array && value.length === WORD_COUNT;

const emptyMask = (): TimeMask => new Uint32Array(WORD_COUNT);

/** Convert a day and period code into the stable 0..97 bit index. */
export const slotIndex = (day: string, period: string): number => {
  const dayIndex = TIME_DAYS.indexOf(day.toUpperCase() as TimeDay);
  const periodIndex = TIME_PERIODS.indexOf(period.toLowerCase() as TimePeriod);
  if (dayIndex < 0 || periodIndex < 0) return -1;
  return dayIndex * TIME_PERIODS.length + periodIndex;
};

const setBit = (mask: TimeMask, index: number) => {
  if (index < 0 || index >= SLOT_COUNT) return;
  mask[Math.floor(index / BITS_PER_WORD)] |= 1 << index % BITS_PER_WORD;
};

const maskFromSlots = (slots: Iterable<string>): TimeMask => {
  const mask = emptyMask();
  for (const slot of slots) {
    const match = /^([MTWRFSU])([1-9nabcd])$/i.exec(slot.trim());
    if (match) setBit(mask, slotIndex(match[1], match[2]));
  }
  return mask;
};

/** Parse one or more compact NTHU time blocks into a 98-bit mask. */
export const maskFromTimes = (times: readonly string[] | null | undefined) => {
  const mask = emptyMask();
  for (const time of times ?? []) {
    for (const match of String(time ?? "").matchAll(SLOT_PATTERN)) {
      setBit(mask, slotIndex(match[1], match[2]));
    }
  }
  return mask;
};

/** Parse already-derived values such as ["M3", "M4", "Mn"]. */
export const maskFromSeparateTimes = (
  slots: readonly string[] | null | undefined,
) => maskFromSlots(slots ?? []);

export const maskHasBits = (mask: TimeMask) => mask.some((word) => word !== 0);

export const maskHasOverlap = (left: TimeMask, right: TimeMask) =>
  left.some((word, index) => (word & right[index]) !== 0);

const asMask = (
  value:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
): TimeMask => {
  if (isTimeMask(value)) return value;
  if (Array.isArray(value)) return maskFromTimes(value);
  if (value && typeof value === "object") {
    if ("timeMask" in value && isTimeMask(value.timeMask)) {
      return value.timeMask;
    }
    return maskFromTimes("times" in value ? value.times : undefined);
  }
  return emptyMask();
};

/**
 * True when a course overlaps an occupied timetable. Unknown-time courses are
 * conservative: they conflict with any non-empty occupied timetable because
 * their time cannot be proven safe. With an empty occupied timetable there is
 * no known overlap, so they remain selectable.
 */
export const conflict = (
  course:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
  occupied: TimeMask,
) => {
  const courseMask = asMask(course);
  if (!maskHasBits(courseMask)) return maskHasBits(occupied);
  return maskHasOverlap(courseMask, occupied);
};

/**
 * Predicate form: does this course have zero timetable conflicts? Array form
 * is convenient for a saved timetable: it returns only courses with zero
 * conflicts and preserves the input order.
 */
export function zeroConflicts(
  course:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
  occupied: TimeMask,
): boolean;
export function zeroConflicts<
  T extends
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
>(courses: readonly T[], occupied: TimeMask): T[];
export function zeroConflicts(
  courseOrCourses:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[]
    | readonly (
        | TimeMask
        | { timeMask?: TimeMask; times?: readonly string[] }
        | readonly string[]
      )[],
  occupied: TimeMask,
) {
  // A Uint32Array is a mask, while a normal array of strings is a course's
  // compact schedule. Only an array whose first element is a mask/object is
  // interpreted as the collection overload.
  const isCollection =
    Array.isArray(courseOrCourses) &&
    (courseOrCourses.length === 0 || typeof courseOrCourses[0] === "object");
  if (isCollection) {
    return courseOrCourses.filter(
      (course) => !conflict(course as TimeMask, occupied),
    );
  }
  return !conflict(courseOrCourses as TimeMask, occupied);
}

/** True when at least one wanted slot is used by the course. */
export const usesAny = (
  course:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
  wanted: TimeMask,
) => maskHasOverlap(asMask(course), wanted);

/**
 * True when every known course slot is in the allowed mask. Empty/unknown
 * schedules return false: an unknown schedule is not evidence of compliance.
 */
export const usesOnly = (
  course:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
  allowed: TimeMask,
) => {
  const courseMask = asMask(course);
  return (
    maskHasBits(courseMask) &&
    courseMask.every((word, index) => (word & ~allowed[index]) === 0)
  );
};

/** True when the course has no known slot on a day (U/Sunday included). */
export const freeOnDay = (
  course:
    | TimeMask
    | { timeMask?: TimeMask; times?: readonly string[] }
    | readonly string[],
  day: number | string,
) => {
  const dayIndex =
    typeof day === "number"
      ? day
      : TIME_DAYS.indexOf(day.toUpperCase() as TimeDay);
  if (dayIndex < 0 || dayIndex >= TIME_DAYS.length) return false;
  const dayMask = maskFromSlots(
    TIME_PERIODS.map((period) => `${TIME_DAYS[dayIndex]}${period}`),
  );
  return !usesAny(course, dayMask) && maskHasBits(asMask(course));
};

export const timeMaskForRecord = (record: {
  times?: readonly string[] | null;
  separate_times?: readonly string[] | null;
}) =>
  record.separate_times?.length
    ? maskFromSeparateTimes(record.separate_times)
    : maskFromTimes(record.times);
