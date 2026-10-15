import { describe, expect, test } from "bun:test";
import {
  toggleExamStyles,
  validateReviewForm,
} from "@/components/Reviews/ReviewsSection";

const valid = {
  instructor: "林教授",
  semester: "11310",
  workload: 3,
  grading: 4,
  learning: 5,
  examStyle: ["written"] as const,
  body: "這是一段超過三十個字的心得，描述課程內容、授課方式與評量安排，讓其他同學能夠做出適合自己的選課決定。",
};

describe("review form validation", () => {
  test("accepts a complete review", () => {
    expect(validateReviewForm(valid)).toBe(null);
  });

  test("requires ratings and an assessment style", () => {
    expect(validateReviewForm({ ...valid, workload: 0 })).toBe("required");
    expect(validateReviewForm({ ...valid, examStyle: [] })).toBe("required");
  });

  test("enforces the trimmed body length", () => {
    expect(validateReviewForm({ ...valid, body: "太短" })).toBe(
      "body_too_short",
    );
    expect(validateReviewForm({ ...valid, body: "x".repeat(3001) })).toBe(
      "body_too_long",
    );
  });

  test("keeps no exam mutually exclusive with other assessment styles", () => {
    expect(toggleExamStyles(["written"], "none", true)).toEqual(["none"]);
    expect(toggleExamStyles(["none"], "written", true)).toEqual(["written"]);
  });
});
