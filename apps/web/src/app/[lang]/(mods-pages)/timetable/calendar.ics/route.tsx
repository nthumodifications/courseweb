import supabase, { CourseDefinition } from "@/config/supabase";
import {
  scheduleTimeSlots,
  semesterInfo,
  timetableColors,
} from "@courseweb/shared";
import {
  colorMapFromCourses,
  createTimetableFromCourses,
} from "@/helpers/timetable";
import { getHours, getMinutes, parse, addDays } from "date-fns";
import * as ics from "ics";
import { fromZonedTime } from "date-fns-tz";
import { MinimalCourse } from "@/types/courses";
import client from "@/config/api";

const CALENDAR_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": "attachment; filename=timetable.ics",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const semester = searchParams.get("semester");
  const semesterObj = semesterInfo.find((sem) => sem.id == semester);
  const courses_ids = searchParams.get("semester_" + semester)?.split(",")!;
  const theme = searchParams.get("theme") || Object.keys(timetableColors)[0];

  if (!semester || !semesterObj || !courses_ids)
    return new Response("Bad Request: missing semester or course ids", {
      status: 400,
    });

  //server runs on UTC, convert time to GMT+8 (Asia/Taipei)
  const semStart = fromZonedTime(semesterObj.begins, "Asia/Taipei");
  const semEnd = fromZonedTime(semesterObj.ends, "Asia/Taipei");

  function formatDateTime(date: Date) {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hour = pad(date.getUTCHours());
    const minute = pad(date.getUTCMinutes());
    const second = pad(date.getUTCSeconds());
    return `${year}${month}${day}T${hour}${minute}${second}Z`;
  }

  function pad(i: number) {
    return i < 10 ? `0${i}` : `${i}`;
  }

  function getFirstOccurrenceOfDayOfWeek(
    startDate: Date,
    targetDayOfWeek: number,
  ): Date {
    // course.dayOfWeek uses MTWRFS indexing (0=Mon, 1=Tue, ..., 5=Sat)
    // JS getDay() uses 0=Sun, 1=Mon, ..., 6=Sat
    // Convert course dayOfWeek to JS day: Mon(0)->1, Tue(1)->2, ..., Sat(5)->6
    const jsDayOfWeek = targetDayOfWeek + 1;
    const startDayOfWeek = startDate.getDay();
    const daysToAdd = (7 + jsDayOfWeek - startDayOfWeek) % 7;
    return addDays(startDate, daysToAdd);
  }

  try {
    const res = await client.course.$get({
      query: { courses: courses_ids },
    });

    if (!res.ok)
      return new Response("Failed to fetch course data", { status: 502 });

    const data = await res.json();
    const colors =
      timetableColors[theme] ??
      timetableColors[Object.keys(timetableColors)[0]];
    const colorMap = colorMapFromCourses(
      data!.map((m: CourseDefinition) => m.raw_id),
      colors,
    );
    const timetableData = createTimetableFromCourses(
      data! as MinimalCourse[],
      colorMap,
    );
    // Filter out courses with invalid time slots
    const validTimetableData = timetableData.filter(
      (course) =>
        scheduleTimeSlots[course.startTime] &&
        scheduleTimeSlots[course.endTime],
    );

    // Return empty but valid calendar when no courses are present
    if (validTimetableData.length === 0) {
      const emptyCalendar =
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NTHUMods//Timetable//EN\r\nX-WR-CALNAME:NTHUMods\r\nEND:VCALENDAR\r\n";
      return new Response(emptyCalendar, {
        status: 200,
        headers: CALENDAR_HEADERS,
      });
    }

    const icss = ics.createEvents(
      validTimetableData.map((course) => {
        const start = fromZonedTime(
          parse(
            scheduleTimeSlots[course.startTime]!.start,
            "HH:mm",
            new Date(),
          ),
          "Asia/Taipei",
        );
        const end = fromZonedTime(
          parse(scheduleTimeSlots[course.endTime]!.end, "HH:mm", new Date()),
          "Asia/Taipei",
        );
        const day = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][
          course.dayOfWeek
        ];

        // Get the first occurrence of this day of the week after semester start
        const firstOccurrence = getFirstOccurrenceOfDayOfWeek(
          semStart,
          course.dayOfWeek,
        );

        return {
          title: course.course.name_zh || course.course.name_en || course.course.raw_id,
          description: `${course.course.name_en || ""}\n${course.course.teacher_zh || ""}\n${course.course.teacher_en || ""}\nhttps://nthumods.com/courses/${encodeURIComponent(course.course.raw_id)}`,
          location: course.venue,
          start: [
            firstOccurrence.getFullYear(),
            firstOccurrence.getMonth() + 1,
            firstOccurrence.getDate(),
            getHours(start),
            getMinutes(start),
          ],
          end: [
            firstOccurrence.getFullYear(),
            firstOccurrence.getMonth() + 1,
            firstOccurrence.getDate(),
            getHours(end),
            getMinutes(end),
          ],
          calName: "NTHUMods",

          recurrenceRule: `FREQ=WEEKLY;BYDAY=${day};INTERVAL=1;UNTIL=${formatDateTime(semEnd)}`,
        };
      }),
    );
    if (icss.error) throw icss.error;
    return new Response(icss.value!, {
      status: 200,
      headers: CALENDAR_HEADERS,
    });
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
