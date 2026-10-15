import { describe, expect, test } from "bun:test";
import {
  getPastReviewRatingSummary,
  isPastReviewRowEditing,
  reconcileReviewDrafts,
  setPastReviewRowStatus,
} from "./past-review-state";

describe("past review row state", () => {
  test("collapses reviewed rows until explicitly edited", () => {
    expect(isPastReviewRowEditing(false, false)).toBe(true);
    expect(isPastReviewRowEditing(true, false)).toBe(false);
    expect(isPastReviewRowEditing(true, true)).toBe(true);
  });

  test("builds the compact reviewed-row rating summary", () => {
    expect(
      getPastReviewRatingSummary({ coolness: 4, sweetness: 4, learning: 5 }),
    ).toEqual(["涼度 4", "甜度 4", "學習收穫 5"]);
  });

  test("hydrates an existing review when it arrives after the initial draft", () => {
    const hydrated = new Set<string>();
    const makeDraft = (review?: { rating: number }) => review?.rating ?? 0;
    const initial = reconcileReviewDrafts(
      {},
      [{ key: "course-a" }],
      makeDraft,
      hydrated,
    );
    const withExisting = reconcileReviewDrafts(
      initial,
      [{ key: "course-a", existing: { rating: 4 } }],
      makeDraft,
      hydrated,
    );

    expect(initial["course-a"]).toBe(0);
    expect(withExisting["course-a"]).toBe(4);
  });

  test("updates one row status without changing another row", () => {
    const current = {
      "course-a": { error: true, success: false },
      "course-b": { error: false, success: true },
    };
    expect(
      setPastReviewRowStatus(current, "course-a", {
        error: false,
        success: true,
      }),
    ).toEqual({
      "course-a": { error: false, success: true },
      "course-b": { error: false, success: true },
    });
  });
});
