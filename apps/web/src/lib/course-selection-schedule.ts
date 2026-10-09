import { type CourseSelectionPeriod } from "@/lib/course-selection-periods";

export type CourseSelectionPhaseStatus =
  | "finished"
  | "in-progress"
  | "upcoming";

export const getCourseSelectionPhaseStatus = (
  period: CourseSelectionPeriod,
  dateKey: string,
): CourseSelectionPhaseStatus => {
  if (dateKey < period.startDate) return "upcoming";
  if (dateKey <= period.endDate) return "in-progress";
  return "finished";
};

export const sortCourseSelectionPeriods = (periods: CourseSelectionPeriod[]) =>
  [...periods].sort(
    // Keep same-day phases deterministic, with add-drop before inter-school.
    (a, b) =>
      a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
  );

export const getCourseSelectionSchedule = (
  periods: CourseSelectionPeriod[],
  semester: string,
) => {
  const selectedPeriods = periods.filter(
    (period) => period.semester === semester,
  );
  if (selectedPeriods.length > 0) {
    return { semester, periods: sortCourseSelectionPeriods(selectedPeriods) };
  }

  const fallbackSemester = [
    ...new Set(periods.map((period) => period.semester)),
  ]
    .sort((a, b) => b.localeCompare(a))
    .at(0);

  return {
    semester: fallbackSemester ?? semester,
    periods: fallbackSemester
      ? sortCourseSelectionPeriods(
          periods.filter((period) => period.semester === fallbackSemester),
        )
      : [],
  };
};

export const getCompactCourseSelectionPeriods = (
  periods: CourseSelectionPeriod[],
  dateKey: string,
) => {
  const sortedPeriods = sortCourseSelectionPeriods(periods);
  const current = sortedPeriods.find(
    (period) =>
      getCourseSelectionPhaseStatus(period, dateKey) === "in-progress",
  );
  const upcoming = sortedPeriods.filter(
    (period) => getCourseSelectionPhaseStatus(period, dateKey) === "upcoming",
  );

  return [...(current ? [current] : []), ...upcoming.slice(0, 2)];
};
