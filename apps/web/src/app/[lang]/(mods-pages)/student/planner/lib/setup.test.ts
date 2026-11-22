import { describe, expect, test } from "bun:test";
import {
  defaultGraduationYear,
  dedupeTimetableCourses,
  enumerateTermsFromEnrollment,
  guessCourseCategory,
  mergeTimetableCourses,
  normalizePlannerCourseCode,
  parseEnrollmentYearFromStudentId,
} from "./setup";

describe("planner first-run setup helpers", () => {
  test("parses valid student id years and rejects invalid or future years", () => {
    expect(parseEnrollmentYearFromStudentId("112062501", 115)).toBe("112");
    expect(parseEnrollmentYearFromStudentId(undefined, 115)).toBeUndefined();
    expect(parseEnrollmentYearFromStudentId("abc112062501", 115)).toBe(
      undefined,
    );
    expect(parseEnrollmentYearFromStudentId("099062501", 115)).toBe(undefined);
    expect(parseEnrollmentYearFromStudentId("116062501", 115)).toBe(undefined);
  });

  test("defaults graduation four ROC years after enrollment", () => {
    expect(defaultGraduationYear("112")).toBe("116");
  });

  test("enumerates terms from enrollment through the current term", () => {
    expect(enumerateTermsFromEnrollment("113", "11420")).toEqual([
      "11310",
      "11320",
      "11330",
      "11410",
      "11420",
    ]);
  });

  test("maps only supported course metadata to existing categories", () => {
    const folders = [
      { id: "setup-general-education", title: "通識" },
      { id: "setup-major-required", title: "系必修" },
      { id: "setup-major-elective", title: "系選修" },
    ];
    expect(
      guessCourseCategory(
        { ge_type: "core", compulsory_for: null, elective_for: null },
        "CS",
        folders,
      ),
    ).toBe("setup-general-education");
    expect(
      guessCourseCategory(
        { ge_type: null, compulsory_for: ["CS112A"], elective_for: null },
        "CS",
        folders,
      ),
    ).toBe("setup-major-required");
    expect(
      guessCourseCategory(
        { ge_type: null, compulsory_for: null, elective_for: ["CS112A"] },
        "CS",
        folders,
      ),
    ).toBe("setup-major-elective");
    expect(
      guessCourseCategory(
        { ge_type: null, compulsory_for: ["EE"], elective_for: null },
        "CS",
        folders,
      ),
    ).toBe("_unsorted");
  });

  test("dedupes raw ids and merges against existing raw ids or course codes", () => {
    const incoming = [
      { raw_id: "11410CS1010", id: "CS1010", semester: "11410" },
      { raw_id: "11410CS1010", id: "CS1010", semester: "11410" },
      { raw_id: "11410MATH100", id: "MATH100", semester: "11410" },
    ];
    expect(dedupeTimetableCourses(incoming)).toHaveLength(2);
    expect(
      mergeTimetableCourses(incoming, [{ raw_id: null, id: "11310 cs1010 " }]),
    ).toEqual([incoming[2]]);
    expect(
      mergeTimetableCourses(incoming, [
        { raw_id: "11410CS1010", id: "CS1010" },
      ]),
    ).toEqual([incoming[2]]);
    expect(normalizePlannerCourseCode("11410 CS1010 ")).toBe("cs1010");
  });
});
