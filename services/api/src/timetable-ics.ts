import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "./config/supabase_server";
import {
  scheduleTimeSlots,
  semesterInfo,
  createTimetableFromCourses,
  colorMapFromCourses,
  timetableColors,
} from "@courseweb/shared";
import type { MinimalCourse } from "@courseweb/shared";

const CALENDAR_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": "attachment; filename=timetable.ics",
};

const EMPTY_CALENDAR =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NTHUMods//Timetable//EN\r\nX-WR-CALNAME:NTHUMods\r\nEND:VCALENDAR\r\n";

function pad(i: number): string {
  return i < 10 ? `0${i}` : `${i}`;
}

// Format a Date as YYYYMMDDTHHMMSSZ (UTC)
function formatDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

// Parse "HH:mm" (Asia/Taipei = UTC+8, no DST) into UTC hours/minutes
function taipeiTimeToUtc(timeStr: string): { hours: number; minutes: number } {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hours: (hour - 8 + 24) % 24, minutes: minute };
}

// Escape special characters in ICS text fields
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Find the first occurrence of a target day-of-week on or after startDate.
// targetDayOfWeek: 0=Mon, 1=Tue, ..., 5=Sat (MTWRFS indexing)
// startDate should be the semester start expressed as UTC midnight-minus-8h
// (i.e. fromZonedTime(semesterBegins, "Asia/Taipei")), which causes getUTCDay()
// to return one day earlier than the Taipei calendar date — matching the original logic.
function getFirstOccurrenceOfDayOfWeek(
  startDate: Date,
  targetDayOfWeek: number,
): Date {
  const jsDayOfWeek = targetDayOfWeek + 1; // MTWRFS 0-index → JS 1=Mon..6=Sat
  const startDayOfWeek = startDate.getUTCDay();
  const daysToAdd = (7 + jsDayOfWeek - startDayOfWeek) % 7;
  const result = new Date(startDate);
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  return result;
}

const app = new Hono().get(
  "/calendar.ics",
  zValidator(
    "query",
    z
      .object({
        semester: z.string(),
        theme: z.string().optional(),
      })
      .catchall(z.string()),
  ),
  async (c) => {
    const query = c.req.valid("query");
    const semester = query.semester;
    const semesterObj = semesterInfo.find((sem) => sem.id === semester);
    const coursesParam = query[`semester_${semester}`];
    const courses_ids = coursesParam?.split(",").filter(Boolean) ?? [];
    const theme = query.theme ?? Object.keys(timetableColors)[0];

    if (!semesterObj || courses_ids.length === 0) {
      return new Response("Bad Request: missing semester or course ids", {
        status: 400,
      });
    }

    try {
      const { data, error } = await supabase_server(c)
        .from("courses")
        .select("*")
        .in("raw_id", courses_ids);

      if (error) {
        console.error("Supabase error fetching courses for ICS:", error);
        return new Response(EMPTY_CALENDAR, {
          status: 200,
          headers: CALENDAR_HEADERS,
        });
      }

      if (!data || data.length === 0) {
        return new Response(EMPTY_CALENDAR, {
          status: 200,
          headers: CALENDAR_HEADERS,
        });
      }

      const colors =
        timetableColors[theme] ??
        timetableColors[Object.keys(timetableColors)[0]];
      const colorMap = colorMapFromCourses(
        data.map((m) => m.raw_id),
        colors,
      );
      const timetableData = createTimetableFromCourses(
        data as MinimalCourse[],
        colorMap,
      );
      const validTimetableData = timetableData.filter(
        (course) =>
          scheduleTimeSlots[course.startTime] &&
          scheduleTimeSlots[course.endTime],
      );

      if (validTimetableData.length === 0) {
        return new Response(EMPTY_CALENDAR, {
          status: 200,
          headers: CALENDAR_HEADERS,
        });
      }

      // Convert semester boundary dates from Asia/Taipei midnight to UTC.
      // semesterObj.begins is constructed as new Date(year, month, day) which in
      // a UTC runtime equals 00:00 UTC. Subtracting 8 hours yields the UTC
      // equivalent of midnight Taipei time — identical to fromZonedTime(date, "Asia/Taipei").
      const semStart = new Date(semesterObj.begins.getTime() - 8 * 60 * 60 * 1000);
      const semEnd = new Date(semesterObj.ends.getTime() - 8 * 60 * 60 * 1000);

      const dayAbbr = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

      const eventBlocks = validTimetableData.map((course) => {
        const startSlot = scheduleTimeSlots[course.startTime]!;
        const endSlot = scheduleTimeSlots[course.endTime]!;
        const startUtc = taipeiTimeToUtc(startSlot.start);
        const endUtc = taipeiTimeToUtc(endSlot.end);
        const day = dayAbbr[course.dayOfWeek];

        const firstOccurrence = getFirstOccurrenceOfDayOfWeek(
          semStart,
          course.dayOfWeek,
        );

        const dtStart = new Date(firstOccurrence);
        dtStart.setUTCHours(startUtc.hours, startUtc.minutes, 0, 0);

        const dtEnd = new Date(firstOccurrence);
        dtEnd.setUTCHours(endUtc.hours, endUtc.minutes, 0, 0);

        const title = course.course.name_zh ?? course.course.name_en ?? "Course";
        const descParts = [
          course.course.name_en,
          Array.isArray(course.course.teacher_zh)
            ? course.course.teacher_zh.join(", ")
            : course.course.teacher_zh,
          Array.isArray(course.course.teacher_en)
            ? course.course.teacher_en.join(", ")
            : course.course.teacher_en,
          `https://nthumods.com/courses/${encodeURIComponent(course.course.raw_id)}`,
        ]
          .filter(Boolean)
          .join("\\n");

        return [
          "BEGIN:VEVENT",
          `DTSTART:${formatDateTime(dtStart)}`,
          `DTEND:${formatDateTime(dtEnd)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${day};INTERVAL=1;UNTIL=${formatDateTime(semEnd)}`,
          `SUMMARY:${escapeIcsText(title)}`,
          `DESCRIPTION:${descParts}`,
          `LOCATION:${escapeIcsText(course.venue ?? "")}`,
          "END:VEVENT",
        ].join("\r\n");
      });

      const icsContent =
        [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//NTHUMods//Timetable//EN",
          "X-WR-CALNAME:NTHUMods",
          ...eventBlocks,
          "END:VCALENDAR",
        ].join("\r\n") + "\r\n";

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
