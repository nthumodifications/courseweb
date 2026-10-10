import type { FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";
import type { Context } from "hono";
import { z } from "zod";
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
import {
  eligibilitySummary,
  type EligibilityLevel,
  type StudentForEligibility,
} from "../course-eligibility";

const MAX_RESULT_ITEMS = 15;
const MAX_COMPARE_QUERIES = 8;
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
  value.replaceAll("\\", String.raw`\\`).replaceAll('"', String.raw`\"`);

const buildCourseFilters = (semester?: string, department?: string) =>
  [
    semester && `semester:"${quoteFilterValue(semester)}"`,
    department && `department:"${quoteFilterValue(department)}"`,
  ]
    .filter((filter): filter is string => Boolean(filter))
    .join(" AND ");

type StudentFilters = {
  level?: EligibilityLevel;
  year?: number;
  unit?: string;
};

const studentFiltersFromArgs = (
  args: Record<string, unknown>,
): StudentFilters | undefined => {
  const level = args.level;
  const year = args.year;
  const unit = args.unit;
  if (
    typeof level !== "string" &&
    typeof year !== "number" &&
    typeof unit !== "string"
  )
    return undefined;
  return {
    level: typeof level === "string" ? (level as EligibilityLevel) : undefined,
    year: typeof year === "number" ? year : undefined,
    unit: typeof unit === "string" ? unit : undefined,
  };
};

const toCourseSummary = (
  value: unknown,
  briefLength = 450,
  student?: StudentForEligibility,
): UnknownRecord => {
  const course = asRecord(value);
  const restrictions = trimText(course.restrictions, 500);
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
    restrictions,
    eligibility: eligibilitySummary(restrictions, student),
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
    let message = "unknown error";
    if (lastError instanceof Error) message = lastError.message;
    if (fallbackError instanceof Error) message = fallbackError.message;
    throw new Error(`Course search unavailable: ${message}`);
  }
};

const searchCourses = async (
  c: Context,
  query: string,
  limit = MAX_RESULT_ITEMS,
  semester?: string,
  department?: string,
  student?: StudentFilters,
): Promise<UnknownRecord> => {
  const outputLimit = asPositiveLimit(limit, 10);
  const result = await searchWithFallback(
    c,
    query.trim(),
    outputLimit,
    semester,
    department,
  );
  const hits = trimList(result.hits ?? [], outputLimit).map((hit) =>
    toCourseSummary(hit, 450, student),
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
  let syllabus: UnknownRecord | undefined;
  if (Array.isArray(syllabusValue)) syllabus = syllabusValue[0];
  else if (syllabusValue && typeof syllabusValue === "object") {
    syllabus = syllabusValue;
  }
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

const currentCourses = (
  userContext: UserContext | undefined,
  semester: string,
) =>
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
  const student = studentFiltersFromArgs(args);
  const result = await searchWithFallback(
    c,
    typeof args.query === "string" ? args.query.trim() : "",
    50,
    semester,
    typeof args.department === "string" ? args.department : undefined,
  );
  const courses = (result.hits ?? [])
    .map((course) => toCourseSummary(course, 450, student))
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

const semesterLabel = (semester: string) => {
  if (semester.endsWith("10")) return "上學期";
  if (semester.endsWith("20")) return "下學期";
  return undefined;
};

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
      ? (semesterLabel(args.semester) ?? args.semester)
      : (semesterLabel(getCurrentSemester()) ?? "上學期");
  const today = currentTaipeiDateParts().weekday;
  const facilities = Array.isArray(payload.facilities)
    ? payload.facilities
    : [];
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
        schedules.find(
          (candidate) => asRecord(candidate).semester === semester,
        ) ?? schedules[0];
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

const toolSemester = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "semester must be a five-digit semester code")
  .optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const courseId = z.string().trim().min(1).max(100);
const resultLimit = z.number().int().min(1).max(MAX_RESULT_ITEMS).optional();
const studentLevel = z
  .enum([
    "undergraduate",
    "master",
    "doctoral",
    "special-program",
    "advanced-student",
    "international-student",
    "secondary-teacher-education",
    "primary-teacher-education",
    "male",
    "female",
  ])
  .optional();
const studentYear = z.number().int().min(1).max(10).optional();
const studentUnit = optionalText(120);

const compareQueries = z
  .string()
  .trim()
  .min(1)
  .max(800)
  .superRefine((value, context) => {
    const queries = value
      .split(",")
      .map((query) => query.trim())
      .filter(Boolean);
    if (queries.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "queries must contain at least one search term",
      });
    } else if (queries.length > MAX_COMPARE_QUERIES) {
      context.addIssue({
        code: z.ZodIssueCode.too_big,
        type: "array",
        maximum: MAX_COMPARE_QUERIES,
        inclusive: true,
        message: `queries may contain at most ${MAX_COMPARE_QUERIES} search terms`,
      });
    }
    if (queries.some((query) => query.length > 200)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "each search term must be at most 200 characters",
      });
    }
  });

const TOOL_ARGUMENT_SCHEMAS = {
  search_courses: z
    .object({
      query: z.string().trim().min(1).max(200),
      semester: toolSemester,
      limit: resultLimit,
      level: studentLevel,
      year: studentYear,
      unit: studentUnit,
    })
    .strict(),
  get_course_details: z.object({ courseId }).strict(),
  compare_courses: z
    .object({
      queries: compareQueries,
      department: optionalText(120),
      semester: toolSemester,
      level: studentLevel,
      year: studentYear,
      unit: studentUnit,
    })
    .strict(),
  list_departments: z.object({ query: optionalText(120) }).strict(),
  get_graduation_requirements: z
    .object({
      department: z.string().trim().min(1).max(120),
      entranceYear: z
        .string()
        .trim()
        .regex(/^\d{2,3}$/),
    })
    .strict(),
  find_courses_in_free_periods: z
    .object({
      query: optionalText(200),
      department: optionalText(120),
      semester: toolSemester,
      limit: resultLimit,
      level: studentLevel,
      year: studentYear,
      unit: studentUnit,
    })
    .strict(),
  check_timetable_conflicts: z
    .object({
      courseIds: z.array(courseId).min(1).max(MAX_RESULT_ITEMS),
      semester: toolSemester,
    })
    .strict(),
  get_academic_calendar: z
    .object({
      startDate: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      endDate: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .strict(),
  get_bus_departures: z
    .object({
      busType: z
        .enum(["all", "main", "nanda", "red", "green", "route1", "route2"])
        .optional(),
      direction: z.enum(["up", "down"]).optional(),
      day: z.enum(["current", "weekday", "weekend"]).optional(),
      limit: resultLimit,
    })
    .strict(),
  get_sports_opening_times: z
    .object({ facility: optionalText(120), semester: toolSemester })
    .strict(),
  get_weather: z.object({}).strict(),
} as const;

type ToolName = keyof typeof TOOL_ARGUMENT_SCHEMAS;

const formatToolArgumentError = (toolName: string, error: z.ZodError) => {
  const issue = error.issues[0];
  return `Invalid arguments for ${toolName}: ${issue?.message ?? "invalid object"}`;
};

export function validateToolArguments(
  toolName: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const schema = TOOL_ARGUMENT_SCHEMAS[toolName as ToolName];
  if (!schema) throw new Error(`Unknown tool: ${toolName}`);
  const parsed = schema.safeParse(args);
  if (!parsed.success)
    throw new Error(formatToolArgumentError(toolName, parsed.error));
  return parsed.data as Record<string, unknown>;
}

// Keep every declaration within the provider-neutral JSON-schema subset in the chat contract.
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_courses",
    description:
      "Search NTHU courses by topic, name, course code, or instructor. Defaults to the current semester and returns raw_ids plus parsed eligibility. Optional level/year/unit arguments annotate each course with can_select; they never filter results. Pass unit exactly as the student wrote it and treat unknown as requiring a check of the restriction text.",
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
        limit: {
          type: Type.NUMBER,
          description: "Maximum results, default 10",
        },
        level: {
          type: Type.STRING,
          enum: [
            "undergraduate",
            "master",
            "doctoral",
            "special-program",
            "advanced-student",
            "international-student",
            "secondary-teacher-education",
            "primary-teacher-education",
            "male",
            "female",
          ],
          description: "Optional student level for eligibility annotation",
        },
        year: {
          type: Type.NUMBER,
          description: "Optional student year, from 1 to 10",
        },
        unit: {
          type: Type.STRING,
          description:
            "Optional student department/programme, exactly as the student wrote it",
        },
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
    description:
      "Search several course topics and compare their current offerings.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        queries: {
          type: Type.STRING,
          description: "Comma-separated course topics",
        },
        department: {
          type: Type.STRING,
          description: "Optional department code",
        },
        semester: {
          type: Type.STRING,
          description: "Optional five-digit semester",
        },
        level: {
          type: Type.STRING,
          description: "Optional student level for eligibility annotation",
        },
        year: {
          type: Type.NUMBER,
          description: "Optional student year",
        },
        unit: {
          type: Type.STRING,
          description:
            "Optional student department/programme, exactly as the student wrote it",
        },
      },
      required: ["queries"],
    },
  },
  {
    name: "list_departments",
    description:
      "List Chinese department names used by graduation requirement records.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Optional Chinese name, English name, or department code to narrow the list",
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
        department: {
          type: Type.STRING,
          description: "Exact Chinese department name",
        },
        entranceYear: {
          type: Type.STRING,
          description: "ROC entrance year, such as 113",
        },
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
        query: {
          type: Type.STRING,
          description: "Optional topic, name, or instructor",
        },
        department: {
          type: Type.STRING,
          description: "Optional department code",
        },
        semester: {
          type: Type.STRING,
          description: "Optional five-digit semester",
        },
        limit: {
          type: Type.NUMBER,
          description: "Maximum matches, default 10",
        },
        level: {
          type: Type.STRING,
          description: "Optional student level for eligibility annotation",
        },
        year: {
          type: Type.NUMBER,
          description: "Optional student year",
        },
        unit: {
          type: Type.STRING,
          description:
            "Optional student department/programme, exactly as the student wrote it",
        },
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
        semester: {
          type: Type.STRING,
          description: "Optional five-digit semester",
        },
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
        startDate: {
          type: Type.STRING,
          description: "Optional ISO date YYYY-MM-DD",
        },
        endDate: {
          type: Type.STRING,
          description: "Optional ISO date YYYY-MM-DD",
        },
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
          description:
            "up toward TSMC/Nanda, down toward the main gate/main campus",
        },
        day: {
          type: Type.STRING,
          enum: ["current", "weekday", "weekend"],
          description: "Use current for next departures",
        },
        limit: {
          type: Type.NUMBER,
          description: "Maximum departures, default 10",
        },
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
        facility: {
          type: Type.STRING,
          description: "Optional Chinese or English facility name",
        },
        semester: {
          type: Type.STRING,
          description: "Optional five-digit semester",
        },
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
  const validatedArgs = validateToolArguments(toolName, args);
  const semester =
    (typeof validatedArgs.semester === "string" && validatedArgs.semester) ||
    userContext?.currentSemester ||
    getCurrentSemester();

  switch (toolName) {
    case "search_courses":
      return searchCourses(
        c,
        validatedArgs.query as string,
        validatedArgs.limit as number | undefined,
        semester,
        undefined,
        studentFiltersFromArgs(validatedArgs),
      );

    case "get_course_details":
      return getCourseDetails(c, validatedArgs.courseId as string);

    case "compare_courses": {
      const queries = (validatedArgs.queries as string)
        .split(",")
        .map((query) => query.trim())
        .filter(Boolean);
      const department = validatedArgs.department as string | undefined;
      const student = studentFiltersFromArgs(validatedArgs);
      return {
        semester,
        filters_applied: { department: department ?? null },
        results: await Promise.all(
          queries.map(async (query) =>
            searchCourses(c, query, 5, semester, department, student),
          ),
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
      const query = ((validatedArgs.query as string | undefined) ?? "")
        .trim()
        .toLocaleLowerCase();
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
      const department = (validatedArgs.department as string).trim();
      const entranceYear = (validatedArgs.entranceYear as string).trim();
      const colleges = await loadGraduationData(c);
      const result = await findRequirementsPDF(
        colleges,
        department,
        entranceYear,
      );
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
      return findFreeCourses(c, validatedArgs, userContext);

    case "check_timetable_conflicts":
      return checkConflicts(c, validatedArgs, userContext);

    case "get_academic_calendar":
      return getCalendar(c, validatedArgs);

    case "get_bus_departures":
      return getBusDepartures(c, validatedArgs);

    case "get_sports_opening_times":
      return getSportsOpeningTimes(c, validatedArgs);

    case "get_weather":
      return getWeather(c);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
