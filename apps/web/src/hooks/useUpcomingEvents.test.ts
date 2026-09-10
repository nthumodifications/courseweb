import { describe, expect, test } from "bun:test";
import { fromZonedTime } from "date-fns-tz";
import type { CalendarEventInternal } from "@/components/Calendar/calendar.types";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

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
});
