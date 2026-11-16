import {
  COURSE_INSIGHT_SEMESTERS as semesterInfo,
  getCourseInsightBuildingDefinition,
} from "./course-insights-mirrors";

export interface CourseInsightHistoryRow {
  raw_id: string;
  semester: string;
  department: string;
  course: string;
  name_zh: string;
  name_en: string;
  capacity: number | null;
  enrolled: number | null;
  language: string | null;
}

export interface CourseInsightCurrentRow extends CourseInsightHistoryRow {
  times: string[] | null;
  venues: string[] | null;
}

export interface CourseInsightSnapshot {
  modules: number;
  sections: number;
  departments: number;
  seats: number;
  englishShare: number | null;
  averageClassSize: number | null;
}

export interface CourseInsightModule {
  key: string;
  department: string;
  course: string;
  nameZh: string;
  nameEn: string;
}

export interface CourseInsightsResponse {
  semester: string;
  comparisonSemester: string | null;
  snapshot: CourseInsightSnapshot;
  comparison: CourseInsightSnapshot | null;
  fullestCourses: {
    rawId: string;
    moduleKey: string;
    department: string;
    course: string;
    nameZh: string;
    nameEn: string;
    enrolled: number;
    capacity: number;
    fillRate: number;
  }[];
  departments: {
    department: string;
    sections: number;
    seats: number;
    fillRate: number | null;
  }[];
  schedule: {
    days: string[];
    periods: string[];
    counts: number[][];
  };
  newLookback: number;
  newModules: CourseInsightModule[];
  discontinuedModules: CourseInsightModule[];
  trends: {
    semester: string;
    modules: number;
    englishShare: number | null;
    averageClassSize: number | null;
  }[];
  buildings: {
    code: string;
    nameZh: string;
    nameEn: string;
    sections: number;
  }[];
}

const DAYS = ["M", "T", "W", "R", "F", "S", "U"];
const PERIODS = [
  "1",
  "2",
  "3",
  "4",
  "n",
  "5",
  "6",
  "7",
  "8",
  "9",
  "a",
  "b",
  "c",
  "d",
];
const FULLNESS_MINIMUM_CAPACITY = 30;
const TREND_SEMESTER_LIMIT = 8;
const NEW_MODULE_LOOKBACK = 4;
const TIME_CODE = /([MTWRFSU])([1-9nabcd])/gi;
const COURSE_TERM_CODES = ["10", "20", "30"] as const;
const FIRST_COURSE_SEMESTER = semesterInfo[0]?.id ?? "10810";

const getCourseSemestersThrough = (semester: string) => {
  const firstYear = Number(FIRST_COURSE_SEMESTER.slice(0, 3));
  const finalYear = Number(semester.slice(0, 3));
  const possibleSemesters = Array.from(
    {
      length: Math.max(
        0,
        (finalYear - firstYear + 1) * COURSE_TERM_CODES.length,
      ),
    },
    (_, index) =>
      `${String(firstYear + Math.floor(index / COURSE_TERM_CODES.length)).padStart(3, "0")}${COURSE_TERM_CODES[index % COURSE_TERM_CODES.length]}`,
  );

  return possibleSemesters.filter(
    (courseSemester) =>
      courseSemester >= FIRST_COURSE_SEMESTER && courseSemester <= semester,
  );
};

export const getCourseInsightHistorySemesters = (semester: string) =>
  getCourseSemestersThrough(semester)
    .filter((courseSemester) => courseSemester < semester)
    .slice(-(TREND_SEMESTER_LIMIT - 1));

const moduleKey = (
  row: Pick<CourseInsightHistoryRow, "department" | "course">,
) => `${row.department}:${row.course.replace(/\s+/g, "")}`;

const isEnglish = (language: string | null) => {
  const normalized = language?.trim().toLocaleLowerCase("en");
  return normalized === "英" || normalized === "english" || normalized === "en";
};

const knownNumber = (value: number | null): value is number =>
  typeof value === "number" && Number.isFinite(value);

const countDemand = (rows: readonly CourseInsightHistoryRow[]) => {
  let enrolled = 0;
  let capacity = 0;
  let sections = 0;
  for (const row of rows) {
    // Keep the module insights definition: zero enrollment or capacity means
    // there is no published fill-rate observation for this section.
    if (!row.capacity || !row.enrolled) continue;
    enrolled += row.enrolled;
    capacity += row.capacity;
    sections += 1;
  }
  return { enrolled, capacity, sections };
};

export const summarizeCourseRows = (
  rows: readonly CourseInsightHistoryRow[],
): CourseInsightSnapshot => {
  const moduleKeys = new Set(rows.map(moduleKey));
  const departmentCodes = new Set(rows.map((row) => row.department));
  const englishSections = rows.filter((row) => isEnglish(row.language)).length;
  const seatTotal = rows.reduce(
    (sum, row) => sum + (row.capacity && row.capacity > 0 ? row.capacity : 0),
    0,
  );
  const sizeRows = rows.filter(
    (row) => knownNumber(row.enrolled) && row.enrolled > 0,
  );

  return {
    modules: moduleKeys.size,
    sections: rows.length,
    departments: departmentCodes.size,
    seats: seatTotal,
    englishShare: rows.length > 0 ? englishSections / rows.length : null,
    averageClassSize:
      sizeRows.length > 0
        ? sizeRows.reduce((sum, row) => sum + row.enrolled!, 0) /
          sizeRows.length
        : null,
  };
};

const summarizeModules = (rows: readonly CourseInsightHistoryRow[]) => {
  const modules = new Map<string, CourseInsightModule>();
  for (const row of rows) {
    const key = moduleKey(row);
    if (!modules.has(key)) {
      modules.set(key, {
        key,
        department: row.department,
        course: row.course,
        nameZh: row.name_zh,
        nameEn: row.name_en,
      });
    }
  }
  return modules;
};

const compareModules = (
  left: CourseInsightModule,
  right: CourseInsightModule,
) =>
  left.department.localeCompare(right.department) ||
  left.course.localeCompare(right.course);

const getComparisonSemester = (semester: string) => {
  const comparisonYear = Number(semester.slice(0, 3)) - 1;
  if (comparisonYear < Number(FIRST_COURSE_SEMESTER.slice(0, 3))) return null;
  return `${String(comparisonYear).padStart(3, "0")}${semester.slice(3)}`;
};

const getDepartmentDemand = (rows: readonly CourseInsightCurrentRow[]) => {
  const rowsByDepartment = new Map<string, CourseInsightCurrentRow[]>();
  for (const row of rows) {
    const departmentRows = rowsByDepartment.get(row.department) ?? [];
    departmentRows.push(row);
    rowsByDepartment.set(row.department, departmentRows);
  }

  return [...rowsByDepartment.entries()]
    .map(([department, departmentRows]) => {
      const demand = countDemand(departmentRows);
      return {
        department,
        sections: departmentRows.length,
        seats: departmentRows.reduce(
          (sum, row) =>
            sum + (row.capacity && row.capacity > 0 ? row.capacity : 0),
          0,
        ),
        fillRate:
          demand.capacity > 0 ? demand.enrolled / demand.capacity : null,
      };
    })
    .sort(
      (left, right) =>
        right.seats - left.seats ||
        right.sections - left.sections ||
        left.department.localeCompare(right.department),
    );
};

const getScheduleCounts = (rows: readonly CourseInsightCurrentRow[]) => {
  const counts = DAYS.map(() => PERIODS.map(() => 0));
  const dayIndexes = new Map(DAYS.map((day, index) => [day, index]));
  const periodIndexes = new Map(
    PERIODS.map((period, index) => [period, index]),
  );

  for (const row of rows) {
    const slots = new Set<string>();
    for (const time of row.times ?? []) {
      for (const match of time.matchAll(TIME_CODE)) {
        slots.add(`${match[1]!.toUpperCase()}${match[2]!.toLowerCase()}`);
      }
    }
    for (const slot of slots) {
      const dayIndex = dayIndexes.get(slot[0]!);
      const periodIndex = periodIndexes.get(slot[1]!);
      if (dayIndex !== undefined && periodIndex !== undefined) {
        counts[dayIndex]![periodIndex]! += 1;
      }
    }
  }

  return { days: DAYS, periods: PERIODS, counts };
};

const getBuildingDemand = (rows: readonly CourseInsightCurrentRow[]) => {
  const sectionsByBuilding = new Map<
    string,
    { code: string; nameZh: string; nameEn: string; sections: number }
  >();

  for (const row of rows) {
    const buildings = new Map<
      string,
      NonNullable<ReturnType<typeof getCourseInsightBuildingDefinition>>
    >();
    for (const venue of row.venues ?? []) {
      const definition = getCourseInsightBuildingDefinition(venue);
      if (definition && definition.code !== "VC") {
        buildings.set(definition.code, definition);
      }
    }
    for (const [code, definition] of buildings) {
      const item = sectionsByBuilding.get(code) ?? {
        code,
        nameZh: definition.nameZh,
        nameEn: definition.nameEn,
        sections: 0,
      };
      item.sections += 1;
      sectionsByBuilding.set(code, item);
    }
  }

  return [...sectionsByBuilding.values()].sort(
    (left, right) =>
      right.sections - left.sections || left.code.localeCompare(right.code),
  );
};

export const buildCourseInsights = (
  semester: string,
  historyRows: readonly CourseInsightHistoryRow[],
  currentRows: readonly CourseInsightCurrentRow[],
): CourseInsightsResponse => {
  const comparisonSemester = getComparisonSemester(semester);
  const comparisonRows = comparisonSemester
    ? historyRows.filter((row) => row.semester === comparisonSemester)
    : [];
  const comparison =
    comparisonSemester && comparisonRows.length > 0
      ? summarizeCourseRows(comparisonRows)
      : null;
  const priorSemesters = semesterInfo
    .filter((item) => item.id < semester)
    .map((item) => item.id)
    .slice(-NEW_MODULE_LOOKBACK);
  const semestersWithRows = new Set(historyRows.map((row) => row.semester));
  const coveredPriorSemesters = priorSemesters.filter((item) =>
    semestersWithRows.has(item),
  );
  const priorSemesterIds = new Set<string>(coveredPriorSemesters);
  const previousModules = summarizeModules(
    historyRows.filter((row) => priorSemesterIds.has(row.semester)),
  );
  const currentModules = summarizeModules(currentRows);
  const newModules =
    coveredPriorSemesters.length === NEW_MODULE_LOOKBACK
      ? [...currentModules.values()]
          .filter((item) => !previousModules.has(item.key))
          .sort(compareModules)
      : [];
  const comparisonModules = summarizeModules(comparisonRows);
  const discontinuedModules = [...comparisonModules.values()]
    .filter((item) => !currentModules.has(item.key))
    .sort(compareModules);
  const trendSemesters =
    getCourseSemestersThrough(semester).slice(-TREND_SEMESTER_LIMIT);
  const trendSemesterIds = new Set<string>(trendSemesters);
  const rowsBySemester = new Map<string, CourseInsightHistoryRow[]>();
  for (const row of [...historyRows, ...currentRows]) {
    if (!trendSemesterIds.has(row.semester)) continue;
    const semesterRows = rowsBySemester.get(row.semester) ?? [];
    semesterRows.push(row);
    rowsBySemester.set(row.semester, semesterRows);
  }
  const trends = trendSemesters.flatMap((trendSemester) => {
    const rows = rowsBySemester.get(trendSemester);
    if (!rows?.length) return [];
    const snapshot = summarizeCourseRows(rows);
    return [
      {
        semester: trendSemester,
        modules: snapshot.modules,
        englishShare: snapshot.englishShare,
        averageClassSize: snapshot.averageClassSize,
      },
    ];
  });
  const fullestCourses = currentRows
    .filter(
      (row) =>
        knownNumber(row.enrolled) &&
        row.enrolled > 0 &&
        knownNumber(row.capacity) &&
        row.capacity >= FULLNESS_MINIMUM_CAPACITY,
    )
    .map((row) => ({
      rawId: row.raw_id,
      moduleKey: moduleKey(row),
      department: row.department,
      course: row.course,
      nameZh: row.name_zh,
      nameEn: row.name_en,
      enrolled: row.enrolled!,
      capacity: row.capacity!,
      fillRate: row.enrolled! / row.capacity!,
    }))
    .sort(
      (left, right) =>
        right.fillRate - left.fillRate || left.rawId.localeCompare(right.rawId),
    )
    .slice(0, 10);

  return {
    semester,
    comparisonSemester,
    snapshot: summarizeCourseRows(currentRows),
    comparison,
    fullestCourses,
    departments: getDepartmentDemand(currentRows),
    schedule: getScheduleCounts(currentRows),
    newLookback: coveredPriorSemesters.length,
    newModules,
    discontinuedModules,
    trends,
    buildings: getBuildingDemand(currentRows),
  };
};
