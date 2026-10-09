import { describe, expect, it } from "bun:test";
import { getFavouriteCourseItems } from "./favouriteCourseItems";

describe("getFavouriteCourseItems", () => {
  it("keeps favourite order and marks courses missing from the response", () => {
    const courses = [{ raw_id: "course-2" }, { raw_id: "course-1" }];

    expect(
      getFavouriteCourseItems(
        ["course-1", "course-missing", "course-2"],
        courses,
      ),
    ).toEqual([
      { course: courses[1] },
      { raw_id: "course-missing", missing: true },
      { course: courses[0] },
    ]);
  });

  it("returns no rows for an empty favourite list", () => {
    expect(getFavouriteCourseItems([], [{ raw_id: "course-1" }])).toEqual([]);
  });
});
