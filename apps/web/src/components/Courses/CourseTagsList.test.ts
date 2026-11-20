import { describe, expect, test } from "bun:test";
import { hasKnownCourseCapacity } from "./CourseTagsList";

describe("course capacity chip visibility", () => {
  test("hides capacity when it is unknown", () => {
    expect(hasKnownCourseCapacity(null)).toBe(false);
    expect(hasKnownCourseCapacity(undefined)).toBe(false);
  });

  test("shows capacity when it is known, including zero", () => {
    expect(hasKnownCourseCapacity(0)).toBe(true);
    expect(hasKnownCourseCapacity(42)).toBe(true);
  });
});
