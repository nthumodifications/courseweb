import { describe, expect, test } from "bun:test";
import {
  calculateCredits,
  calculateGpa,
  calculateProjectedCumulativeGpa,
  getGradeBand,
  mergeGradebooks,
  type GradeEntry,
} from "./calculator";

const entries: GradeEntry[] = [
  { id: "algorithms", courseName: "Algorithms", credits: 3, score: 95 },
  { id: "writing", courseName: "Writing", credits: 1, score: 75 },
];

describe("grade predictor", () => {
  test("maps scores to the displayed 4.3 scale", () => {
    expect(getGradeBand(95)).toEqual({
      minimum: 90,
      letter: "A+",
      points: 4.3,
    });
    expect(getGradeBand(79).letter).toBe("B+");
    expect(getGradeBand(59).points).toBe(0);
  });

  test("calculates a credit-weighted term GPA", () => {
    expect(calculateCredits(entries)).toBe(4);
    expect(calculateGpa(entries)).toBe(3.98);
  });

  test("projects cumulative GPA from an existing record", () => {
    expect(
      calculateProjectedCumulativeGpa({
        entries,
        currentGpa: 3.2,
        completedCredits: 30,
      }),
    ).toBe(3.29);
  });

  test("merges course entries from two signed-in devices", () => {
    expect(
      mergeGradebooks(
        {
          entries: [entries[0]!],
          baseline: { currentGpa: "", completedCredits: "" },
        },
        {
          entries: [entries[1]!],
          baseline: { currentGpa: "3.2", completedCredits: "30" },
        },
      ),
    ).toEqual({
      entries,
      baseline: { currentGpa: "3.2", completedCredits: "30" },
    });
  });

  test("returns no prediction for an empty gradebook", () => {
    expect(calculateGpa([])).toBeNull();
    expect(
      calculateProjectedCumulativeGpa({
        entries: [],
        currentGpa: null,
        completedCredits: null,
      }),
    ).toBeNull();
  });
});
