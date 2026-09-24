import { describe, expect, test } from "bun:test";
import { localizedRedirectPath } from "./LangLayout";

describe("localizedRedirectPath", () => {
  test("keeps a page path that has no language prefix", () => {
    expect(localizedRedirectPath("/laundry", "zh")).toBe("/zh/laundry");
    expect(localizedRedirectPath("/sports-venues", "en")).toBe(
      "/en/sports-venues",
    );
    expect(localizedRedirectPath("/courses/11410CS100100", "zh")).toBe(
      "/zh/courses/11410CS100100",
    );
  });

  test("swaps an unsupported language for the preferred one", () => {
    expect(localizedRedirectPath("/fr/courses", "zh")).toBe("/zh/courses");
    expect(localizedRedirectPath("/zh-TW/timetable", "zh")).toBe(
      "/zh/timetable",
    );
  });

  test("falls back to today when nothing is left", () => {
    expect(localizedRedirectPath("/fr", "zh")).toBe("/zh/today");
    expect(localizedRedirectPath("/fr/", "en")).toBe("/en/today");
  });
});
