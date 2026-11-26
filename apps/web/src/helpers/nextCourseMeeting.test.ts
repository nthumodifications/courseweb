import { describe, expect, test } from "bun:test";
import { getNextCourseMeeting } from "./nextCourseMeeting";

describe("getNextCourseMeeting", () => {
  test("finds a later class today in Taipei time", () => {
    const meeting = getNextCourseMeeting(
      ["T3T4"],
      ["Engineering Building"],
      new Date("2026-06-02T00:00:00.000Z"),
    );

    expect(meeting).toMatchObject({
      dayOfWeek: 2,
      start: "10:10",
      end: "12:00",
      daysFromToday: 0,
    });
  });

  test("finds tomorrow's meeting", () => {
    const meeting = getNextCourseMeeting(
      ["W1"],
      ["Engineering Building"],
      new Date("2026-06-02T01:00:00.000Z"),
    );

    expect(meeting).toMatchObject({
      dayOfWeek: 3,
      start: "08:00",
      daysFromToday: 1,
    });
  });

  test("wraps to the same weekday next week when today's start has passed", () => {
    const meeting = getNextCourseMeeting(
      ["T1"],
      ["Engineering Building"],
      new Date("2026-06-02T01:00:00.000Z"),
    );

    expect(meeting).toMatchObject({ dayOfWeek: 2, daysFromToday: 7 });
  });

  test("chooses the nearest meeting across multiple weekdays", () => {
    const meeting = getNextCourseMeeting(
      ["T1", "W1"],
      ["Tuesday Room", "Wednesday Room"],
      new Date("2026-06-02T01:00:00.000Z"),
    );

    expect(meeting).toMatchObject({
      dayOfWeek: 3,
      venue: "Wednesday Room",
      daysFromToday: 1,
    });
  });

  test("returns no meeting when the course has no times", () => {
    expect(
      getNextCourseMeeting([], [], new Date("2026-06-02T01:00:00.000Z")),
    ).toBeUndefined();
    expect(
      getNextCourseMeeting(["  "], ["Engineering Building"], new Date()),
    ).toBeUndefined();
  });
});
