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

export type TimeSlot = `${(typeof TIME_DAYS)[number]}${(typeof TIME_PERIODS)[number]}`;

const SLOT_PATTERN = /([MTWRFSU])([1-9nabcd])/gi;

const slotOrder = (slot: string) => {
  const day = TIME_DAYS.indexOf(slot[0] as (typeof TIME_DAYS)[number]);
  const period = TIME_PERIODS.indexOf(
    slot[1] as (typeof TIME_PERIODS)[number],
  );
  return day * TIME_PERIODS.length + period;
};

/** Parse raw course times such as ["M3M4", "W2W3W4"] into unique slots. */
export const parseTimeSlots = (
  times: readonly string[] | null | undefined,
): string[] => {
  const slots = new Set<string>();
  for (const time of times ?? []) {
    for (const match of String(time ?? "").matchAll(SLOT_PATTERN)) {
      slots.add(`${match[1].toUpperCase()}${match[2].toLowerCase()}`);
    }
  }
  return [...slots].sort((left, right) => slotOrder(left) - slotOrder(right));
};

export const slotsOverlap = (
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined,
) => {
  const rightSlots = new Set(right ?? []);
  return (left ?? []).some((slot) => rightSlots.has(slot));
};

export type TimedCourse = {
  raw_id: string;
  name_zh?: string;
  name_en?: string;
  times?: readonly string[] | null;
};

export type TimetableConflict = {
  first: string;
  second: string;
  overlappingSlots: string[];
};

/** Return every pair of courses sharing at least one parsed timetable slot. */
export const findTimetableConflicts = (
  courses: readonly TimedCourse[],
): TimetableConflict[] => {
  const conflicts: TimetableConflict[] = [];
  for (let leftIndex = 0; leftIndex < courses.length; leftIndex += 1) {
    const leftSlots = parseTimeSlots(courses[leftIndex].times);
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < courses.length;
      rightIndex += 1
    ) {
      const rightSlots = parseTimeSlots(courses[rightIndex].times);
      const overlappingSlots = leftSlots.filter((slot) =>
        rightSlots.includes(slot),
      );
      if (overlappingSlots.length > 0) {
        conflicts.push({
          first: courses[leftIndex].raw_id,
          second: courses[rightIndex].raw_id,
          overlappingSlots,
        });
      }
    }
  }
  return conflicts;
};

export const getOccupiedSlots = (courses: readonly TimedCourse[]) =>
  [...new Set(courses.flatMap((course) => parseTimeSlots(course.times)))].sort(
    (left, right) => slotOrder(left) - slotOrder(right),
  );

export const findFreePeriods = (
  occupiedSlots: readonly string[] | null | undefined,
) => {
  const occupied = new Set(occupiedSlots ?? []);
  return TIME_DAYS.flatMap((day) =>
    TIME_PERIODS.map((period) => `${day}${period}`).filter(
      (slot) => !occupied.has(slot),
    ),
  );
};

export const groupSlotsByDay = (slots: readonly string[]) =>
  Object.fromEntries(
    TIME_DAYS.map((day) => [
      day,
      slots.filter((slot) => slot.startsWith(day)),
    ]),
  ) as Record<(typeof TIME_DAYS)[number], string[]>;

export const trimText = (value: unknown, maxLength = 600): string => {
  if (value == null) return "";
  const text = String(value).trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

export const trimList = <T>(values: readonly T[] | null | undefined, max = 15) =>
  (values ?? []).slice(0, Math.max(0, max));
