import { describe, expect, test } from "bun:test";
import { assignAutomaticCourseColors } from "./autoCourseColors";

const palette = [
  "#100000",
  "#200000",
  "#300000",
  "#400000",
  "#500000",
  "#600000",
  "#700000",
  "#800000",
];

describe("automatic timetable colors", () => {
  test("keeps courses in the same department on the same color", () => {
    const assignments = assignAutomaticCourseColors(
      [
        { raw_id: "a", department: "AES", times: ["M1"] },
        { raw_id: "b", department: "AES", times: ["T5"] },
      ],
      palette,
      "department",
    );

    expect(assignments.a).toBe(assignments.b);
  });

  test("derives stable department assignments and spreads them over the palette", () => {
    const courses = ["AES", "EE", "MATH", "CHEM", "PHYS", "CS"].map(
      (department) => ({
        raw_id: department,
        department,
        times: ["M1"],
      }),
    );
    const forward = assignAutomaticCourseColors(courses, palette, "department");
    const reversed = assignAutomaticCourseColors(
      [...courses].reverse(),
      palette,
      "department",
    );
    const indices = Object.values(forward).map((color) =>
      palette.indexOf(color),
    );

    expect(forward).toEqual(reversed);
    expect(new Set(indices).size).toBe(courses.length);
    expect(Math.max(...indices) - Math.min(...indices)).toBeGreaterThanOrEqual(
      5,
    );
  });

  test("assigns the three time-of-day bands using the current palette", () => {
    const assignments = assignAutomaticCourseColors(
      [
        { raw_id: "morning", department: "AES", times: ["M1W2"] },
        { raw_id: "afternoon", department: "AES", times: ["T5"] },
        { raw_id: "evening", department: "AES", times: ["R9"] },
        { raw_id: "same-band", department: "EE", times: ["F4"] },
      ],
      palette,
      "time_of_day",
    );

    expect(assignments.morning).toBe(assignments["same-band"]);
    expect(
      new Set([assignments.morning, assignments.afternoon, assignments.evening])
        .size,
    ).toBe(3);
    expect(
      Object.values(assignments).every((color) => palette.includes(color)),
    ).toBe(true);
  });

  test("leaves courses unchanged when the selected palette is empty", () => {
    expect(
      assignAutomaticCourseColors(
        [{ raw_id: "a", department: "AES", times: ["M1"] }],
        [],
        "department",
      ),
    ).toEqual({});
  });
});
