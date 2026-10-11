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

  test("returns an inclusive sequence for ordinary UTC calendar days", () => {
    const days = getRangeOfDays(
      new Date("2026-10-06T00:00:00Z"),
      new Date("2026-10-08T00:00:00Z"),
    );
    expect(days.map((day) => day.toISOString())).toEqual([
      "2026-10-06T00:00:00.000Z",
      "2026-10-07T00:00:00.000Z",
      "2026-10-08T00:00:00.000Z",
    ]);
  });
});

test.todo(
  "getRangeOfDays should preserve local midnight across DST transitions",
);
