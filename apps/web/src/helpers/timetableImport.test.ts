import { describe, expect, test } from "bun:test";
import { mergeTimetableImport } from "./timetableImport";

const item = (id: string) => ({
  id,
  title: id,
  color: "#000000",
  slots: [{ day: 0, start: "08:00", end: "08:50" }],
});

describe("timetable imports", () => {
  test("replaces only non-empty shared semesters and preserves unrelated data", () => {
    expect(
      mergeTimetableImport(
        {
          courses: {
            "11310": ["local-old"],
            "11410": ["local-course"],
            "11510": ["local-future"],
          },
          customItems: {
            "11310": [item("local-old-item")],
            "11410": [item("local-item")],
            "11510": [item("local-future-item")],
          },
          colorMap: {
            "local-course": "#111111",
            "kept-course": "#222222",
          },
        },
        {
          courses: {
            "11310": ["shared-course"],
            "11410": [],
          },
          customItems: {
            "11310": [item("shared-item")],
            "11410": [],
            "11610": [item("new-item")],
          },
          colorMap: {
            "shared-course": "#333333",
          },
        },
      ),
    ).toEqual({
      courses: {
        "11310": ["shared-course"],
        "11410": ["local-course"],
        "11510": ["local-future"],
        "11610": [],
      },
      customItems: {
        "11310": [item("shared-item")],
        "11410": [item("local-item")],
        "11510": [item("local-future-item")],
        "11610": [item("new-item")],
      },
      colorMap: {
        "local-course": "#111111",
        "kept-course": "#222222",
        "shared-course": "#333333",
      },
    });
  });
});
