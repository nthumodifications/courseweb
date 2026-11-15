import { describe, expect, test } from "bun:test";
import { formatCourseTime } from "./format-course-times";

describe("formatCourseTime", () => {
  test("formats Chinese and English weekday names and merges consecutive periods", () => {
    const time = "T1T2F1F2MaMbMc";

    expect(formatCourseTime(time, "zh")).toBe("一 a–c · 二 1–2 · 五 1–2");
    expect(formatCourseTime(time, "en")).toBe("Mon a–c · Tue 1–2 · Fri 1–2");
  });

  test("orders days and periods canonically and ignores duplicate slots", () => {
    expect(formatCourseTime("U9U8T2T1M5MnM4M2M1T1", "en")).toBe(
      "Mon 1–2, 4–5 · Tue 1–2 · Sun 8–9",
    );
  });

  test("preserves unknown values when there are no recognized slots", () => {
    expect(formatCourseTime("TBA", "zh")).toBe("TBA");
  });
});
