import { describe, expect, test } from "bun:test";
import {
  shouldShowReviewPrompt,
  type ReviewPromptCourse,
  type ReviewPromptSemester,
} from "./review-prompt";

const semesters: ReviewPromptSemester[] = [
  {
    id: "11510",
    begins: new Date("2026-09-07T00:00:00+08:00"),
    ends: new Date("2027-01-31T23:59:59+08:00"),
  },
  {
    id: "11520",
    begins: new Date("2027-02-15T00:00:00+08:00"),
    ends: new Date("2027-06-07T23:59:59+08:00"),
  },
];
const timetableCourses: Readonly<
  Record<string, readonly ReviewPromptCourse[]>
> = {
  "11510": [{ moduleKey: "CS:2104", instructors: ["Teacher"] }],
};

const atWeek = (week: number) =>
  new Date(
    new Date("2026-09-07T00:00:00+08:00").getTime() +
      (week - 1) * 7 * 24 * 60 * 60 * 1000,
  );

describe("end-of-semester review prompt", () => {
  test.each([
    [14, false],
    [15, true],
    [16, true],
  ])("week %d visibility is %s", (week, expected) => {
    expect(
      shouldShowReviewPrompt({
        now: atWeek(week),
        semesters,
        timetableCourses,
        myReviews: [],
      }),
    ).toBe(expected);
  });

  test("shows for the semester that just ended during the break", () => {
    expect(
      shouldShowReviewPrompt({
        now: new Date("2027-02-01T12:00:00+08:00"),
        semesters,
        timetableCourses,
        myReviews: [],
      }),
    ).toBe(true);
  });

  test("does not show in week one of the next semester", () => {
    expect(
      shouldShowReviewPrompt({
        now: new Date("2027-02-15T12:00:00+08:00"),
        semesters,
        timetableCourses: {
          ...timetableCourses,
          "11520": [{ moduleKey: "EE:3001", instructors: ["Teacher"] }],
        },
        myReviews: [],
      }),
    ).toBe(false);
  });

  test("requires courses that are not already reviewed", () => {
    expect(
      shouldShowReviewPrompt({
        now: atWeek(15),
        semesters,
        timetableCourses,
        myReviews: [
          { moduleKey: "CS:2104", instructor: "Teacher", source: "native" },
        ],
      }),
    ).toBe(false);
    expect(
      shouldShowReviewPrompt({
        now: atWeek(15),
        semesters,
        timetableCourses: {},
        myReviews: [],
      }),
    ).toBe(false);
  });

  test("honors a snooze and a semester dismissal", () => {
    const now = atWeek(15);
    expect(
      shouldShowReviewPrompt({
        now,
        semesters,
        timetableCourses,
        myReviews: [],
        dismissedFor: { "11510": { snoozedUntil: now.getTime() + 1_000 } },
      }),
    ).toBe(false);
    expect(
      shouldShowReviewPrompt({
        now,
        semesters,
        timetableCourses,
        myReviews: [],
        dismissedFor: { "11510": { dismissed: true } },
      }),
    ).toBe(false);
  });
});
