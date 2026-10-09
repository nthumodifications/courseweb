import { describe, expect, mock, test } from "bun:test";
import { fromZonedTime } from "date-fns-tz";
import type { CalendarEventInternal } from "@/components/Calendar/calendar.types";
import type { MinimalCourse } from "@/types/courses";
import type { CourseDate } from "@/hooks/useCourseDates";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

mock.module("@/config/api", () => ({ default: {} }));
mock.module("@/config/auth", () => ({ default: {} }));

const { expandCalendarEvent } = await import("./useUpcomingEvents");

const TAIPEI_TIME_ZONE = "Asia/Taipei";

const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, TAIPEI_TIME_ZONE);

const event = (
  start: string,
  end: string,
  repeat: CalendarEventInternal["repeat"],
): CalendarEventInternal => ({
  id: "event-1",
  title: "Calendar event",
  allDay: false,
  start: taipeiDate(start),
  end: taipeiDate(end),
  repeat,
  color: "#000000",
  tag: "other",
  actualEnd: null,
});

const expand = (
  calendarEvent: CalendarEventInternal,
  start: string,
  end: string,
) =>
  expandCalendarEvent(
    { event: calendarEvent, source: "calendar" },
    taipeiDate(start),
    taipeiDate(end),
    () => null,
  );

const course = {
  raw_id: "11510-CS-101",
  name_zh: "資料結構",
  name_en: "Data Structures",
} as MinimalCourse;

describe("upcoming event recurrence", () => {
  test("uses the anchored Jan 31 monthly policy", () => {
    const occurrences = expand(
      event("2026-01-31T09:00", "2026-01-31T10:00", {
        type: "monthly",
        interval: 1,
        mode: "count",
        value: 3,
      }),
      "2026-03-01T00:00",
      "2026-04-01T00:00",
    );

    expect(occurrences.map(({ start }) => start.toISOString())).toEqual([
      taipeiDate("2026-03-31T09:00").toISOString(),
    ]);
  });

  test("uses the anchored Feb 29 yearly policy", () => {
    const occurrences = expand(
      event("2024-02-29T09:00", "2024-02-29T10:00", {
        type: "yearly",
        interval: 1,
        mode: "count",
        value: 5,
      }),
      "2028-01-01T00:00",
      "2029-01-01T00:00",
    );

    expect(occurrences.map(({ start }) => start.toISOString())).toEqual([
      taipeiDate("2028-02-29T09:00").toISOString(),
    ]);
  });

  test("excludes an all-day exception by Taipei date", () => {
    const calendarEvent = {
      ...event("2026-09-10T00:00", "2026-09-11T00:00", {
        type: "daily",
        interval: 1,
        mode: "count",
        value: 3,
      }),
      allDay: true,
      excludedDates: [taipeiDate("2026-09-11T18:00")],
    };

    expect(
      expand(calendarEvent, "2026-09-10T00:00", "2026-09-14T00:00").map(
        ({ start }) => start.toISOString(),
      ),
    ).toEqual([
      taipeiDate("2026-09-10T00:00").toISOString(),
      taipeiDate("2026-09-12T00:00").toISOString(),
    ]);
  });

  test("attaches course-date metadata only to class occurrences", () => {
    const calendarEvent = event("2026-09-10T09:00", "2026-09-10T10:00", null);
    const getCourseDateForDay = (
      rawId: string,
      day: Date,
    ): CourseDate | null =>
      rawId === course.raw_id && day.getTime() === calendarEvent.start.getTime()
        ? {
            raw_id: course.raw_id,
            id: 1,
            type: "exam",
            title: "Midterm",
            date: "2026-09-10",
          }
        : null;

    const classOccurrence = expandCalendarEventForTest(
      { event: calendarEvent, source: "class", course },
      getCourseDateForDay,
    );
    const personalOccurrence = expandCalendarEventForTest(
      { event: calendarEvent, source: "calendar", course },
      getCourseDateForDay,
    );

    expect(classOccurrence[0]?.courseDate).toEqual({
      type: "exam",
      title: "Midterm",
    });
    expect(personalOccurrence[0]?.courseDate).toBeUndefined();
  });
});

const expandCalendarEventForTest = (
  descriptor: Parameters<typeof expandCalendarEvent>[0],
  getCourseDateForDay: Parameters<typeof expandCalendarEvent>[3],
) =>
  expandCalendarEvent(
    descriptor,
    taipeiDate("2026-09-10T00:00"),
    taipeiDate("2026-09-11T00:00"),
    getCourseDateForDay,
  );
