import { describe, expect, test } from "bun:test";
import { decodeTimetableShareQuery } from "./timetableShare";

describe("timetable share query decoding", () => {
  test("round-trips legacy encoded course IDs and color maps without throwing", () => {
    const params = new URLSearchParams(
      "semester_11420=11420-CS%20101%201%2C11420-%E7%89%A9%E7%90%86&colorMap=%7B%22%C2%A3%22%3A%22%23abc%22%7D",
    );

    expect(decodeTimetableShareQuery(params)).toMatchObject({
      courseCodes: {
        "11420": ["11420-CS 101 1", "11420-物理"],
      },
      colorMap: { "£": "#abc" },
    });
  });

  test("rejects malformed and oversized links instead of throwing", () => {
    expect(
      decodeTimetableShareQuery(new URLSearchParams("semester_11420=bad%")),
    ).toBeNull();

    expect(
      decodeTimetableShareQuery(
        new URLSearchParams(`semester_11420=${"a".repeat(100_001)}`),
      ),
    ).toBeNull();
  });

  test("starts with a semester present in an old single-semester link", () => {
    const decoded = decodeTimetableShareQuery(
      new URLSearchParams("semester_11420=11420-CS%20101%201"),
    );

    expect(decoded?.initialSemester).toBe("11420");
  });

  test("keeps HEAD's newest present semester for a multi-semester link", () => {
    const decoded = decodeTimetableShareQuery(
      new URLSearchParams(
        "semester_11320=11320-CS-101&semester_11420=11420-CS-101&semester_11510=11510-CS-101",
      ),
    );

    expect(decoded?.initialSemester).toBe("11510");
  });

  test("uses the last serialized semester when HEAD's latest is absent", () => {
    const decoded = decodeTimetableShareQuery(
      new URLSearchParams(
        "semester_11420=11420-CS-101&semester_11320=11320-CS-101",
      ),
    );

    expect(decoded?.initialSemester).toBe("11320");
  });
});
