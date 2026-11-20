import { describe, expect, test } from "bun:test";
import { COURSE_INSTRUCTOR_SEPARATOR, decodeCourseText } from "./course-text";

describe("course text display helpers", () => {
  test("decodes named and numeric HTML entities as plain text", () => {
    expect(
      decodeCourseText("A&amp;B &lt;tag&gt; &quot;quoted&quot; &#39; &#x41;"),
    ).toBe('A&B <tag> "quoted" \' A');
  });

  test("uses a spaced separator between course titles and instructors", () => {
    expect(COURSE_INSTRUCTOR_SEPARATOR).toBe(" - ");
  });
});
