import { lastSemester } from "@courseweb/shared";

export const isPastReviewSemester = (
  semester: string,
  currentSemester = lastSemester.id,
) => /^\d{5}$/.test(semester) && semester < currentSemester;

export const deriveReviewLock = ({
  courses,
  reviews,
  currentSemester = lastSemester.id,
}: {
  courses: Readonly<Record<string, readonly string[]>>;
  reviews?: readonly { semester: string | null; source: "native" | "ptt" }[];
  currentSemester?: string;
}) => {
  const pastSemesters = Object.entries(courses)
    .filter(
      ([semester, courseIds]) =>
        isPastReviewSemester(semester, currentSemester) && courseIds.length > 0,
    )
    .map(([semester]) => semester)
    .sort((left, right) => right.localeCompare(left));
  const hasPastReview = (reviews ?? []).some(
    (review) =>
      review.source === "native" &&
      Boolean(review.semester) &&
      isPastReviewSemester(review.semester!, currentSemester),
  );
  return {
    hasPastCourses: pastSemesters.length > 0,
    pastSemesters,
    locked: pastSemesters.length > 0 && !hasPastReview,
  };
};
