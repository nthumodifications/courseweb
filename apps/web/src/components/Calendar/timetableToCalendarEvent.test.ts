import { describe, expect, mock, test } from "bun:test";
import { addDays, set } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import {
  parseSlotTime,
  scheduleTimeSlots,
  semesterInfo,
} from "@courseweb/shared";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { eventsToDisplay } from "./calendar_utils";
import { timetableToCalendarEvent } from "./timetableToCalendarEvent";
import type { Language } from "@/types/settings";
import type { CourseTimeslotData } from "@/types/timetable";
import type { CalendarEvent, CalendarEventInternal } from "./calendar.types";
import type { MinimalCourse } from "@/types/courses";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";
const TIMEZONE_CHILD_ENV = "TIMETABLE_TIMEZONE_TEST_CHILD";
const timezoneChild = process.env[TIMEZONE_CHILD_ENV] === "1";

if (timezoneChild) {
  mock.module("@/config/api", () => ({ default: {} }));
  mock.module("@/config/auth", () => ({ default: {} }));
}

const expandCalendarEvent = timezoneChild
  ? (await import("@/hooks/useUpcomingEvents")).expandCalendarEvent
  : undefined;

const TAIPEI_TIME_ZONE = "Asia/Taipei";

const timezones = [
  { name: "Pacific/Honolulu", januaryOffset: 600 },
  { name: "America/New_York", januaryOffset: 300 },
  { name: "Europe/London", januaryOffset: 0 },
  { name: "Asia/Taipei", januaryOffset: -480 },
  { name: "Asia/Tokyo", januaryOffset: -540 },
  { name: "Pacific/Auckland", januaryOffset: -780 },
] as const;

const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, TAIPEI_TIME_ZONE);

const oldTimetableToCalendarEvent = (
  timetable: CourseTimeslotData[],
  language: Language,
): CalendarEvent[] =>
  timetable
    .filter(
      (t) => scheduleTimeSlots[t.startTime] && scheduleTimeSlots[t.endTime],
    )
    .map((t) => {
      const semester = semesterInfo.find((s) => s.id == t.course.semester)!;
      const startTime = parseSlotTime(scheduleTimeSlots[t.startTime].start);
      const endTime = parseSlotTime(scheduleTimeSlots[t.endTime].end);
      const startDate = set(addDays(semester.begins, t.dayOfWeek), {
        hours: startTime[0],
        minutes: startTime[1],
      });
      const endDate = set(addDays(semester.begins, t.dayOfWeek), {
        hours: endTime[0],
        minutes: endTime[1],
      });
      const title = language == "en" ? t.course.name_en : t.course.name_zh;

      return {
        id:
          t.course.raw_id +
          "-" +
          t.dayOfWeek +
          "-" +
          t.startTime +
          "-" +
          t.endTime,
        title,
        location: t.venue,
        allDay: false,
        start: startDate,
        end: endDate,
        repeat: {
          type: "weekly",
          interval: 1,
          mode: "date",
          value: semester.ends.getTime(),
        },
        color: t.color,
        tag: "course",
        courseId: t.course.raw_id,
      };
    });

const toInternalEvent = (event: CalendarEvent): CalendarEventInternal => ({
  ...event,
  actualEnd: event.repeat ? new Date(event.repeat.value) : event.end,
});

const timezone = timezones.find(({ name }) => name === process.env.TZ);

if (timezoneChild && !timezone) {
  throw new Error(`Unsupported timezone child: ${process.env.TZ}`);
}
const childTimezone = timezone ?? timezones[0]!;

const course: MinimalCourse = {
  raw_id: "11420PE  206097",
  name_zh: "重量塑身",
  name_en: "Weight body shape",
  semester: "11420",
  department: "PE",
  course: "2060",
  class: "97",
  credits: 0,
  venues: ["WT Rm.重訓室"],
  times: ["R7R8"],
  teacher_zh: ["王嬿婷"],
  teacher_en: ["WANG, YEN-TING"],
  language: "中",
};

describe("timetable calendar event dates", () => {
  if (!timezoneChild) {
    test("keeps Taipei event dates across process time zones", () => {
      const environment = Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );

      for (const { name } of timezones) {
        const result = Bun.spawnSync(
          [process.execPath, "test", import.meta.path],
          {
            env: {
              ...environment,
              TZ: name,
              [TIMEZONE_CHILD_ENV]: "1",
            },
            stdout: "pipe",
            stderr: "pipe",
          },
        );
        const output = `${new TextDecoder().decode(result.stdout)}\n${new TextDecoder().decode(result.stderr)}`;
        expect(result.exitCode, `${name}\n${output}`).toBe(0);
      }
    }, 30_000);
    return;
  }

  test(`keeps R7R8 at the Taipei wall-clock time in ${childTimezone.name}`, () => {
    expect(new Date(2026, 0, 15, 12).getTimezoneOffset()).toBe(
      childTimezone.januaryOffset,
    );
    expect(Number.isInteger(new Date().getTimezoneOffset())).toBe(true);

    const [event] = timetableToCalendarEvent(
      createTimetableFromCourses([course]),
      "zh",
    );

    expect(event).toBeDefined();
    expect(event!.start).toEqual(taipeiDate("2026-02-26T15:30"));
    expect(event!.end).toEqual(taipeiDate("2026-02-26T17:20"));
    expect(event!.repeat?.value).toBe(taipeiDate("2026-06-14T00:00").getTime());
  });

  test(`includes a class on the semester end date in ${childTimezone.name}`, () => {
    const finalDayTimetable: CourseTimeslotData[] = [
      {
        course: {
          ...course,
          raw_id: "11420PE  206098",
          times: ["U1U2"],
          venues: ["WT Rm.重訓室"],
        },
        venue: "WT Rm.重訓室",
        dayOfWeek: 6,
        startTime: 0,
        endTime: 1,
        color: "#000000",
        textColor: "#ffffff",
      },
    ];
    const [event] = timetableToCalendarEvent(finalDayTimetable, "zh");
    const calendarEvent = toInternalEvent(event!);
    const lastDay = taipeiDate("2026-06-14T00:00");
    const nextDay = taipeiDate("2026-06-15T00:00");

    const upcoming = expandCalendarEvent!(
      { event: calendarEvent, source: "calendar" },
      lastDay,
      nextDay,
      () => null,
    );
    const calendar = eventsToDisplay([calendarEvent], lastDay, nextDay);

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]!.start).toEqual(taipeiDate("2026-06-14T08:00"));
    expect(calendar).toHaveLength(1);
    expect(calendar[0]!.displayStart).toEqual(taipeiDate("2026-06-14T08:00"));
  });

  if (childTimezone.name === TAIPEI_TIME_ZONE) {
    test("matches the previous converter in Taipei for a multi-segment timetable", () => {
      const multiSegmentCourse: MinimalCourse = {
        ...course,
        raw_id: "11420CS  206099",
        times: ["M1M2", "W3W4Wn"],
        venues: ["Room 1", "Room 2"],
      };
      const timetable = createTimetableFromCourses([multiSegmentCourse]);

      expect(timetableToCalendarEvent(timetable, "zh")).toEqual(
        oldTimetableToCalendarEvent(timetable, "zh"),
      );
    });
  }
});
