export type FavouriteCourse = { raw_id: string };

export type FavouriteCourseItem<Course extends FavouriteCourse> =
  | { course: Course }
  | { raw_id: string; missing: true };

export const getFavouriteCourseItems = <Course extends FavouriteCourse>(
  favourites: readonly string[],
  courses: readonly Course[],
): FavouriteCourseItem<Course>[] => {
  const coursesById = new Map(courses.map((course) => [course.raw_id, course]));

  return favourites.map((raw_id) => {
    const course = coursesById.get(raw_id);
    return course ? { course } : { raw_id, missing: true as const };
  });
};
