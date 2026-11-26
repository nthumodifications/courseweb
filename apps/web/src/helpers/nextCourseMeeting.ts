import { scheduleTimeSlots } from "@courseweb/shared";

const DAY_OF_WEEK: Record<string, number> = {
  M: 1,
  T: 2,
  W: 3,
  R: 4,
  F: 5,
  S: 6,
  U: 0,
};

const DAY_ORDER: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  0: 6,
};

export type CourseMeeting = {
  dayOfWeek: number;
  start: string;
  end: string;
  startSlotIndex: number;
  endSlotIndex: number;
  venue: string;
};

export type NextCourseMeeting = CourseMeeting & {
  daysFromToday: number;
};

const parseTimeSlots = (times: string) => {
  const slotsByDay = new Map<number, Set<number>>();
  const matches = times.matchAll(/([MTWRFSU])([1-9]|n|a|b|c|d)/gi);

  for (const match of matches) {
    const day = DAY_OF_WEEK[match[1]!.toUpperCase()];
    const slotIndex = scheduleTimeSlots.findIndex(
      (slot) => slot.time === match[2]!.toLowerCase(),
    );
    if (day === undefined || slotIndex < 0) continue;

    const slots = slotsByDay.get(day) ?? new Set<number>();
    slots.add(slotIndex);
    slotsByDay.set(day, slots);
  }

  return slotsByDay;
};

/** Expand course time strings into contiguous weekday meetings. */
export const getCourseMeetingGroups = (
  times: readonly string[],
  venues: readonly string[],
): CourseMeeting[] => {
  const meetings: CourseMeeting[] = [];

  times.forEach((time, venueIndex) => {
    const slotsByDay = parseTimeSlots(time);
    const days = [...slotsByDay.keys()].sort(
      (left, right) => DAY_ORDER[left]! - DAY_ORDER[right]!,
    );

    for (const dayOfWeek of days) {
      const slots = [...slotsByDay.get(dayOfWeek)!].sort(
        (left, right) => left - right,
      );
      let startSlotIndex = slots[0];
      let endSlotIndex = startSlotIndex;

      const addMeeting = () => {
        if (startSlotIndex === undefined || endSlotIndex === undefined) return;
        meetings.push({
          dayOfWeek,
          start: scheduleTimeSlots[startSlotIndex]!.start,
          end: scheduleTimeSlots[endSlotIndex]!.end,
          startSlotIndex,
          endSlotIndex,
          venue: venues[venueIndex] ?? "",
        });
      };

      for (const slotIndex of slots.slice(1)) {
        if (slotIndex === endSlotIndex + 1) {
          endSlotIndex = slotIndex;
        } else {
          addMeeting();
          startSlotIndex = slotIndex;
          endSlotIndex = slotIndex;
        }
      }
      addMeeting();
    }
  });

  return meetings;
};

const taipeiDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

/** Find the next meeting start strictly after now, using Asia/Taipei time. */
export const getNextCourseMeeting = (
  times: readonly string[],
  venues: readonly string[],
  now = new Date(),
): NextCourseMeeting | undefined => {
  const meetings = getCourseMeetingGroups(times, venues);
  if (meetings.length === 0) return undefined;

  const localNow = taipeiDateParts(now);
  const todayMinutes =
    localNow.hour * 60 + localNow.minute + localNow.second / 60;
  const currentDay = new Date(
    Date.UTC(localNow.year, localNow.month - 1, localNow.day),
  ).getUTCDay();

  for (let daysFromToday = 0; daysFromToday <= 7; daysFromToday += 1) {
    const dayOfWeek = (currentDay + daysFromToday) % 7;
    const todaysMeetings = meetings
      .filter((meeting) => meeting.dayOfWeek === dayOfWeek)
      .sort((left, right) => left.startSlotIndex - right.startSlotIndex);

    const nextMeeting = todaysMeetings.find((meeting) => {
      const [hour, minute] = meeting.start.split(":").map(Number);
      const meetingMinutes = hour! * 60 + minute!;
      return daysFromToday > 0 || meetingMinutes > todayMinutes;
    });

    if (nextMeeting) return { ...nextMeeting, daysFromToday };
  }

  return undefined;
};
