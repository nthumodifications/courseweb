import { describe, expect, test } from "bun:test";
import {
  checkValidClassCode,
  getFormattedClassCode,
  getGECType,
  getScoreType,
  getSemesterFromID,
  hasConflictingTimeslots,
  hasSameCourse,
  hasTimes,
} from "./courses";
import { rocYear } from "./roc";
import { toPrettySemester } from "./semester";
import {
  filterHiddenCourseIds,
  filterHiddenCourses,
  normalizeHiddenCourses,
  pruneHiddenCourses,
} from "./timetableVisibility";
import type { MinimalCourse } from "@courseweb/shared";
import fixture from "../lib/local-search/__fixtures__/courses-11510.json";

const course = (overrides: Partial<MinimalCourse> = {}): MinimalCourse => ({
  ...(fixture[0] as unknown as MinimalCourse),
  ...overrides,
});

describe("course and semester helper behavior", () => {
  test.each([
    ["核心通識Core GE courses 1", 1],
    ["核心通識Core GE courses 2", 2],
    ["普通通識", null],
  ])("maps GE labels %s", (label, expected) => {
    expect(getGECType(label)).toBe(expected);
  });

  test.each([
    ["11510AES 450100", "11510"],
    ["", ""],
  ])("extracts semester from %s", (rawId, expected) => {
    expect(getSemesterFromID(rawId)).toBe(expected);
  });

  test.each([
    ["gpa", "GPA"],
    ["percent", "百分制"],
    ["unknown", "GPA"],
  ])("formats score type %s", (value, expected) => {
    expect(getScoreType(value)).toBe(expected);
  });

  test.each([
    ["11510", "115-1"],
    ["11220", "112-2"],
    ["", "-NaN"],
  ])("formats semester %s", (value, expected) => {
    expect(toPrettySemester(value)).toBe(expected);
  });

  test.each([
    [2026, 115],
    [1911, 0],
  ])("converts Gregorian year %s to ROC", (year, expected) => {
    expect(rocYear(year)).toBe(expected);
  });

  test.each([
    [[], false],
    [["", "  "], false],
    [["W2"], true],
  ])("detects whether a course has times %j", (times, expected) => {
    expect(hasTimes(course({ times }))).toBe(expected);
  });

  test("returns both duplicated class ids and conflicting timetable slots", () => {
    const first = course({
      raw_id: "11510AES 450100",
      class: "1",
      times: ["W2"],
      venues: ["人社B館105"],
    });
    const duplicate = course({
      raw_id: "11510AES 450200",
      class: "2",
      times: ["W2"],
      venues: ["人社B館106"],
    });
    const otherDay = course({
      raw_id: "11510BIO 101100",
      department: "BIO",
      course: "101",
      times: ["M1"],
    });

    expect(hasSameCourse([first, duplicate, otherDay])).toEqual([
      first.raw_id,
      duplicate.raw_id,
    ]);
    expect(hasConflictingTimeslots([first, duplicate, otherDay])).toHaveLength(
      2,
    );
  });

  test.each([
    ["AES112MA", "11510", true],
    ["AES110MA", "11510", false],
    ["AES112PA", "11510", true],
    ["not-a-class-code", "11510", "not-a-class-code"],
  ])("validates class code %s", (value, semester, expected) => {
    expect(checkValidClassCode(value, semester)).toBe(expected);
  });

  test.each([
    ["資工系112MA", "11510", "zh", "資工系4年級碩士班清班"],
    ["資工系112MA", "11510", "en", "資工系 Y4 MasterQing"],
    ["AES112PA", "11510", "en", "AES Y4 SpecialQing"],
    ["電資院學士班112BA", "11510", "zh", "電資院學士班4年級國際學程"],
  ])("formats class code %s", (value, semester, lang, expected) => {
    expect(getFormattedClassCode(value, semester, lang)).toBe(expected);
  });
});

describe("timetable visibility persistence", () => {
  test.each([
    [null, {}],
    [{ first: true, second: false, third: 1 }, { first: true }],
    [["first"], {}],
  ])("normalizes stored hidden courses %j", (value, expected) => {
    expect(normalizeHiddenCourses(value)).toEqual(expected);
  });

  test("prunes stale ids and preserves only visible course order", () => {
    const hidden = { stale: true, keep: true, falseValue: false };
    expect(
      pruneHiddenCourses(hidden, { semester: ["keep", "other", "keep"] }),
    ).toEqual({ keep: true });
    expect(filterHiddenCourseIds(["keep", "other", "keep"], hidden)).toEqual([
      "other",
    ]);
    expect(
      filterHiddenCourses([{ raw_id: "keep" }, { raw_id: "other" }], hidden),
    ).toEqual([{ raw_id: "other" }]);
  });
});
