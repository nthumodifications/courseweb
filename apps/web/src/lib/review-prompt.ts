export type ReviewPromptSemester = {
  id: string;
  begins: Date;
  ends: Date;
};

export type ReviewPromptCourse = {
  moduleKey: string;
  instructors: readonly string[];
};

export type ReviewPromptReview = {
  moduleKey: string;
  instructor: string;
  source: "native" | "ptt";
};

export type ReviewPromptDismissal = {
  dismissed?: boolean;
  snoozedUntil?: number;
};

export type ReviewPromptDismissals = Readonly<
  Record<string, ReviewPromptDismissal>
>;

export type ReviewPromptInput = {
  now: Date;
  semesters: readonly ReviewPromptSemester[];
  timetableCourses: Readonly<
    Record<string, readonly ReviewPromptCourse[] | undefined>
  >;
  myReviews: readonly ReviewPromptReview[];
  dismissedFor?: ReviewPromptDismissals;
};

export type ReviewPromptState = {
  targetSemester: string;
  unreviewedCount: number;
};

const MILLISECONDS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;
const PROMPT_FROM_WEEK = 15;

const semesterOrder = (
  left: ReviewPromptSemester,
  right: ReviewPromptSemester,
) => left.begins.getTime() - right.begins.getTime();

const getTargetSemester = (
  now: Date,
  semesters: readonly ReviewPromptSemester[],
) => {
  const ordered = [...semesters]
    .filter(
      (semester) =>
        semester.begins instanceof Date &&
        semester.ends instanceof Date &&
        !Number.isNaN(semester.begins.getTime()) &&
        !Number.isNaN(semester.ends.getTime()),
    )
    .sort(semesterOrder);
  const active = ordered.find(
    (semester) => now >= semester.begins && now <= semester.ends,
  );

  if (active) {
    const week =
      Math.floor(
        (now.getTime() - active.begins.getTime()) / MILLISECONDS_IN_WEEK,
      ) + 1;
    return week >= PROMPT_FROM_WEEK ? active : null;
  }

  const latestEnded = [...ordered]
    .reverse()
    .find((semester) => semester.ends < now);
  const next = ordered.find((semester) => semester.begins > now);
  return latestEnded && (!next || next.begins > now) ? latestEnded : null;
};

const hasReviewedCourse = (
  course: ReviewPromptCourse,
  reviews: readonly ReviewPromptReview[],
) => {
  if (!course.moduleKey || course.instructors.length === 0) return false;
  return course.instructors.every((instructor) =>
    reviews.some(
      (review) =>
        review.source === "native" &&
        review.moduleKey === course.moduleKey &&
        review.instructor === instructor,
    ),
  );
};

export const getReviewPromptState = (
  input: ReviewPromptInput,
): ReviewPromptState | null => {
  const target = getTargetSemester(input.now, input.semesters);
  if (!target) return null;

  const dismissal = input.dismissedFor?.[target.id];
  if (
    dismissal?.dismissed ||
    (dismissal?.snoozedUntil !== undefined &&
      dismissal.snoozedUntil > input.now.getTime())
  ) {
    return null;
  }

  const courses = input.timetableCourses[target.id] ?? [];
  const unreviewedCount = courses.filter(
    (course) => !hasReviewedCourse(course, input.myReviews),
  ).length;
  return unreviewedCount > 0
    ? { targetSemester: target.id, unreviewedCount }
    : null;
};

export const shouldShowReviewPrompt = (input: ReviewPromptInput) =>
  getReviewPromptState(input) !== null;
