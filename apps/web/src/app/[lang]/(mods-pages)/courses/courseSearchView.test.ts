import { describe, expect, test } from "bun:test";
import {
  countActiveRefinementValues,
  hasCourseSearchRefinements,
  readCourseSearchView,
  resolveCourseSearchView,
  writeCourseSearchView,
} from "./courseSearchView";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe("course search view preference", () => {
  test("persists valid view choices and defaults to list", () => {
    const storage = createStorage();
    expect(readCourseSearchView(storage)).toBe("list");
    writeCourseSearchView("grid", storage);
    expect(readCourseSearchView(storage)).toBe("grid");
  });

  test("uses list instead of table on phones", () => {
    expect(resolveCourseSearchView("table", true)).toBe("list");
    expect(resolveCourseSearchView("table", false)).toBe("table");
    expect(resolveCourseSearchView("grid", true)).toBe("grid");
  });
});

describe("active course filter counts", () => {
  test("counts only refined facet values", () => {
    expect(
      countActiveRefinementValues([
        { isRefined: true },
        { isRefined: false },
        { isRefined: true },
      ]),
    ).toBe(2);
  });

  test("ignores the semester but detects active course filters", () => {
    expect(hasCourseSearchRefinements({ menu: { semester: "2026-1" } })).toBe(
      false,
    );
    expect(
      hasCourseSearchRefinements({
        refinementList: { department: ["MATH"] },
      }),
    ).toBe(true);
  });
});
