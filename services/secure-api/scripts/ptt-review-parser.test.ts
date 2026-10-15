import { describe, expect, test } from "bun:test";
import {
  parseCourseCode,
  parsePttReviewText,
  resolveInstructorName,
} from "./ptt-review-parser";

const fixture = (name: string) =>
  Bun.file(new URL(`./ptt-fixtures/${name}`, import.meta.url)).text();

describe("PTT review importer parser", () => {
  test("matches the web module key normalization for real course ids", () => {
    expect(parseCourseCode("11020MATH104005")).toMatchObject({
      semester: "11020",
      department: "MATH",
      course: "1040",
      moduleKey: "MATH:1040",
    });
    expect(parseCourseCode("11410CS 135500")).toMatchObject({
      semester: "11410",
      department: "CS",
      course: "1355",
      moduleKey: "CS:1355",
    });
    expect(parseCourseCode("STAT502000")).toMatchObject({
      semester: undefined,
      department: "STAT",
      course: "5020",
      moduleKey: "STAT:5020",
    });
    expect(parseCourseCode("EECS 302001")).toMatchObject({
      semester: undefined,
      department: "EECS",
      course: "3020",
      moduleKey: "EECS:3020",
    });
  });

  test("keeps a space-separated English instructor name together", async () => {
    const parsed = parsePttReviewText({
      text: await fixture("jerry-chou-review.txt"),
    });
    expect(parsed).toMatchObject({
      courseCode: "CS342301",
      moduleKey: "CS:3423",
      semester: null,
      instructors: ["Jerry Chou"],
    });
  });

  test("resolves English instructor names to unique Chinese offering names", () => {
    expect(
      resolveInstructorName("Jerry Chou", [
        { teacher_en: ["CHOU, JERRY"], teacher_zh: ["周志遠"] },
      ]),
    ).toBe("周志遠");
    expect(
      resolveInstructorName("Jerry-Chou", [
        { teacher_en: ["Jerry Chou"], teacher_zh: ["周志遠"] },
        { teacher_en: ["Jerry Chou"], teacher_zh: ["周志遠"] },
      ]),
    ).toBe("周志遠");
    expect(
      resolveInstructorName("Jerry Chou", [
        { teacher_en: ["Jerry Chou"], teacher_zh: ["周志遠"] },
        { teacher_en: ["Jerry Chou"], teacher_zh: ["周志豪"] },
      ]),
    ).toBe("Jerry Chou");
  });

  test("parses the copied standard and long fixtures", async () => {
    const standard = parsePttReviewText({
      text: await fixture("standard-review.txt"),
    });
    expect(standard).toMatchObject({
      moduleKey: "MATH:1040",
      semester: "11020",
      instructors: ["顏東勇"],
      coolness: 4,
      sweetness: 3,
    });
    expect(standard.body).toContain("建議先修課程");

    const long = parsePttReviewText({ text: await fixture("long-review.txt") });
    expect(long).toMatchObject({
      moduleKey: "CS:4311",
      semester: null,
      instructors: ["韓永楷"],
      coolness: 4,
      sweetness: null,
    });
  });

  test("skips a copied post without a parseable course code", async () => {
    const parsed = parsePttReviewText({
      text: await fixture("missing-fields.txt"),
    });
    expect(parsed.moduleKey).toBeNull();
    expect(parsed.instructors).toEqual([]);
  });
});
