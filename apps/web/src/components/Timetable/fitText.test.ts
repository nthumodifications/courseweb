import { describe, expect, test } from "bun:test";
import {
  findFittingTextLayout,
  withClampedTitleExcluded,
} from "./fitTextAlgorithm";

describe("timetable text fitting", () => {
  test("keeps the selected size when the content fits", () => {
    const layout = findFittingTextLayout({
      baseFontSize: 16,
      measure: (fontSize) => fontSize <= 16,
    });

    expect(layout).toEqual({
      fontSize: 16,
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
    expect(layout.overflowsAtMinimum).toBe(false);
    expect(measurements).toBeLessThanOrEqual(7);
  });

  test("keeps all content at the 6px floor and marks remaining overflow", () => {
    let smallestSize = Number.POSITIVE_INFINITY;
    const layout = findFittingTextLayout({
      baseFontSize: 10,
      measure: (fontSize) => {
        smallestSize = Math.min(smallestSize, fontSize);
        return false;
      },
    });

    expect(layout).toEqual({
      fontSize: 6,
      overflowsAtMinimum: true,
    });
    expect(smallestSize).toBe(6);
  });

  test("fits other fields while a clamped title is excluded", () => {
    const title = { style: { display: "" } };

    const layout = withClampedTitleExcluded(title, true, () =>
      findFittingTextLayout({
        baseFontSize: 14,
        measure: (fontSize) => title.style.display === "none" && fontSize <= 14,
      }),
    );

    expect(layout.fontSize).toBe(14);
    expect(layout.overflowsAtMinimum).toBe(false);
    expect(title.style.display).toBe("");
  });
});
