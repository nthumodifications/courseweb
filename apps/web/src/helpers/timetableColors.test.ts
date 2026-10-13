import { describe, expect, test } from "bun:test";
import { groupColorsByDepartment } from "./timetableColors";

describe("groupColorsByDepartment", () => {
  test("uses first-seen department order, wraps colours, and preserves unrelated ids", () => {
    expect(
      groupColorsByDepartment(
        { unrelated: "#existing" },
        [
          { raw_id: "course-b", department: "BIO" },
          { raw_id: "course-a", department: "CS" },
          { raw_id: "course-c", department: "BIO" },
          { raw_id: "course-d", department: "MATH" },
        ],
        ["#red", "#blue"],
      ),
    ).toEqual({
      unrelated: "#existing",
      "course-a": "#blue",
      "course-b": "#red",
      "course-c": "#red",
      "course-d": "#red",
    });
  });
});
