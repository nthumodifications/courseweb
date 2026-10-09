export type HiddenCourseMap = Record<string, boolean>;

export const normalizeHiddenCourses = (value: unknown): HiddenCourseMap => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, hidden]) => hidden === true),
  );
};

export const pruneHiddenCourses = (
  hiddenCourses: HiddenCourseMap,
  courses: Record<string, readonly string[]>,
): HiddenCourseMap => {
  const courseIds = new Set(Object.values(courses).flat());
  return Object.fromEntries(
    Object.entries(hiddenCourses).filter(
      ([courseId, hidden]) => hidden && courseIds.has(courseId),
    ),
  );
};

export const isCourseHidden = (
  courseId: string,
  hiddenCourses: HiddenCourseMap,
) => hiddenCourses[courseId] === true;

export const filterHiddenCourseIds = (
  courseIds: readonly string[],
  hiddenCourses: HiddenCourseMap,
) => courseIds.filter((courseId) => !isCourseHidden(courseId, hiddenCourses));

export const filterHiddenCourses = <T extends { raw_id: string }>(
  courses: readonly T[],
  hiddenCourses: HiddenCourseMap,
) => courses.filter((course) => !isCourseHidden(course.raw_id, hiddenCourses));
