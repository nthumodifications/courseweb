import supabase from "@/config/supabase";
import { scheduleTimeSlots } from "@/const/timetable";
import {
  colorMapFromCourses,
  createTimetableFromCourses,
} from "@/helpers/timetable";
import { getHours, getMinutes, parse } from "date-fns";
import * as ics from "ics";
import { NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { MinimalCourse } from "@/types/courses";
import { semesterInfo } from "@/const/semester";
import { timetableColors } from "@/const/timetableColors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const semester = searchParams.get("semester");
  const semesterObj = semesterInfo.find((sem) => sem.id == semester);
  const courses_ids = searchParams.get("semester_" + semester)?.split(",")!;
  const theme = searchParams.get("theme") || Object.keys(timetableColors)[0];

  if (!semester || !semesterObj || !courses_ids)
    return NextResponse.redirect("https://nthumods.com", { status: 500 });

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

  try {
    let { data = [], error } = await supabase
      .from("courses")
      .select("*")
      .in("raw_id", courses_ids);
    if (error) throw error;
    else {
      const colorMap = colorMapFromCourses(
        data!.map((m) => m.raw_id),
        timetableColors[theme],
      );
      const timetableData = createTimetableFromCourses(
        data! as MinimalCourse[],
        colorMap,
      );
      const icss = ics.createEvents(
        timetableData.map((course) => {
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

          return {
            title: course.course.name_zh!,
            description: `${course.course.name_en!}\n${course.course.teacher_zh}\n${course.course.teacher_en}\nhttps://nthumods.com/courses/${encodeURIComponent(course.course.raw_id)}`,
            location: course.venue,
            start: [
              semStart.getFullYear(),
              semStart.getMonth() + 1,
              semStart.getDate() + 1 + course.dayOfWeek,
              getHours(start),
              getMinutes(start),
            ],
            end: [
              semStart.getFullYear(),
              semStart.getMonth() + 1,
              semStart.getDate() + 1 + course.dayOfWeek,
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
        headers: { "Content-Type": "text/calendar" },
      });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.redirect("https://nthumods.com", { status: 500 });
  }
}
