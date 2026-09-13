import { describe, expect, test } from "bun:test";
import {
  calculateCredits,
  calculateGpa,
  calculateProjectedCumulativeGpa,
  calculateSemesterCumulativeGpas,
  getGradeBand,
  getGradeBandForEntry,
  mergeGradebooks,
  normalizeGradebook,
  type GradeEntry,
  type SemesterRecord,
} from "./calculator";

const entries: GradeEntry[] = [
  {
    id: "algorithms",
    courseName: "Algorithms",
    credits: 3,
    score: 95,
    letterGrade: "A+",
  },
  {
    id: "writing",
    courseName: "Writing",
    credits: 1,
    score: 75,
    letterGrade: "B",
  },
];

const semesters: SemesterRecord[] = [
  {
    id: "11310",
    name: "11310",
    gpa: 3.2,
    credits: 20,
    cumulativeGpa: null,
  },
  {
    id: "11320",
    name: "11320",
    gpa: 3.8,
    credits: 20,
    cumulativeGpa: 3.5,
  },
];

describe("grade predictor", () => {
  test("maps scores and letter grades to the displayed 4.3 scale", () => {
    expect(getGradeBand(95)).toEqual({
      minimum: 90,
      letter: "A+",
      points: 4.3,
    });
    expect(getGradeBandForEntry({ score: null, letterGrade: "A-" })).toEqual({
      minimum: 80,
      letter: "A-",
      points: 3.7,
    });
    expect(getGradeBand(59).points).toBe(0);
  });

  test("calculates a credit-weighted GPA from scores and letters", () => {
    expect(calculateCredits(entries)).toBe(4);
    expect(calculateGpa(entries)).toBe(3.98);
    expect(
      calculateGpa([
        { id: "a", courseName: "A", credits: 3, score: null, letterGrade: "A" },
        { id: "b", courseName: "B", credits: 3, score: null, letterGrade: "B" },
      ]),
    ).toBe(3.5);
  });

  test("calculates cumulative GPA for backfilled semesters", () => {
    expect(
      calculateSemesterCumulativeGpas({
        semesters,
        currentGpa: null,
        completedCredits: null,
      }).map((semester) => semester.calculatedCumulativeGpa),
    ).toEqual([3.2, 3.5]);
    expect(
      calculateProjectedCumulativeGpa({
        entries: [],
        semesters,
        currentGpa: null,
        completedCredits: null,
      }),
    ).toBe(3.5);
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

  test("normalizes legacy numeric entries and keeps new semester history", () => {
    expect(
      normalizeGradebook({
        entries: [
          { id: "legacy", courseName: "Legacy", credits: 3, score: 95 },
        ],
        semesters,
        baseline: { currentGpa: "", completedCredits: "" },
      }),
    ).toEqual({
      entries: [
        {
          id: "legacy",
          courseName: "Legacy",
          credits: 3,
          score: 95,
          letterGrade: "A+",
        },
      ],
      semesters,
      baseline: { currentGpa: "", completedCredits: "" },
    });
  });

  test("merges course and semester entries from two signed-in devices", () => {
    expect(
      mergeGradebooks(
        {
          entries: [entries[0]!],
          semesters: [],
          baseline: { currentGpa: "", completedCredits: "" },
        },
        {
          entries: [entries[1]!],
          semesters: [semesters[0]!],
          baseline: { currentGpa: "3.2", completedCredits: "30" },
        },
      ),
    ).toEqual({
      entries,
      semesters: [semesters[0]],
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
