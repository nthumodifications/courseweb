import { describe, expect, it } from "bun:test";
import {
  ANONYMOUS_CALENDAR_DATABASE_NAME,
  getCalendarDatabaseName,
  hasCalendarScope,
  migrateEventToV2,
} from "./rxdb";

describe("calendar database identity", () => {
  it("keeps anonymous storage separate from subject-scoped storage", () => {
    expect(getCalendarDatabaseName()).toBe(ANONYMOUS_CALENDAR_DATABASE_NAME);
    expect(getCalendarDatabaseName(null)).toBe(
      ANONYMOUS_CALENDAR_DATABASE_NAME,
    );

    const userA = getCalendarDatabaseName("user-a");
    const userAAgain = getCalendarDatabaseName("user-a");
    const userB = getCalendarDatabaseName("user-b");

    expect(userA).toBe(userAAgain);
    expect(userA).not.toBe(ANONYMOUS_CALENDAR_DATABASE_NAME);
    expect(userA).not.toBe(userB);
  });

  it("recognises only a complete calendar scope token", () => {
    expect(hasCalendarScope("openid profile calendar planner")).toBe(true);
    expect(hasCalendarScope("openid profile calendars")).toBe(false);
    expect(hasCalendarScope(undefined)).toBe(false);
  });
});

describe("event schema v2 migration", () => {
  it("backfills every required event field missing from v1 documents", () => {
    const migrated = migrateEventToV2({
      id: "event-1",
      title: "Old event",
      allDay: false,
      start: "2026-09-10T01:00:00.000Z",
      end: "2026-09-10T02:00:00.000Z",
      repeat: null,
    });

    expect(migrated).toMatchObject({
      actualEnd: "2026-09-10T02:00:00.000Z",
      color: "#3b82f6",
      tag: "Event",
      courseId: null,
      details: "",
      excludedDates: [],
      parentId: "",
    });
  });

  it("preserves valid existing fields and filters invalid exclusions", () => {
    const migrated = migrateEventToV2({
      id: "course-event",
      title: "Course",
      allDay: false,
      start: "2026-09-10T01:00:00.000Z",
      end: "2026-09-10T02:00:00.000Z",
      actualEnd: null,
      repeat: null,
      color: "#123456",
      tag: "course",
      courseId: "course-1",
      excludedDates: ["2026-09-11T01:00:00.000Z", "not-a-date"],
    });

    expect(migrated.actualEnd).toBeNull();
    expect(migrated.color).toBe("#123456");
    expect(migrated.tag).toBe("course");
    expect(migrated.courseId).toBe("course-1");
    expect(migrated.excludedDates).toEqual(["2026-09-11T01:00:00.000Z"]);
  });
});
