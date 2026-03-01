import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";

// ── Inlined from @courseweb/shared ───────────────────────────────────────────
// Importing @courseweb/shared via the root tsconfig path alias resolves to the
// package's TypeScript source files, which are outside this package's rootDir.
// The constants and logic needed here are small enough to inline directly.

export const SCHEDULE_TIME_SLOTS = [
  { time: "1", start: "08:00", end: "08:50" },
  { time: "2", start: "09:00", end: "09:50" },
  { time: "3", start: "10:10", end: "11:00" },
  { time: "4", start: "11:10", end: "12:00" },
  { time: "n", start: "12:10", end: "13:00" },
  { time: "5", start: "13:20", end: "14:10" },
  { time: "6", start: "14:20", end: "15:10" },
  { time: "7", start: "15:30", end: "16:20" },
  { time: "8", start: "16:30", end: "17:20" },
  { time: "9", start: "17:30", end: "18:20" },
  { time: "a", start: "18:30", end: "19:20" },
  { time: "b", start: "19:30", end: "20:20" },
  { time: "c", start: "20:30", end: "21:20" },
  { time: "d", start: "21:30", end: "22:20" },
] as const;

const SLOT_INDEX: Record<string, number> = Object.fromEntries(
  SCHEDULE_TIME_SLOTS.map((s, i) => [s.time, i]),
);

export const SEMESTER_INFO = [
  { id: "10810", begins: new Date(2019, 8, 9), ends: new Date(2020, 0, 12) },
  { id: "10820", begins: new Date(2020, 1, 17), ends: new Date(2020, 5, 21) },
  { id: "10910", begins: new Date(2020, 8, 14), ends: new Date(2021, 0, 29) },
  { id: "10920", begins: new Date(2021, 1, 22), ends: new Date(2021, 5, 25) },
  { id: "11010", begins: new Date(2021, 8, 13), ends: new Date(2022, 0, 14) },
  { id: "11020", begins: new Date(2022, 1, 14), ends: new Date(2022, 5, 17) },
  { id: "11110", begins: new Date(2022, 8, 12), ends: new Date(2023, 0, 13) },
  { id: "11120", begins: new Date(2023, 1, 13), ends: new Date(2023, 5, 16) },
  { id: "11210", begins: new Date(2023, 8, 11), ends: new Date(2024, 0, 12) },
  { id: "11220", begins: new Date(2024, 1, 19), ends: new Date(2024, 5, 23) },
  { id: "11310", begins: new Date(2024, 8, 2), ends: new Date(2024, 11, 22) },
  { id: "11320", begins: new Date(2025, 1, 17), ends: new Date(2025, 5, 8) },
  { id: "11410", begins: new Date(2025, 8, 1), ends: new Date(2025, 11, 21) },
  { id: "11420", begins: new Date(2026, 1, 23), ends: new Date(2026, 5, 14) },
];

export type CourseRow = {
  raw_id: string;
  name_zh: string | null;
  name_en: string | null;
  times: string[] | null;
  venues: string[] | null;
  teacher_zh: string[] | null;
  teacher_en: string[] | null;
};

type TimeslotEvent = {
  course: CourseRow;
  venue: string;
  dayOfWeek: number; // 0=Mon … 5=Sat (MTWRFS)
  startTime: number; // index into SCHEDULE_TIME_SLOTS
  endTime: number;
};

/** Parse a course's times strings into discrete calendar timeslot events. */
export function courseToEvents(course: CourseRow): TimeslotEvent[] {
  const events: TimeslotEvent[] = [];
  if (!course.times) return events;

  course.times.forEach((timeStr, venueIndex) => {
    if (!timeStr.trim()) return;
    // Each 2-char chunk is "<day><slot>", e.g. "M1", "T3", "Ra"
    const slots = timeStr.match(/.{1,2}/g)?.map((chunk) => ({
      day: chunk[0] as string,
      time: chunk[1] as string,
    }));
    if (!slots) return;

    // Group consecutive slots on the same day into single events
    const groups: { day: string; time: string }[][] = [];
    for (const slot of slots) {
      const last = groups[groups.length - 1];
      const lastSlot = last?.[last.length - 1];
      if (
        last &&
        lastSlot &&
        lastSlot.day === slot.day &&
        SLOT_INDEX[lastSlot.time] !== undefined &&
        SLOT_INDEX[slot.time] !== undefined &&
        SLOT_INDEX[lastSlot.time]! + 1 === SLOT_INDEX[slot.time]
      ) {
        last.push(slot);
      } else {
        groups.push([slot]);
      }
    }

    for (const group of groups) {
      const indices = group.map((s) => SLOT_INDEX[s.time] ?? -1);
      const startTime = Math.min(...indices);
      const endTime = Math.max(...indices);
      if (startTime < 0 || endTime < 0) continue;
      const firstDay = group[0];
      if (!firstDay) continue;
      events.push({
        course,
        venue: course.venues?.[venueIndex] ?? "",
        dayOfWeek: "MTWRFS".indexOf(firstDay.day),
        startTime,
        endTime,
      });
    }
  });

  return events;
}
// ─────────────────────────────────────────────────────────────────────────────

const CALENDAR_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": "attachment; filename=timetable.ics",
};

export const EMPTY_CALENDAR =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NTHUMods//Timetable//EN\r\nX-WR-CALNAME:NTHUMods\r\nEND:VCALENDAR\r\n";

export function pad(i: number): string {
  return i < 10 ? `0${i}` : `${i}`;
}

export function formatDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

// Asia/Taipei is always UTC+8 (no DST)
export function taipeiTimeToUtc(timeStr: string): {
  hours: number;
  minutes: number;
} {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: ((h ?? 0) - 8 + 24) % 24, minutes: m ?? 0 };
}

export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Fold long lines per RFC 5545 §3.1 (max 75 octets per line).
 *  Counts UTF-8 byte length so multi-byte characters (CJK, etc.) are
 *  accounted for correctly, and never splits inside a surrogate pair. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  const MAX = 75;
  if (bytes.length <= MAX) return line;

  const parts: string[] = [];
  let offset = 0; // byte offset into `bytes`
  let isFirst = true;

  while (offset < bytes.length) {
    // First physical line: up to MAX octets.
    // Continuation lines: leading SPACE counts as 1 octet, so content ≤ MAX-1.
    const limit = isFirst ? MAX : MAX - 1;
    let end = Math.min(offset + limit, bytes.length);

    // Don't cut in the middle of a multi-byte UTF-8 sequence.
    // UTF-8 continuation bytes match 0b10xxxxxx (0x80..0xBF).
    while (end > offset && (bytes[end]! & 0xc0) === 0x80) {
      end--;
    }

    const chunk = new TextDecoder().decode(bytes.slice(offset, end));
    parts.push(isFirst ? chunk : " " + chunk);
    offset = end;
    isFirst = false;
  }

  return parts.join("\r\n");
}

// Find the first occurrence of targetDayOfWeek on or after startDate (UTC).
// targetDayOfWeek is MTWRFS-indexed (0=Mon…5=Sat). startDate is already
// adjusted to UTC-midnight-minus-8h so getUTCDay() is one day before the
// Taipei calendar date, matching fromZonedTime(date, "Asia/Taipei") behaviour.
export function firstOccurrence(
  startDate: Date,
  targetDayOfWeek: number,
): Date {
  const jsDow = targetDayOfWeek + 1; // convert MTWRFS index to JS 1=Mon…6=Sat
  const daysToAdd = (7 + jsDow - startDate.getUTCDay()) % 7;
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d;
}

/**
 * Pure function that generates an ICS calendar string from course data and
 * semester information. Extracted from the route handler for testability.
 *
 * @param courses  Array of course rows from the database.
 * @param semObj   Semester descriptor with begin/end dates.
 * @returns A fully-formed iCalendar string (RFC 5545 compliant).
 */
export function generateTimetableIcs(
  courses: CourseRow[],
  semObj: { begins: Date; ends: Date },
): string {
  // semObj.begins = new Date(year, month, day) — UTC midnight in a UTC runtime.
  // Subtract 8h to get the UTC equivalent of Taipei midnight, identical to
  // fromZonedTime(semObj.begins, "Asia/Taipei") in the original Next.js route.
  const semStart = new Date(semObj.begins.getTime() - 8 * 60 * 60 * 1000);
  const semEnd = new Date(semObj.ends.getTime() - 8 * 60 * 60 * 1000);
  const dayAbbr = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

  const eventBlocks: string[] = [];
  for (const row of courses) {
    for (const ev of courseToEvents(row)) {
      const startSlot = SCHEDULE_TIME_SLOTS[ev.startTime];
      const endSlot = SCHEDULE_TIME_SLOTS[ev.endTime];
      if (!startSlot || !endSlot) continue;

      const startUtc = taipeiTimeToUtc(startSlot.start);
      const endUtc = taipeiTimeToUtc(endSlot.end);
      const day = dayAbbr[ev.dayOfWeek];

      const occ = firstOccurrence(semStart, ev.dayOfWeek);
      const dtStart = new Date(occ);
      dtStart.setUTCHours(startUtc.hours, startUtc.minutes, 0, 0);
      const dtEnd = new Date(occ);
      dtEnd.setUTCHours(endUtc.hours, endUtc.minutes, 0, 0);

      const title = row.name_zh ?? row.name_en ?? "Course";
      const desc = [
        row.name_en,
        row.teacher_zh?.join(", "),
        row.teacher_en?.join(", "),
        `https://nthumods.com/courses/${encodeURIComponent(row.raw_id)}`,
      ]
        .filter((s): s is string => Boolean(s))
        .map(escapeIcsText)
        .join("\\n");

      // UID and DTSTAMP are REQUIRED per RFC 5545 §3.6.1
      const uid = `${row.raw_id}-${ev.dayOfWeek}-${ev.startTime}@nthumods.com`;
      const dtstamp = formatDateTime(new Date());

      eventBlocks.push(
        [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${formatDateTime(dtStart)}`,
          `DTEND:${formatDateTime(dtEnd)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${day};INTERVAL=1;UNTIL=${formatDateTime(semEnd)}`,
          foldLine(`SUMMARY:${escapeIcsText(title)}`),
          foldLine(`DESCRIPTION:${desc}`),
          foldLine(`LOCATION:${escapeIcsText(ev.venue)}`),
          "END:VEVENT",
        ].join("\r\n"),
      );
    }
  }

  if (eventBlocks.length === 0) {
    return EMPTY_CALENDAR;
  }

  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NTHUMods//Timetable//EN",
      "X-WR-CALNAME:NTHUMods",
      ...eventBlocks,
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}

const app = new Hono().get(
  "/calendar.ics",
  zValidator(
    "query",
    z.object({
      semester: z.string(),
      theme: z.string().optional(),
    }),
  ),
  async (c) => {
    const { semester } = c.req.valid("query");
    const semObj = SEMESTER_INFO.find((s) => s.id === semester);
    // Courses are passed as a comma-separated value under the dynamic key
    // "semester_<id>" (e.g. semester_11420=course1,course2,...)
    const coursesParam = c.req.query(`semester_${semester}`);
    const courseIds = coursesParam?.split(",").filter(Boolean) ?? [];

    if (!semObj || courseIds.length === 0) {
      return new Response("Bad Request: missing semester or course ids", {
        status: 400,
      });
    }

    try {
      const { data, error } = await supabase_server(c)
        .from("courses")
        .select(
          "raw_id, name_zh, name_en, times, venues, teacher_zh, teacher_en",
        )
        .in("raw_id", courseIds);

      if (error || !data || data.length === 0) {
        if (error)
          console.error("Supabase error fetching courses for ICS:", error);
        return new Response(EMPTY_CALENDAR, {
          status: 200,
          headers: CALENDAR_HEADERS,
        });
      }

      const icsContent = generateTimetableIcs(data as CourseRow[], semObj);

      return new Response(icsContent, {
        status: 200,
        headers: CALENDAR_HEADERS,
      });
    } catch (e) {
      console.error("Error generating timetable ICS:", e);
      return new Response(EMPTY_CALENDAR, {
        status: 200,
        headers: CALENDAR_HEADERS,
      });
    }
  },
);

export default app;
