import { describe, expect, it } from "bun:test";
import type { MinimalCourse } from "@/types/courses";
import { getFavouriteCourseConflicts } from "./favouriteCourseConflicts";

const course = (raw_id: string, times: string[], semester = "11510") =>
  ({
    raw_id,
    semester,
    times,
    venues: ["Room"],
  }) as MinimalCourse;

describe("favourite course conflicts", () => {
  it("finds overlapping selected courses without including itself", () => {
    const favourite = course("11510-A", ["T1T2"]);
    const overlapping = course("11510-B", ["T2T3"]);
    const separate = course("11510-C", ["T3T4"]);
    const otherSemester = course("11410-D", ["T1T2"], "11410");

    expect(
      getFavouriteCourseConflicts(favourite, [
        favourite,
        overlapping,
        separate,
        otherSemester,
      ]),
    ).toEqual([overlapping]);
  });

  it("does not mark a course without times as conflicting", () => {
    expect(
      getFavouriteCourseConflicts(course("11510-A", []), [
        course("11510-B", ["T1"]),
      ]),
    ).toEqual([]);
  });
});
