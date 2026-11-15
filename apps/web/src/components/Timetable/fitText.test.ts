import { describe, expect, test } from "bun:test";
import {
  findFittingTextLayout,
  getTimetableFieldDropOrder,
} from "./fitTextAlgorithm";

describe("timetable text fitting", () => {
  test("keeps the selected size when the content fits", () => {
    const layout = findFittingTextLayout({
      baseFontSize: 16,
      measure: (fontSize) => fontSize <= 16,
    });

    expect(layout).toEqual({
      fontSize: 16,
      hiddenFields: [],
      overflowsAtMinimum: false,
    });
  });

  test("starts from every configured timetable font size", () => {
    for (const baseFontSize of [10, 12, 14, 16]) {
      const layout = findFittingTextLayout({
        baseFontSize,
        measure: () => true,
      });

      expect(layout.fontSize).toBe(baseFontSize);
    }
  });

  test("binary searches for the largest size that fits", () => {
    let measurements = 0;
    const layout = findFittingTextLayout({
      baseFontSize: 16,
      measure: (fontSize) => {
        measurements += 1;
        return fontSize <= 11.25;
      },
    });

    expect(layout.fontSize).toBe(11);
    expect(layout.hiddenFields).toEqual([]);
    expect(measurements).toBeLessThanOrEqual(7);
  });

  test("removes lower-priority fields before venue and protects the title", () => {
    const layout = findFittingTextLayout({
      baseFontSize: 12,
      dropOrder: ["title", "credits", "teacher", "venue"],
      measure: (_fontSize, hiddenFields) =>
        hiddenFields.includes("teacher") && hiddenFields.includes("credits"),
    });

    expect(layout.fontSize).toBe(12);
    expect(layout.hiddenFields).toEqual(["credits", "teacher"]);
    expect(layout.overflowsAtMinimum).toBe(false);
  });

  test("retains title text even when it is the only content that cannot fit", () => {
    const layout = findFittingTextLayout({
      baseFontSize: 10,
      dropOrder: ["title", "venue", "time"],
      measure: () => false,
    });

    expect(layout.fontSize).toBe(8);
    expect(layout.hiddenFields).toEqual(["venue", "time"]);
    expect(layout.overflowsAtMinimum).toBe(true);
  });

  test("prioritizes name, then venue, using display order for other fields", () => {
    expect(
      getTimetableFieldDropOrder([
        "code",
        "title",
        "time",
        "teacher",
        "venue",
        "credits",
      ]),
    ).toEqual(["credits", "teacher", "time", "code", "venue"]);
  });
});
