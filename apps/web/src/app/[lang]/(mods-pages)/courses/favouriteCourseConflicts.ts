import { createTimetableFromCourses } from "@/helpers/timetable";
import type { MinimalCourse } from "@/types/courses";

/** Return selected courses that overlap this favourite in the same semester. */
export const getFavouriteCourseConflicts = (
  favourite: MinimalCourse,
  selectedCourses: MinimalCourse[],
) => {
  const favouriteSlots = createTimetableFromCourses([favourite]);
  const otherCourses = selectedCourses.filter(
    (course) =>
      course.raw_id !== favourite.raw_id &&
      course.semester === favourite.semester,
  );
  const otherSlots = createTimetableFromCourses(otherCourses);
  const conflictingIds = new Set(
    otherSlots
      .filter((other) =>
        favouriteSlots.some(
          (slot) =>
            slot.dayOfWeek === other.dayOfWeek &&
            slot.startTime <= other.endTime &&
            slot.endTime >= other.startTime,
        ),
      )
      .map((slot) => slot.course.raw_id),
  );

  return otherCourses.filter((course) => conflictingIds.has(course.raw_id));
};
