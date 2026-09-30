import type { FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";
import type { Context } from "hono";
import acaCalendar from "../aca-calendar";
import bus from "../bus";
import supabase_server from "../config/supabase_server";
import { getAlgoliaClients, isAlgoliaUnusableError } from "../config/algolia";
import sports from "../sports";
import searchFallback from "../search-fallback";
import weather from "../weather";
import {
  findFreePeriods,
  findTimetableConflicts,
  getOccupiedSlots,
  groupSlotsByDay,
  parseTimeSlots,
  trimList,
  trimText,
  type TimedCourse,
} from "./tools/schedule";
import type { UserContext } from "./types";
import {
  getCachedRequirements,
  setCachedRequirements,
} from "../graduation/cache";
import { findRequirementsPDF, scrapeAllColleges } from "../graduation/scraper";

const MAX_RESULT_ITEMS = 15;
const SEARCH_ATTRIBUTES = [
  "raw_id",
  "objectID",
  "course",
  "department",
  "class",
  "name_zh",
  "name_en",
  "teacher_zh",
  "teacher_en",
  "credits",
  "times",
  "venues",
  "language",
  "semester",
  "brief",
  "keywords",
  "restrictions",
  "note",
  "prerequisites",
  "capacity",
  "enrolled",
  "closed_mark",
  "cross_discipline",
  "ge_type",
  "ge_target",
];

type UnknownRecord = Record<string, unknown>;

type SearchResult = {
  hits?: unknown[];
  nbHits?: number;
};

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asStringArray = (value: unknown, max = 8) =>
  trimList(
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    max,
  );

const asPositiveLimit = (
  value: unknown,
  fallback: number,
  max = MAX_RESULT_ITEMS,
) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
};

const currentTaipeiDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      weekday: "long",
    })
      .format(date)
      .toLocaleLowerCase(),
  };
};

/** NTHU first semester is August through January; second is February through July. */
export const getCurrentSemester = (date = new Date()) => {
  const { year, month } = currentTaipeiDateParts(date);
  const academicYear = month >= 8 ? year - 1911 : year - 1912;
  return `${academicYear}${month >= 8 || month === 1 ? "10" : "20"}`;
};

const quoteFilterValue = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const buildCourseFilters = (semester?: string, department?: string) =>
  [
    semester && `semester:"${quoteFilterValue(semester)}"`,
    department && `department:"${quoteFilterValue(department)}"`,
  ]
    .filter((filter): filter is string => Boolean(filter))
    .join(" AND ");

const toCourseSummary = (
  value: unknown,
  briefLength = 450,
): UnknownRecord => {
  const course = asRecord(value);
  const result: UnknownRecord = {
    raw_id: course.raw_id ?? course.objectID,
    course: course.course,
    department: course.department,
    class: course.class,
    name_zh: trimText(course.name_zh, 180),
    name_en: trimText(course.name_en, 180),
    teacher_zh: asStringArray(course.teacher_zh),
    teacher_en: asStringArray(course.teacher_en),
    credits: course.credits,
    times: asStringArray(course.times, 12),
    venues: asStringArray(course.venues, 8),
    language: course.language,
    semester: course.semester,
    capacity: course.capacity,
    enrolled: course.enrolled,
    closed_mark: course.closed_mark,
    restrictions: trimText(course.restrictions, 500),
    note: trimText(course.note, 500),
    prerequisites: trimText(course.prerequisites, 500),
    cross_discipline: asStringArray(course.cross_discipline),
    ge_type: course.ge_type,
    ge_target: course.ge_target,
  };

  const brief = trimText(course.brief, briefLength);
  if (brief) result.brief = brief;
  const keywords = asStringArray(course.keywords, 12);
  if (keywords.length > 0) result.keywords = keywords;
  return result;
};

const requestJson = async (
  subApp: unknown,
  path: string,
  c: Context,
): Promise<unknown> => {
  const requestApp = subApp as {
    request: (
      input: string,
      init?: RequestInit,
      env?: unknown,
    ) => Response | Promise<Response>;
  };
  const response = await requestApp.request(path, {}, c.env);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = asRecord(payload);
    const error = details.error;
    throw new Error(
      typeof error === "string"
        ? error
        : `Upstream request failed (${response.status})`,
    );
  }
  return payload;
};

const searchWithFallback = async (
  c: Context,
  query: string,
  fetchLimit: number,
  semester?: string,
  department?: string,
): Promise<SearchResult> => {
  const filters = buildCourseFilters(semester, department);
  let lastError: unknown;

  for (const index of getAlgoliaClients(c)) {
    try {
      return (await index.search(query, {
        hitsPerPage: fetchLimit,
        attributesToRetrieve: SEARCH_ATTRIBUTES,
        filters: filters || undefined,
      })) as SearchResult;
    } catch (error) {
      lastError = error;
      if (!isAlgoliaUnusableError(error)) throw error;
    }
  }

  const params = new URLSearchParams({
    q: query,
    hitsPerPage: String(fetchLimit),
    attributesToRetrieve: JSON.stringify(SEARCH_ATTRIBUTES),
  });
  if (filters) params.set("filters", filters);

  try {
    const payload = asRecord(
      await requestJson(searchFallback, `/?${params.toString()}`, c),
    );
    const data = asRecord(payload.data);
    return {
      hits: Array.isArray(data.hits) ? data.hits : [],
      nbHits: typeof data.nbHits === "number" ? data.nbHits : undefined,
    };
  } catch (fallbackError) {
    throw new Error(
      `Course search unavailable: ${
        fallbackError instanceof Error
          ? fallbackError.message
          : lastError instanceof Error
            ? lastError.message
            : "unknown error"
      }`,
    );
  }
};

const searchCourses = async (
  c: Context,
  query: string,
  limit = MAX_RESULT_ITEMS,
  semester?: string,
  department?: string,
): Promise<UnknownRecord> => {
  const outputLimit = asPositiveLimit(limit, 10);
  const result = await searchWithFallback(
    c,
    query.trim(),
    Math.max(outputLimit, 15),
    semester,
    department,
  );
  const hits = trimList(result.hits ?? [], outputLimit).map((hit) =>
    toCourseSummary(hit, 450),
  );
  return {
    query,
    semester: semester ?? null,
    total: result.nbHits ?? result.hits?.length ?? 0,
    courses: hits,
    note: "Use raw_id with get_course_details for more information",
  };
};

const getCourseDetails = async (
  c: Context,
  courseId: string,
): Promise<UnknownRecord> => {
  const { data, error } = await supabase_server(c)
    .from("courses")
    .select("*, course_syllabus(*)")
    .eq("raw_id", courseId)
    .limit(1);

  if (error) throw new Error(`Failed to fetch course: ${error.message}`);
  const course = data?.[0] as unknown as
    | (UnknownRecord & {
        course_syllabus?: UnknownRecord | UnknownRecord[] | null;
      })
    | undefined;
  if (!course) throw new Error(`Course not found: ${courseId}`);

  const result = toCourseSummary(course, 900);
  result.raw_id = course.raw_id;
  result.compulsory_for = asStringArray(course.compulsory_for, 12);
  result.elective_for = asStringArray(course.elective_for, 12);
  result.first_specialization = asStringArray(course.first_specialization, 12);
  result.second_specialization = asStringArray(
    course.second_specialization,
    12,
  );
  result.reserve = course.reserve;

  const syllabusValue = course.course_syllabus;
  const syllabus = Array.isArray(syllabusValue)
    ? syllabusValue[0]
    : syllabusValue && typeof syllabusValue === "object"
      ? syllabusValue
      : undefined;
  if (syllabus) {
    result.syllabus = {
      brief: trimText(syllabus.brief, 1200),
      keywords: asStringArray(syllabus.keywords, 12),
      objectives: trimText(syllabus.objectives, 1200),
      description: trimText(syllabus.content, 1400),
      requirements: trimText(syllabus.requirements, 900),
    };
  }
  return result;
};

const currentCourses = (userContext: UserContext | undefined, semester: string) =>
  trimList(
    (userContext?.selectedCourses ?? []).filter(
      (course) => !course.semester || course.semester === semester,
    ),
    50,
  );

const findFreeCourses = async (
  c: Context,
  args: Record<string, unknown>,
  userContext: UserContext | undefined,
) => {
  const semester =
    (typeof args.semester === "string" && args.semester) ||
    userContext?.currentSemester ||
    getCurrentSemester();
  const selected = currentCourses(userContext, semester);
  const occupied = getOccupiedSlots(selected);
  const limit = asPositiveLimit(args.limit, 10);
  const result = await searchWithFallback(
    c,
    typeof args.query === "string" ? args.query.trim() : "",
    50,
    semester,
    typeof args.department === "string" ? args.department : undefined,
  );
  const courses = (result.hits ?? [])
    .map(toCourseSummary)
    .filter((course) => {
      const slots = parseTimeSlots(
        Array.isArray(course.times)
          ? course.times.filter(
              (time): time is string => typeof time === "string",
            )
          : [],
      );
      return slots.length > 0 && !slots.some((slot) => occupied.includes(slot));
    })
    .slice(0, limit);

  return {
    semester,
    occupiedPeriods: trimList(occupied, MAX_RESULT_ITEMS),
    occupiedPeriodCount: occupied.length,
    freePeriodsByDay: groupSlotsByDay(findFreePeriods(occupied)),
    matchingCourses: courses,
    totalMatches: result.nbHits ?? result.hits?.length ?? 0,
    note:
      selected.length === 0
        ? "No selected timetable was supplied; these courses have known timetable slots."
        : "Courses overlap none of the selected courses' known timetable slots.",
  };
};

const checkConflicts = async (
  c: Context,
  args: Record<string, unknown>,
  userContext: UserContext | undefined,
) => {
  const courseIds = trimList(
    Array.isArray(args.courseIds)
      ? args.courseIds.filter((id): id is string => typeof id === "string")
      : [],
    MAX_RESULT_ITEMS,
  );
  if (courseIds.length === 0)
    throw new Error("courseIds must contain at least one raw_id");

  const { data, error } = await supabase_server(c)
    .from("courses")
    .select("raw_id,name_zh,name_en,times,semester,credits,venues")
    .in("raw_id", courseIds);
  if (error) throw new Error(`Failed to fetch courses: ${error.message}`);

  const rows = (data ?? []) as Array<UnknownRecord & { raw_id: string }>;
  const foundIds = new Set(rows.map((row) => row.raw_id));
  const semester =
    (typeof args.semester === "string" && args.semester) ||
    userContext?.currentSemester ||
    getCurrentSemester();
  const selected = currentCourses(userContext, semester).filter(
    (course) => !courseIds.includes(course.raw_id),
  );
  const candidates = rows.map((row) => ({
    raw_id: row.raw_id,
    name_zh: typeof row.name_zh === "string" ? row.name_zh : undefined,
    name_en: typeof row.name_en === "string" ? row.name_en : undefined,
    times: Array.isArray(row.times)
      ? row.times.filter((time): time is string => typeof time === "string")
      : [],
  }));
  const conflicts = findTimetableConflicts([
    ...selected,
    ...candidates,
  ] as TimedCourse[]).filter(
    (conflict) =>
      courseIds.includes(conflict.first) || courseIds.includes(conflict.second),
  );

  return {
    semester,
    courses: candidates.map((course) => ({
      raw_id: course.raw_id,
      name_zh: course.name_zh,
      name_en: course.name_en,
      times: parseTimeSlots(course.times),
      conflicts: conflicts.filter(
        (conflict) =>
          conflict.first === course.raw_id || conflict.second === course.raw_id,
      ),
    })),
    conflicts,
    missingCourseIds: courseIds.filter((id) => !foundIds.has(id)),
    checkedAgainstSelectedCourses: trimList(
      selected.map((course) => course.raw_id),
      MAX_RESULT_ITEMS,
    ),
    selectedCourseCount: selected.length,
    unknownTimeCourseIds: trimList(
      [...selected, ...candidates]
        .filter((course) => parseTimeSlots(course.times).length === 0)
        .map((course) => course.raw_id),
      MAX_RESULT_ITEMS,
    ),
  };
};

const getCalendar = async (c: Context, args: Record<string, unknown>) => {
  const { year, month } = currentTaipeiDateParts();
  const startYear = month >= 8 ? year : year - 1;
  const startDate =
    typeof args.startDate === "string" && args.startDate
      ? args.startDate
      : `${startYear}-08-01`;
  const endDate =
    typeof args.endDate === "string" && args.endDate
      ? args.endDate
      : `${startYear + 1}-07-31`;
  const params = new URLSearchParams({ start: startDate, end: endDate });
  const payload = await requestJson(acaCalendar, `/?${params.toString()}`, c);
  const events = Array.isArray(payload) ? payload : [];
  return {
    startDate,
    endDate,
    events: trimList(events, MAX_RESULT_ITEMS).map((event) => {
      const item = asRecord(event);
      return {
        date: item.date,
        summary: trimText(item.summary, 300),
        id: item.id,
      };
    }),
  };
};

const getBusDepartures = async (c: Context, args: Record<string, unknown>) => {
  const busType = typeof args.busType === "string" ? args.busType : "all";
  const direction = typeof args.direction === "string" ? args.direction : "up";
  const day = typeof args.day === "string" ? args.day : "current";
  const limit = asPositiveLimit(args.limit, 10);
  const params = new URLSearchParams({
    bus_type: busType,
    direction,
    day,
  });
  const payload = await requestJson(bus, `/schedules?${params.toString()}`, c);
  const departures = Array.isArray(payload) ? payload : [];
  return {
    busType,
    direction,
    day,
    departures: trimList(departures, limit).map((departure) => {
      const item = asRecord(departure);
      return {
        time: item.time,
        route: item.route,
        line: item.line,
        type: item.type,
        dep_stop: item.dep_stop,
        description: trimText(item.description, 240),
      };
    }),
  };
};

const semesterLabel = (semester: string) =>
  semester.endsWith("10")
    ? "上學期"
    : semester.endsWith("20")
      ? "下學期"
      : undefined;

const getSportsOpeningTimes = async (
  c: Context,
  args: Record<string, unknown>,
) => {
  const payload = asRecord(await requestJson(sports, "/opening-times", c));
  const requested =
    typeof args.facility === "string"
      ? args.facility.trim().toLocaleLowerCase()
      : "";
  const semester =
    typeof args.semester === "string" && args.semester
      ? semesterLabel(args.semester) ?? args.semester
      : semesterLabel(getCurrentSemester()) ?? "上學期";
  const today = currentTaipeiDateParts().weekday;
  const facilities = Array.isArray(payload.facilities) ? payload.facilities : [];
  const selected = facilities.filter((facility) => {
    if (!requested) return true;
    const item = asRecord(facility);
    return [item.name_zh, item.name_en]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(requested));
  });

  return {
    semester,
    day: today,
    lastUpdated: payload.lastUpdated,
    facilities: trimList(selected, MAX_RESULT_ITEMS).map((facility) => {
      const item = asRecord(facility);
      const schedules = Array.isArray(item.schedules) ? item.schedules : [];
      const schedule =
        schedules.find((candidate) => asRecord(candidate).semester === semester) ??
        schedules[0];
      const scheduleRecord = asRecord(schedule);
      const hours = asRecord(scheduleRecord.hours);
      return {
        name_zh: item.name_zh,
        name_en: item.name_en,
        scheduleSemester: scheduleRecord.semester,
        today: Array.isArray(hours[today]) ? hours[today] : [],
        notes: trimText(hours.notes, 400),
        pdfUrl: scheduleRecord.pdf_url,
      };
    }),
  };
};

const getWeather = async (c: Context) => {
  const payload = await requestJson(weather, "/", c);
  const days = Array.isArray(payload) ? payload : [];
  return {
    location: "NTHU East District",
    forecast: trimList(days, 5).map((day) => {
      const item = asRecord(day);
      const weatherData = asRecord(item.weatherData);
      return {
        date: item.date,
        minTemperature: weatherData.MinT,
        maxTemperature: weatherData.MaxT,
        rainProbability: weatherData.PoP12h,
        weather: trimText(
          weatherData.WeatherDescription || weatherData.Wx,
          300,
        ),
      };
    }),
  };
};

const loadGraduationData = async (c: Context) => {
  let colleges = await getCachedRequirements(c);
  if (!colleges) {
    colleges = await scrapeAllColleges();
    await setCachedRequirements(c, colleges);
  }
  return colleges;
};

// Keep every declaration within the provider-neutral JSON-schema subset in the chat contract.
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_courses",
    description:
      "Search NTHU courses by topic, name, course code, or instructor. Defaults to the current semester and returns raw_ids.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Course topic, name, code, or instructor",
        },
        semester: {
          type: Type.STRING,
          description: "Optional five-digit semester, such as 11510",
        },
        limit: { type: Type.NUMBER, description: "Maximum results, default 10" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_course_details",
    description:
      "Get current database details and compact syllabus information for a course raw_id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        courseId: {
          type: Type.STRING,
          description: "Course raw_id from search results",
        },
      },
      required: ["courseId"],
    },
  },
  {
    name: "compare_courses",
    description: "Search several course topics and compare their current offerings.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        queries: { type: Type.STRING, description: "Comma-separated course topics" },
        department: { type: Type.STRING, description: "Optional department code" },
        semester: { type: Type.STRING, description: "Optional five-digit semester" },
      },
      required: ["queries"],
    },
  },
  {
    name: "list_departments",
    description: "List Chinese department names used by graduation requirement records.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Optional Chinese name, English name, or department code to narrow the list",
        },
      },
      required: [],
    },
  },
  {
    name: "get_graduation_requirements",
    description:
      "Find the graduation-requirement PDF for a Chinese department and entrance year.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        department: { type: Type.STRING, description: "Exact Chinese department name" },
        entranceYear: { type: Type.STRING, description: "ROC entrance year, such as 113" },
      },
      required: ["department", "entranceYear"],
    },
  },
  {
    name: "find_courses_in_free_periods",
    description:
      "Find current-semester courses whose known timetable slots do not overlap the user's selected courses.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Optional topic, name, or instructor" },
        department: { type: Type.STRING, description: "Optional department code" },
        semester: { type: Type.STRING, description: "Optional five-digit semester" },
        limit: { type: Type.NUMBER, description: "Maximum matches, default 10" },
      },
      required: [],
    },
  },
  {
    name: "check_timetable_conflicts",
    description:
      "Check candidate course raw_ids against one another and the user's selected timetable.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        courseIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Candidate course raw_ids from search results",
        },
        semester: { type: Type.STRING, description: "Optional five-digit semester" },
      },
      required: ["courseIds"],
    },
  },
  {
    name: "get_academic_calendar",
    description:
      "Look up NTHU academic-calendar events, defaulting to the current academic year.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING, description: "Optional ISO date YYYY-MM-DD" },
        endDate: { type: Type.STRING, description: "Optional ISO date YYYY-MM-DD" },
      },
      required: [],
    },
  },
  {
    name: "get_bus_departures",
    description: "Find upcoming NTHU campus or Nanda shuttle departures.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        busType: {
          type: Type.STRING,
          enum: ["all", "main", "nanda", "red", "green", "route1", "route2"],
          description: "Bus route filter",
        },
        direction: {
          type: Type.STRING,
          enum: ["up", "down"],
          description: "up toward TSMC/Nanda, down toward the main gate/main campus",
        },
        day: {
          type: Type.STRING,
          enum: ["current", "weekday", "weekend"],
          description: "Use current for next departures",
        },
        limit: { type: Type.NUMBER, description: "Maximum departures, default 10" },
      },
      required: [],
    },
  },
  {
    name: "get_sports_opening_times",
    description:
      "Look up today's public opening hours for NTHU sports facilities from the cached PEO schedule.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        facility: { type: Type.STRING, description: "Optional Chinese or English facility name" },
        semester: { type: Type.STRING, description: "Optional five-digit semester" },
      },
      required: [],
    },
  },
  {
    name: "get_weather",
    description: "Get the five-day NTHU East District weather forecast.",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
];

export async function executeTool(
  c: Context,
  toolName: string,
  args: Record<string, unknown>,
  userContext?: UserContext,
): Promise<unknown> {
  const semester =
    (typeof args.semester === "string" && args.semester) ||
    userContext?.currentSemester ||
    getCurrentSemester();

  switch (toolName) {
    case "search_courses":
      return searchCourses(
        c,
        typeof args.query === "string" ? args.query : "",
        typeof args.limit === "number" ? args.limit : undefined,
        semester,
      );

    case "get_course_details":
      if (typeof args.courseId !== "string" || !args.courseId.trim()) {
        throw new Error("courseId is required");
      }
      return getCourseDetails(c, args.courseId.trim());

    case "compare_courses": {
      const queries =
        typeof args.queries === "string"
          ? args.queries
              .split(",")
              .map((query) => query.trim())
              .filter(Boolean)
              .slice(0, MAX_RESULT_ITEMS)
          : [];
      if (queries.length === 0)
        throw new Error("queries must contain at least one search term");
      const department =
        typeof args.department === "string" ? args.department : undefined;
      return {
        semester,
        filters_applied: { department: department ?? null },
        results: await Promise.all(
          queries.map(async (query) => searchCourses(c, query, 5, semester, department)),
        ),
      };
    }

    case "list_departments": {
      const colleges = await loadGraduationData(c);
      const departments = colleges.flatMap((college) =>
        college.departments.map((department) => ({
          college: trimText(college.name, 120),
          department: trimText(department.name, 120),
          availableYears: trimList(
            department.years.map((year) => year.year),
            15,
          ),
        })),
      );
      const query =
        typeof args.query === "string" ? args.query.trim().toLocaleLowerCase() : "";
      const matchingDepartments = query
        ? departments.filter((department) =>
            `${department.college} ${department.department}`
              .toLocaleLowerCase()
              .includes(query),
          )
        : departments;
      return {
        total: departments.length,
        matched: matchingDepartments.length,
        departments: trimList(matchingDepartments, MAX_RESULT_ITEMS),
        truncated: matchingDepartments.length > MAX_RESULT_ITEMS,
        note: "Use an exact Chinese department name with get_graduation_requirements; common mappings include CS=資訊工程學系 and EE=電機工程學系.",
      };
    }

    case "get_graduation_requirements": {
      const department =
        typeof args.department === "string" ? args.department.trim() : "";
      const entranceYear =
        typeof args.entranceYear === "string" ? args.entranceYear.trim() : "";
      if (!department || !entranceYear)
        throw new Error("department and entranceYear are required");
      const colleges = await loadGraduationData(c);
      const result = await findRequirementsPDF(colleges, department, entranceYear);
      if (!result) {
        return {
          found: false,
          message: `找不到 ${department} ${entranceYear} 入學年度的畢業學分表`,
          searched: { department, entranceYear },
        };
      }
      return {
        found: true,
        college: trimText(result.college, 120),
        department: trimText(result.department, 120),
        entranceYear,
        pdfUrl: result.pdfUrl,
        uploadToGemini: true,
        message: `找到 ${result.college} ${result.department} ${entranceYear} 入學年度的畢業學分表 PDF`,
      };
    }

    case "find_courses_in_free_periods":
      return findFreeCourses(c, args, userContext);

    case "check_timetable_conflicts":
      return checkConflicts(c, args, userContext);

    case "get_academic_calendar":
      return getCalendar(c, args);

    case "get_bus_departures":
      return getBusDepartures(c, args);

    case "get_sports_opening_times":
      return getSportsOpeningTimes(c, args);

    case "get_weather":
      return getWeather(c);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
