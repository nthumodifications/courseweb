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

  test("accepts only contract numeric ratings and agrees with the web parser", () => {
    const parsed = (value: string) =>
      parsePttReviewText({
        text: `課名: 測試\n科號: 11020MATH104005\n老師: 王小明\n涼度: ${value}\n甜度: ${value}\n\nbody`,
      });

    expect(parsed("4/5")).toMatchObject({ coolness: 4, sweetness: 4 });
    expect(parsed("4")).toMatchObject({ coolness: 4, sweetness: 4 });
    expect(parsed("4/10")).toMatchObject({ coolness: null, sweetness: null });
    expect(parsed("涼度: 4")).toMatchObject({
      coolness: null,
      sweetness: null,
    });
    expect(parsed("★★★★☆")).toMatchObject({ coolness: 4, sweetness: 4 });
  });

  test("splits CJK teacher names on spaces without splitting Latin full names", () => {
    expect(
      parsePttReviewText({
        text: "課名: 測試\n科號: 11020MATH104005\n老師: 王小明 李小華 Jerry Chou\n\nbody",
      }).instructors,
    ).toEqual(["王小明", "李小華", "Jerry Chou"]);
  });

  test("skips a copied post without a parseable course code", async () => {
    const parsed = parsePttReviewText({
      text: await fixture("missing-fields.txt"),
    });
    expect(parsed.moduleKey).toBeNull();
    expect(parsed.instructors).toEqual([]);
  });
});
