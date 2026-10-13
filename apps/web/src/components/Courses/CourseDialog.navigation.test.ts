import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { COURSE_DETAIL_SECTION_IDS } from "@/components/CourseDetails/courseDetailSections";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
import { parseCourseDialogPath } from "./courseDialogRouting";

describe("course dialog routes", () => {
  test.each([
    ["course", "/en/courses/11410-CS%201010%201", "course"],
    [
      "instructor",
      "/zh/courses/instructor/%E9%99%B3%E8%80%81%E5%B8%AB",
      "instructor",
    ],
    ["module", "/en/courses/module/CS%201010?title=Discrete", "module"],
  ])("parses the %s URL as a dialog view", (_label, path, type) => {
    expect(parseCourseDialogPath(path)?.type).toBe(type);
  });

  test("rejects non-dialog routes", () => {
    expect(parseCourseDialogPath("/en/courses")).toBeNull();
    expect(parseCourseDialogPath("/en/timetable")).toBeNull();
  });

  test("the actual course container emits each registered section once", () => {
    const source = readFileSync(
      new URL("../CourseDetails/CourseDetailsContainer.tsx", import.meta.url),
      "utf8",
    );
    const renderedIds = [
      ...source.matchAll(
        /<(?:CourseDetailSection|CourseMembershipSection)(?:\s+id)="([^"]+)"/g,
      ),
    ].map(([, id]) => id);
    expect(renderedIds).toEqual(COURSE_DETAIL_SECTION_IDS);
  });

  test.each([
    ["dialog content root", "min-w-0 max-w-full"],
    [
      "Radix scroll-area content wrapper",
      "[&>div[data-radix-scroll-area-viewport]>div]:!block",
    ],
  ])("keeps the mobile dialog %s constrained", (_label, className) => {
    const source = readFileSync(
      new URL("./CourseDialog.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain(className);
  });
});
