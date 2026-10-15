import { afterEach, describe, expect, test } from "bun:test";
import { installTestDom } from "@/testDom";

let restoreDom: (() => void) | undefined;

afterEach(() => {
  restoreDom?.();
  restoreDom = undefined;
});

const loadLocalizedRedirectPath = async () => {
  const installed = installTestDom("/zh/today");
  restoreDom = installed.restore;
  return (await import("./LangLayout")).localizedRedirectPath;
};

describe("localizedRedirectPath", () => {
  test("keeps a page path that has no language prefix", async () => {
    const localizedRedirectPath = await loadLocalizedRedirectPath();
    expect(localizedRedirectPath("/laundry", "zh")).toBe("/zh/laundry");
    expect(localizedRedirectPath("/sports-venues", "en")).toBe(
      "/en/sports-venues",
    );
    expect(localizedRedirectPath("/courses/11410CS100100", "zh")).toBe(
      "/zh/courses/11410CS100100",
    );
  });

  test("swaps an unsupported language for the preferred one", async () => {
    const localizedRedirectPath = await loadLocalizedRedirectPath();
    expect(localizedRedirectPath("/fr/courses", "zh")).toBe("/zh/courses");
    expect(localizedRedirectPath("/zh-TW/timetable", "zh")).toBe(
      "/zh/timetable",
    );
    expect(localizedRedirectPath("/zh-CN/courses", "zh")).toBe(
      "/zh-cn/courses",
    );
    expect(localizedRedirectPath("/zh-cn/courses", "en")).toBe(
      "/zh-cn/courses",
    );
  });

  test("falls back to today when nothing is left", async () => {
    const localizedRedirectPath = await loadLocalizedRedirectPath();
    expect(localizedRedirectPath("/fr", "zh")).toBe("/zh/today");
    expect(localizedRedirectPath("/fr/", "en")).toBe("/en/today");
  });
});
