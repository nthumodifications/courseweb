export type CourseSelectionPhase =
  | "round-1"
  | "round-2"
  | "round-3"
  | "new-students"
  | "add-drop"
  | "inter-school"
  | "withdrawal";

export type CourseSelectionAudience =
  | "new-students"
  | "inter-school"
  | "unspecified";

export type CourseSelectionPeriod = {
  id: string;
  semester: string;
  phase: CourseSelectionPhase;
  audience: CourseSelectionAudience;
  startDate: string;
  endDate: string;
  sourceEventId: string;
  sourceSummary: string;
};

export type AcademicCalendarEvent = {
  id: string;
  summary: string;
  date: string;
  courseSelectionPeriod?: CourseSelectionPeriod | null;
};

export type CourseSelectionState = {
  current: CourseSelectionPeriod[];
  next: CourseSelectionPeriod | null;
};

export const getCourseSelectionCalendarRange = (nowDateKey: string) => {
  const calendarYear = Number(nowDateKey.slice(0, 4));

  return {
    startDateKey: `${calendarYear}-05-01`,
    endDateKey: `${calendarYear + 1}-03-01`,
  };
};

export const parseCourseSelectionPeriod = (
  event: AcademicCalendarEvent,
): CourseSelectionPeriod | null => event.courseSelectionPeriod ?? null;

export const parseCourseSelectionPeriods = (events: AcademicCalendarEvent[]) =>
  events.flatMap((event) => parseCourseSelectionPeriod(event) ?? []);

const dateKeyToUtc = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00Z`).getTime();

export const getCourseSelectionState = (
  periods: CourseSelectionPeriod[],
  semester: string,
  nowDateKey: string,
): CourseSelectionState => {
  const semesterPeriods = periods
    .filter((period) => period.semester === semester)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const current = semesterPeriods.filter(
    (period) => period.startDate <= nowDateKey && period.endDate >= nowDateKey,
  );
  const next =
    semesterPeriods.find(
      (period) =>
        period.startDate > nowDateKey &&
        daysUntilCourseSelection(period.startDate, nowDateKey) <= 14,
    ) ?? null;

  return { current, next };
};

export const daysUntilCourseSelection = (
  startDate: string,
  nowDateKey: string,
) =>
  Math.ceil((dateKeyToUtc(startDate) - dateKeyToUtc(nowDateKey)) / 86_400_000);
