import { describe, expect, test } from "bun:test";
import type { CourseDefinition } from "@/config/supabase";
import {
  decodeInstructorRouteParam,
  encodeInstructorRouteParam,
  groupInstructorCourses,
  isInstructorPageName,
  normaliseInstructorName,
  pairInstructorNames,
} from "./instructors";

const course = (rawId: string, semester: string, teacher = "教師") =>
  ({
    raw_id: rawId,
    semester,
    department: "CS",
    course: "1355",
    class: "01",
    name_zh: "資料結構",
    name_en: "Data Structures",
    credits: 3,
    language: "英",
    teacher_zh: [teacher],
    teacher_en: ["TEACHER"],
    venues: [],
    times: [],
    capacity: null,
    enrolled: 0,
    tags: [],
  }) as CourseDefinition;

describe("instructor identity and grouping", () => {
  test("round-trips encoded route names without merging identities", () => {
    for (const name of ["A/B", "A%2FB", "中文教師"]) {
      const routeParam = decodeURIComponent(encodeInstructorRouteParam(name));
      expect(decodeInstructorRouteParam(routeParam)).toBe(name);
    }

    expect(pairInstructorNames(["林嘉文"], ["LIN, CHIA-WEN"])).toEqual([
      { nameZh: "林嘉文", nameEn: "LIN, CHIA-WEN" },
    ]);
    expect(
      pairInstructorNames(["林嘉文", "林佳妏"], ["LIN, CHIA-WEN"]),
    ).toEqual([]);
  });

  test("recognises person names and excludes known group labels", () => {
    expect(isInstructorPageName("王嬿婷")).toBe(true);
    expect(isInstructorPageName("EMS境外專班")).toBe(false);
    expect(normaliseInstructorName("  ＨＵＡＮＧ,&nbsp; PO-CHIUN&#160; ")).toBe(
      "HUANG, PO-CHIUN",
    );
  });

  test("groups exact teacher matches by newest semester", () => {
    const groups = groupInstructorCourses([
      course("11210-CS", "11210"),
      course("11520-CS", "11520"),
      course("11520-EE", "11520"),
      course("11410-CS", "11410"),
    ]);

    expect(groups.map(({ semester }) => semester)).toEqual([
      "11520",
      "11410",
      "11210",
    ]);
    expect(groups[0]?.courses.map(({ raw_id }) => raw_id)).toEqual([
      "11520-EE",
      "11520-CS",
    ]);
  });
});
