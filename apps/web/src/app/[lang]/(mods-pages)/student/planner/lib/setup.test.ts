import { describe, expect, test } from "bun:test";
import {
  defaultGraduationYear,
  dedupeTimetableCourses,
  detectDepartmentTag,
  enumerateTermsFromEnrollment,
  guessCourseCategory,
  mergeTemplateAndTimetableItems,
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
        "112",
      ),
    ).toBe("setup-general-education");
    expect(
      guessCourseCategory(
        { ge_type: null, compulsory_for: ["CS112A"], elective_for: null },
        "CS",
        folders,
        "112",
        "CS",
      ),
    ).toBe("setup-major-required");
    expect(
      guessCourseCategory(
        { ge_type: null, compulsory_for: null, elective_for: ["CS112A"] },
        "CS",
        folders,
        "112",
        "CS",
      ),
    ).toBe("setup-major-elective");
    expect(
      guessCourseCategory(
        { ge_type: null, compulsory_for: ["EE"], elective_for: null },
        "CS",
        folders,
        "112",
        "CS",
      ),
    ).toBe("_unsorted");
  });

  test("maps language, PE, and college Chinese course codes to existing child categories", () => {
    const folders = [
      { id: "core", title: "共同必修", parent: "planner-1" },
      { id: "english", title: "英文 / English", parent: "core" },
      { id: "pe", title: "PE", parent: "core" },
      { id: "chinese", title: "大學中文", parent: "core" },
      { id: "root-english", title: "English", parent: "planner-1" },
    ];
    const noDepartmentTags = {
      ge_type: null,
      compulsory_for: null,
      elective_for: null,
    };

    expect(
      guessCourseCategory(
        { ...noDepartmentTags, department: "LANG", course: "5000" },
        "CS",
        folders,
        "112",
      ),
    ).toBe("english");
    expect(
      guessCourseCategory(
        { ...noDepartmentTags, department: "PE  ", course: "1001" },
        "CS",
        folders,
        "112",
      ),
    ).toBe("pe");
    expect(
      guessCourseCategory(
        { ...noDepartmentTags, course: "CL1001" },
        "CS",
        folders,
        "112",
      ),
    ).toBe("chinese");
    expect(
      guessCourseCategory(
        { ...noDepartmentTags, course: "LANG1101" },
        "CS",
        [folders[0]!, folders[4]!],
        "112",
      ),
    ).toBe("_unsorted");
  });

  test("detects department tags from real audience tag shapes", () => {
    expect(
      detectDepartmentTag(
        [
          { compulsory_for: ["資工系112B"], elective_for: null },
          { compulsory_for: ["資工系112BA"], elective_for: null },
          { compulsory_for: ["資工系115BA"], elective_for: null },
          { compulsory_for: ["原科院學士班112B"], elective_for: null },
          { compulsory_for: ["原科院學士班115B"], elective_for: null },
          { compulsory_for: ["原科院學士班115BA"], elective_for: null },
          { compulsory_for: ["原科院學士班115BB"], elective_for: null },
        ],
        "112",
      ),
    ).toBe("資工系");
    expect(
      detectDepartmentTag(
        [{ compulsory_for: ["CS112A"], elective_for: null }],
        112,
      ),
    ).toBe("CS");
    expect(
      detectDepartmentTag(
        [
          { compulsory_for: ["資工系112B"], elective_for: null },
          {
            compulsory_for: ["原科院學士班112B"],
            elective_for: ["資工系112A"],
          },
        ],
        "112",
      ),
    ).toBe("資工系");
    expect(
      detectDepartmentTag(
        [
          { compulsory_for: ["資工系112B"], elective_for: null },
          { compulsory_for: ["原科院學士班112B"], elective_for: null },
        ],
        "112",
      ),
    ).toBeUndefined();
    expect(
      detectDepartmentTag(
        [{ compulsory_for: ["資工系112B"], elective_for: null }],
        "114",
      ),
    ).toBe("資工系");
  });

  test("categorizes department courses by detected tag and cohort", () => {
    const folders = [
      { id: "setup-major-required", title: "系必修" },
      { id: "setup-major-elective", title: "系選修" },
    ];
    const category = (
      compulsory_for: string[] | null,
      elective_for: string[] | null = null,
      department = "資訊工程學系",
      year = "112",
      tag: string | undefined = "資工系",
    ) =>
      guessCourseCategory(
        { ge_type: null, compulsory_for, elective_for },
        department,
        folders,
        year,
        tag,
      );

    expect(category(["資工系112B"])).toBe("setup-major-required");
    expect(category(["資訊工程學系"])).toBe("setup-major-required");
    expect(category(null, ["資工系115BA"])).toBe("setup-major-elective");
    expect(category(["資工系115BA"], ["資工系112B"])).toBe("_unsorted");
    expect(category(["資工系112B"], null, "資訊工程學系", "115")).toBe(
      "_unsorted",
    );
    expect(category(["EE"], null, "EE", "112", undefined)).toBe(
      "setup-major-required",
    );
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
    expect(
      mergeTimetableCourses(incoming, [
        { raw_id: "11410CS1010", id: "CS1010", status: "failed" },
      ]),
    ).toEqual([incoming[0], incoming[2]]);
    expect(
      mergeTimetableCourses(incoming, [
        { raw_id: "11310CS1010", id: "CS1010", status: "failed" },
        { raw_id: null, id: "CS1010", status: "completed" },
      ]),
    ).toEqual([incoming[2]]);
    expect(normalizePlannerCourseCode("11410 CS1010 ")).toBe("cs1010");
  });

  test("timetable courses replace matching template terms and keep other plan items", () => {
    const template = [
      {
        id: "CS1010",
        raw_id: null,
        semester: "11510",
        parent: "major-required",
        uuid: "template-course",
        order: 3,
        dependson: ["prerequisite"],
      },
      { id: "MATH100", raw_id: null, semester: null },
    ];
    const timetable = [
      {
        id: "CS1010",
        raw_id: "11220CS1010",
        semester: "11220",
        parent: "major-required",
        uuid: "timetable-course",
        order: 0,
        dependson: [],
      },
      { id: "PHYS100", raw_id: "11310PHYS100", semester: "11310" },
    ];

    expect(mergeTemplateAndTimetableItems(template, timetable)).toEqual([
      {
        id: "CS1010",
        raw_id: "11220CS1010",
        semester: "11220",
        parent: "major-required",
        uuid: "template-course",
        order: 3,
        dependson: ["prerequisite"],
      },
      { id: "MATH100", raw_id: null, semester: null },
      { id: "PHYS100", raw_id: "11310PHYS100", semester: "11310" },
    ]);
  });
});
