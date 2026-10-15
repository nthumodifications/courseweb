import { describe, expect, test } from "bun:test";
import {
  deriveReviewLock,
  getVisibleReviewRows,
  getCurrentReviewSemesterId,
  isPastReviewSemester,
} from "./review-lock";

const currentSemester = "11510";

describe("review soft-lock derivation", () => {
  test("hides native and PTT rows while locked", () => {
    const rows = [
      { id: "native", source: "native" as const },
      { id: "ptt", source: "ptt" as const },
    ];

    expect(getVisibleReviewRows(rows, true)).toEqual([]);
    expect(getVisibleReviewRows(rows, false)).toEqual(rows);
  });

  test("uses the semester containing the fixed date instead of the latest data row", () => {
    expect(getCurrentReviewSemesterId(new Date("2026-10-15T12:00:00Z"))).toBe(
      "11510",
    );
    expect(
      isPastReviewSemester(
        "11510",
        undefined,
        new Date("2026-10-15T12:00:00Z"),
      ),
    ).toBe(false);
  });
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
