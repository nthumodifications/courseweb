import { getSemester, lastSemester, semesterInfo } from "@courseweb/shared";

export const getCurrentReviewSemesterId = (now = new Date()) =>
  getSemester(now)?.id ??
  [...semesterInfo].reverse().find((semester) => semester.begins <= now)?.id ??
  lastSemester.id;

export const isReviewTextLocked = (
  locked: boolean,
  timetableReady: boolean,
  reviewsReady: boolean,
) => locked || !timetableReady || !reviewsReady;

export const getVisibleReviewRows = <T>(
  reviews: readonly T[],
  locked: boolean,
): T[] => (locked ? [] : [...reviews]);

export const isPastReviewSemester = (
  semester: string,
  currentSemester?: string,
  now?: Date,
) =>
  /^\d{5}$/.test(semester) &&
  semester < (currentSemester ?? getCurrentReviewSemesterId(now));

export const deriveReviewLock = ({
  courses,
  reviews,
  currentSemester,
  now = new Date(),
}: {
  courses: Readonly<Record<string, readonly string[]>>;
  reviews?: readonly { semester: string | null; source: "native" | "ptt" }[];
  currentSemester?: string;
  now?: Date;
}) => {
  const activeSemester = currentSemester ?? getCurrentReviewSemesterId(now);
  const pastSemesters = Object.entries(courses)
    .filter(
      ([semester, courseIds]) =>
        isPastReviewSemester(semester, activeSemester, now) &&
        courseIds.length > 0,
    )
    .map(([semester]) => semester)
    .sort((left, right) => right.localeCompare(left));
  const hasPastReview = (reviews ?? []).some(
    (review) =>
      review.source === "native" &&
      Boolean(review.semester) &&
      isPastReviewSemester(review.semester!, activeSemester, now),
  );
  return {
    hasPastCourses: pastSemesters.length > 0,
    pastSemesters,
    locked: pastSemesters.length > 0 && !hasPastReview,
  };
};
