export type AcademicCalendarEvent = {
  id: string;
  summary: string;
  date: string;
};

export type CourseSelectionPeriod = {
  id: string;
  semester: string;
  startDate: string;
  endDate: string;
  sourceSummary: string;
};

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isDateKey = (value: string) => {
  if (!DATE_KEY_PATTERN.test(value)) return false;
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

const inferSemester = (summary: string, startDate: string) => {
  const academicYear = summary.match(/(\d{3})學年度/)?.[1];
  const explicitTerm = summary.match(/第([12])學期/)?.[1];
  const [, , month] = DATE_KEY_PATTERN.exec(startDate) ?? [];
  if (!month) return null;

  const term = explicitTerm ?? (Number(month) >= 8 ? "1" : "2");
  const gregorianYear = Number(startDate.slice(0, 4));
  const inferredYear =
    Number(month) >= 8 ? gregorianYear - 1911 : gregorianYear - 1912;
  return `${academicYear ?? inferredYear}${term}0`;
};

const isSelectionSummary = (summary: string) =>
  /選課|加退選|課程停修|course\s+selection|add\s*-?or\s*-?drop\s+selection|course\s+withdrawal|inter\s*-?school\s+selection/i.test(
    summary,
  );

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

export const parseCourseSelectionPeriods = (
  events: AcademicCalendarEvent[],
): CourseSelectionPeriod[] =>
  events.flatMap((event) => {
    if (
      !isSelectionSummary(event.summary) ||
      isSummerSessionSummary(event.summary)
    )
      return [];
    const range = getDateRange(event);
    if (!range) return [];
    const semester = inferSemester(event.summary, range.startDate);
    if (!semester) return [];
    return [
      {
        id: `course-selection:${event.id}`,
        semester,
        ...range,
        sourceSummary: event.summary,
      },
    ];
  });
