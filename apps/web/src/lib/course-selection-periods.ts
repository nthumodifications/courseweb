export type AcademicCalendarEvent = {
  id: string;
  summary: string;
  date: string;
};

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

export type CourseSelectionState = {
  current: CourseSelectionPeriod[];
  next: CourseSelectionPeriod | null;
};

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isDateKey = (value: string) => {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const toDateKey = (year: number, month: number, day: number) => {
  const value = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return isDateKey(value) ? value : null;
};

const dateKeyToUtc = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00Z`).getTime();

const inferSemester = (summary: string, startDate: string) => {
  const year = summary.match(/(\d{3})學年度/)?.[1];
  const explicitTerm = summary.match(/第([12])學期/)?.[1];
  const [, , month] = DATE_KEY_PATTERN.exec(startDate) ?? [];

  if (!month) return null;

  // Some calendar entries, such as inter-school selection, omit the academic
  // year. NTHU's fall term starts in August and its spring term starts in
  // February, so the published event date is enough to identify that term.
  const term = explicitTerm ?? (Number(month) >= 8 ? "1" : "2");
  const gregorianYear = Number(startDate.slice(0, 4));
  const inferredYear =
    Number(month) >= 8 ? gregorianYear - 1911 : gregorianYear - 1912;
  return `${year ?? inferredYear}${term}0`;
};

const phaseFromSummary = (
  summary: string,
): Pick<CourseSelectionPeriod, "phase" | "audience"> | null => {
  if (/加退選|add\s*-?or\s*-?drop\s+selection/i.test(summary)) {
    return { phase: "add-drop", audience: "unspecified" };
  }

  if (/課程停修|course\s+withdrawal/i.test(summary)) {
    return { phase: "withdrawal", audience: "unspecified" };
  }

  if (/校際選課|inter\s*-?school\s+selection/i.test(summary)) {
    return { phase: "inter-school", audience: "inter-school" };
  }

  if (
    /新生|轉學生|new\s+students?|transfer\s+students?/i.test(summary) &&
    /選課|course\s+selection/i.test(summary)
  ) {
    return { phase: "new-students", audience: "new-students" };
  }

  const round =
    summary.match(/第([123])次選課/)?.[1] ??
    summary.match(/\b(1st|2nd|3rd)\s+course\s+selection/i)?.[1]?.[0];
  if (round) {
    return {
      phase: `round-${round}` as CourseSelectionPhase,
      audience: "unspecified",
    };
  }

  return null;
};

const isSummerSessionSummary = (summary: string) =>
  /暑期班|summer\s+session/i.test(summary);

const getDateRange = (event: AcademicCalendarEvent) => {
  if (!isDateKey(event.date)) return null;

  const [, yearString, monthString] = DATE_KEY_PATTERN.exec(event.date)!;
  const year = Number(yearString);
  const eventMonth = Number(monthString);
  const range = event.summary.match(
    /[(（](\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})[)）]/,
  );
  const chineseEnd = event.summary.match(
    /至\s*(?:(\d{1,2})\s*月)?\s*(\d{1,2})\s*日\s*止/,
  );

  if (range) {
    const startMonth = Number(range[1]);
    const startDate = toDateKey(year, startMonth, Number(range[2]));
    const endMonth = Number(range[3]);
    const endYear = endMonth < startMonth ? year + 1 : year;
    const endDate = toDateKey(endYear, endMonth, Number(range[4]));
    if (startDate && endDate && endDate >= startDate) {
      return { startDate, endDate };
    }
  }

  if (chineseEnd) {
    const endMonth = Number(chineseEnd[1] ?? eventMonth);
    const endYear = endMonth < eventMonth ? year + 1 : year;
    const endDate = toDateKey(endYear, endMonth, Number(chineseEnd[2]));
    if (endDate && endDate >= event.date) {
      return { startDate: event.date, endDate };
    }
  }

  return { startDate: event.date, endDate: event.date };
};

/**
 * The academic-calendar API is the source of truth. Its contract currently
 * exposes a start date and bilingual summary, so the end date is parsed from
 * the registrar's date range in that summary. No semester dates are stored in
 * this module.
 */
export const parseCourseSelectionPeriod = (
  event: AcademicCalendarEvent,
): CourseSelectionPeriod | null => {
  if (isSummerSessionSummary(event.summary)) return null;
  const phase = phaseFromSummary(event.summary);
  const dateRange = getDateRange(event);
  if (!phase || !dateRange) return null;

  const semester = inferSemester(event.summary, dateRange.startDate);
  if (!semester) return null;

  return {
    id: `course-selection:${event.id}`,
    semester,
    ...phase,
    ...dateRange,
    sourceEventId: event.id,
    sourceSummary: event.summary,
  };
};

export const parseCourseSelectionPeriods = (events: AcademicCalendarEvent[]) =>
  events.flatMap((event) => parseCourseSelectionPeriod(event) ?? []);

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
