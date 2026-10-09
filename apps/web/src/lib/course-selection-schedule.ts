import {
  daysUntilCourseSelection,
  type CourseSelectionPeriod,
} from "@/lib/course-selection-periods";

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

const sortInProgressPeriods = (periods: CourseSelectionPeriod[]) =>
  [...periods].sort(
    (a, b) =>
      a.endDate.localeCompare(b.endDate) ||
      a.startDate.localeCompare(b.startDate) ||
      a.id.localeCompare(b.id),
  );

export const getCourseSelectionPhaseToHighlight = (
  periods: CourseSelectionPeriod[],
  dateKey: string,
) => {
  const sortedPeriods = sortCourseSelectionPeriods(periods);
  const inProgress = sortInProgressPeriods(
    sortedPeriods.filter(
      (period) =>
        getCourseSelectionPhaseStatus(period, dateKey) === "in-progress",
    ),
  );

  return (
    inProgress[0] ??
    sortedPeriods.find(
      (period) => getCourseSelectionPhaseStatus(period, dateKey) === "upcoming",
    ) ??
    null
  );
};

export const getCourseSelectionBarPeriod = (
  periods: CourseSelectionPeriod[],
  dateKey: string,
  dismissedPeriodIds: string[] = [],
) => {
  const dismissed = new Set(dismissedPeriodIds);
  const qualifyingPeriods = periods.filter((period) => {
    if (dismissed.has(period.id)) return false;
    const status = getCourseSelectionPhaseStatus(period, dateKey);
    if (status === "in-progress") return true;
    return (
      status === "upcoming" &&
      daysUntilCourseSelection(period.startDate, dateKey) <= 7
    );
  });
  const inProgress = sortInProgressPeriods(
    qualifyingPeriods.filter(
      (period) =>
        getCourseSelectionPhaseStatus(period, dateKey) === "in-progress",
    ),
  );

  return (
    inProgress[0] ??
    sortCourseSelectionPeriods(
      qualifyingPeriods.filter(
        (period) =>
          getCourseSelectionPhaseStatus(period, dateKey) === "upcoming",
      ),
    )[0] ??
    null
  );
};

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
  const current = getCourseSelectionPhaseToHighlight(sortedPeriods, dateKey);
  const upcoming = sortedPeriods.filter(
    (period) => getCourseSelectionPhaseStatus(period, dateKey) === "upcoming",
  );

  return [
    ...(current &&
    getCourseSelectionPhaseStatus(current, dateKey) === "in-progress"
      ? [current]
      : []),
    ...upcoming.slice(0, 2),
  ];
};
