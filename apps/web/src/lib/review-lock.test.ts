import { describe, expect, test } from "bun:test";
import { deriveReviewLock } from "./review-lock";

const currentSemester = "11510";

describe("review soft-lock derivation", () => {
  test("does not lock a new student without past courses", () => {
    expect(
      deriveReviewLock({
        courses: { [currentSemester]: ["11510CS 210401"] },
        currentSemester,
      }),
    ).toMatchObject({ hasPastCourses: false, locked: false });
  });

  test("locks a returning student without a native past-semester review", () => {
    expect(
      deriveReviewLock({
        courses: { "11420": ["11420CS 210401"] },
        currentSemester,
      }),
    ).toMatchObject({ hasPastCourses: true, locked: true });
  });

  test("unlocks after a native review from a past semester", () => {
    expect(
      deriveReviewLock({
        courses: { "11420": ["11420CS 210401"] },
        reviews: [{ source: "native", semester: "11420" }],
        currentSemester,
      }),
    ).toMatchObject({ locked: false });
  });

  test("does not unlock for a current-semester review", () => {
    expect(
      deriveReviewLock({
        courses: { "11420": ["11420CS 210401"] },
        reviews: [{ source: "native", semester: currentSemester }],
        currentSemester,
      }),
    ).toMatchObject({ locked: true });
  });
});
