import { describe, expect, test } from "bun:test";
import type { MinimalCourse } from "../types/courses";
import {
  getFormattedClassCode,
  getGECType,
  hasConflictingTimeslots,
  hasSameCourse,
  hasTimes,
} from "./courses";
import { getRangeOfDays } from "./dates";
import { toPrettySemester } from "./semester";
import { colorMapFromCourses, createTimetableFromCourses } from "./timetable";
import fixture from "./__fixtures__/minimal-course.json";

const course = (overrides: Partial<MinimalCourse> = {}): MinimalCourse => ({
  ...(fixture as MinimalCourse),
  ...overrides,
});

describe("shared course and timetable utilities", () => {
  test.each([
    ["核心通識Core GE courses 1", 1],
    ["核心通識Core GE courses 2", 2],
    ["自由選修", null],
  ])("maps GE type %s", (value, expected) => {
    expect(getGECType(value)).toBe(expected);
  });

  test.each([
    [[], false],
    [["", "  "], false],
    [["M1"], true],
  ])("recognizes populated times %j", (times, expected) => {
    expect(hasTimes(course({ times }))).toBe(expected);
  });

  test("detects duplicate offerings and overlapping periods", () => {
    const first = course({ raw_id: "11510AES 450100", times: ["W2"] });
    const second = course({
      raw_id: "11510AES 450200",
      class: "2",
      times: ["W2"],
    });
    expect(hasSameCourse([first, second])).toEqual([
      first.raw_id,
      second.raw_id,
    ]);
    expect(hasConflictingTimeslots([first, second])).toHaveLength(2);
  });

  test.each([
    ["資工系112MA", "11510", "en", "資工系 Y4 MasterQing"],
    ["資工系112MA", "11510", "zh", "資工系4年級碩士班清班"],
  ])("formats class descriptions %s", (value, semester, lang, expected) => {
    expect(getFormattedClassCode(value, semester, lang)).toBe(expected);
  });

  test("groups adjacent periods and assigns stable colors", () => {
    const value = course({
      raw_id: "11510AES 450100",
      times: ["M1M2"],
      venues: ["台積館101"],
    });
    const timetable = createTimetableFromCourses([value], {
      [value.raw_id]: "#000000",
    });
    expect(timetable).toMatchObject([
      {
        dayOfWeek: 0,
        startTime: 0,
        endTime: 1,
        venue: "台積館101",
        color: "#000000",
        textColor: "#FFFFFF",
      },
    ]);
    expect(
      colorMapFromCourses(["a", "b", "c"], ["#111111", "#222222"]),
    ).toEqual({
      a: "#111111",
      b: "#222222",
      c: "#111111",
    });
  });
});

describe("shared date and semester utilities", () => {
  test.each([
    ["11510", "115-1"],
    ["11220", "112-2"],
  ])("formats semester %s", (value, expected) => {
    expect(toPrettySemester(value)).toBe(expected);
  });

  test.each([
    [
      "ordinary UTC calendar days",
      "2026-10-06T00:00:00Z",
      "2026-10-08T00:00:00Z",
      [
        "2026-10-06T00:00:00.000Z",
        "2026-10-07T00:00:00.000Z",
        "2026-10-08T00:00:00.000Z",
      ],
    ],
    [
      "Asia/Taipei calendar days",
      "2026-09-30T00:00:00+08:00",
      "2026-10-02T00:00:00+08:00",
      [
        "2026-09-29T16:00:00.000Z",
        "2026-09-30T16:00:00.000Z",
        "2026-10-01T16:00:00.000Z",
      ],
    ],
    [
      "local calendar days across daylight saving time",
      "2026-03-08T00:00:00-08:00",
      "2026-03-10T00:00:00-07:00",
      [
        "2026-03-08T08:00:00.000Z",
        "2026-03-09T07:00:00.000Z",
        "2026-03-10T07:00:00.000Z",
      ],
    ],
  ])("returns an inclusive sequence for %s", (_, start, end, expected) => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(
        getRangeOfDays(new Date(start), new Date(end)).map((day) =>
          day.toISOString(),
        ),
      ).toEqual(expected);
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });
});
