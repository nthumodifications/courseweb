import { departments as sharedDepartments } from "@courseweb/shared/dist/index.js";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prismaClients from "../prisma/client";
import supabase_server from "../config/supabase_server";
import type { Bindings } from "../index";
import { generateJSON, type LLMProviderError, type ProviderName } from "./llm";

export const SEARCH_INTENT_COURSE_LEVELS = [
  "1000",
  "2000",
  "3000",
  "4000",
  "5000",
  "6000",
  "7000",
  "8000",
  "9000",
] as const;
export const SEARCH_INTENT_LANGUAGES = ["中", "英"] as const;
export const SEARCH_INTENT_TAGS = [
  "16週",
  "18週",
  "X-Class",
  "不可加簽",
] as const;
export const SEARCH_INTENT_GE_TYPES = [
  "核心通識Core GE courses 1",
  "核心通識Core GE courses 2",
  "核心通識Core GE courses 3",
  "核心通識Core GE courses 4",
  "人文學領域 Elective GE course: Humanities",
  "社會科學領域 Elective GE course: Social Sciences",
  "自然科學領域 Elective GE course: Natural Sciences",
] as const;
export const SEARCH_INTENT_GE_TARGETS = ["*1", "*3", "*6", "*7"] as const;
export const SEARCH_INTENT_CREDITS = [0, 1, 2, 3, 4, 6, 9] as const;

const SEARCH_INTENT_TIME_PATTERN = /^[MTWRFS](?:[1-9]|[abcn])$/;
const CACHE_KEY_PREFIX = "ai_search_intent:";

export type SearchIntentFilters = {
  department?: string[];
  courseLevel?: string[];
  language?: string[];
  separate_times?: string[];
  tags?: string[];
  ge_type?: string[];
  ge_target?: string[];
  credits?: number[];
};

export type SearchIntent = {
  query: string;
  filters: SearchIntentFilters;
  explanation: string;
  provider?: ProviderName;
  model?: string;
};

export type DepartmentOption = {
  code: string;
  name_zh?: string;
  name_en?: string;
};

// The live Supabase course rows are the source of truth for departments. The
// shared list supplies names so natural-language department requests can be
// resolved even when a course lookup returns only facet codes.
export const FALLBACK_DEPARTMENTS: DepartmentOption[] = sharedDepartments.map(
  (department) => ({
    code: department.code,
    name_zh: department.name_zh,
    name_en: department.name_en,
  }),
);

export const SEARCH_INTENT_SCHEMA = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description:
        "Short course-name or subject keywords for the normal search box; may be empty",
    },
    filters: {
      type: "object",
      properties: {
        department: { type: "array", items: { type: "string" } },
        courseLevel: { type: "array", items: { type: "string" } },
        language: { type: "array", items: { type: "string" } },
        separate_times: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        ge_type: { type: "array", items: { type: "string" } },
        ge_target: { type: "array", items: { type: "string" } },
        credits: { type: "array", items: { type: "number" } },
      },
    },
    explanation: {
      type: "string",
      description:
        "One short sentence in the requested language explaining the applied intent",
    },
  },
  required: ["query", "filters", "explanation"],
} as const;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
    : "";

const unique = <T>(values: T[]) => [...new Set(values)];

const valuesFrom = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const normalizeLanguage = (
  value: unknown,
): (typeof SEARCH_INTENT_LANGUAGES)[number] | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLocaleLowerCase("zh-TW");
  if (["中", "中文", "chinese", "mandarin", "zh"].includes(normalized))
    return "中";
  if (["英", "英文", "english", "en"].includes(normalized)) return "英";
  return undefined;
};

const normalizeTag = (
  value: unknown,
): (typeof SEARCH_INTENT_TAGS)[number] | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLocaleLowerCase("zh-TW");
  if (["16週", "16 weeks", "16-week", "16 week"].includes(normalized))
    return "16週";
  if (["18週", "18 weeks", "18-week", "18 week"].includes(normalized))
    return "18週";
  if (normalized === "x-class" || normalized === "x class") return "X-Class";
  if (
    ["不可加簽", "no extra selection", "no add/drop"].includes(normalized)
  )
    return "不可加簽";
  return undefined;
};

const normalizedDepartment = (value: string) =>
  value.trim().toLocaleLowerCase("zh-TW").replace(/[\s._-]+/g, "");

/** Resolve model department text to one actual department facet code. */
export function resolveDepartment(
  value: unknown,
  options: readonly DepartmentOption[] = FALLBACK_DEPARTMENTS,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = normalizedDepartment(value);
  if (!candidate) return undefined;

  const aliases = options.map((option) => ({
    code: option.code,
    values: [option.code, option.name_zh, option.name_en]
      .filter((item): item is string => Boolean(item))
      .map(normalizedDepartment),
  }));
  const exact = aliases.filter((option) => option.values.includes(candidate));
  if (exact.length === 1) return exact[0]!.code;

  const partial = unique(
    aliases
      .filter((option) =>
        option.values.some(
          (alias) => alias.includes(candidate) || candidate.includes(alias),
        ),
      )
      .map((option) => option.code),
  );
  return partial.length === 1 ? partial[0] : undefined;
}

const normalizeArray = <T>(
  value: unknown,
  convert: (item: unknown) => T | undefined,
  max: number,
) =>
  unique(
    valuesFrom(value)
      .map(convert)
      .filter((item): item is T => item !== undefined),
  ).slice(0, max);

const fallbackExplanation = (lang: "zh" | "en") =>
  lang === "en" ? "AI search filters applied." : "已套用 AI 搜尋條件。";

// Words that describe a filter rather than a course topic. Left in the text
// query they match no course name and empty the result list.
const ALWAYS_FILLER =
  /(週|星期|禮拜)[一二三四五六日天]|(上午|早上|中午|下午|晚上|傍晚)|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|noon|afternoon|evening|night)s?\b|\d+\s*學分|\b\d+[- ]?credits?\b|學分|\bcredits?\b|課程|的課|\bcourses?\b|\bclass(es)?\b|\b(on|in|at|for|the|a|an|with|find|want|looking|some|any|i|me|please)\b/giu;
const LANGUAGE_FILLER =
  /(英文|中文|英語|華語)(授課)?|\b(english|chinese|mandarin)(-| )?(taught)?\b|\btaught in\b/giu;
const GE_FILLER =
  /(核心)?通識|第?[一二三四1-4]向度|\bgeneral education\b|\bge\b|\bcore\b/giu;

export function stripFilterWords(
  query: string,
  filters: SearchIntentFilters,
): string {
  let result = query.replace(ALWAYS_FILLER, " ");
  if (filters.language?.length) result = result.replace(LANGUAGE_FILLER, " ");
  if (filters.ge_type?.length || filters.ge_target?.length) {
    result = result.replace(GE_FILLER, " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

/** Validate model output and keep only real course-search facet values. */
export function normalizeSearchIntent(
  value: unknown,
  lang: "zh" | "en" = "zh",
  departments: readonly DepartmentOption[] = FALLBACK_DEPARTMENTS,
): SearchIntent {
  const record = asRecord(value);
  const rawFilters = asRecord(record.filters);
  const filters: SearchIntentFilters = {};

  const department = normalizeArray(
    rawFilters.department,
    (item) => resolveDepartment(item, departments),
    8,
  );
  if (department.length) filters.department = department;

  const courseLevel = normalizeArray(
    rawFilters.courseLevel,
    (item) =>
      typeof item === "string" &&
      (SEARCH_INTENT_COURSE_LEVELS as readonly string[]).includes(item.trim())
        ? item.trim()
        : undefined,
    SEARCH_INTENT_COURSE_LEVELS.length,
  );
  if (courseLevel.length) filters.courseLevel = courseLevel;

  const language = normalizeArray(rawFilters.language, normalizeLanguage, 2);
  if (language.length) filters.language = language;

  const separateTimes = normalizeArray(
    rawFilters.separate_times,
    (item) =>
      typeof item === "string" && SEARCH_INTENT_TIME_PATTERN.test(item.trim())
        ? item.trim()
        : undefined,
    24,
  );
  if (separateTimes.length) filters.separate_times = separateTimes;

  const tags = normalizeArray(
    rawFilters.tags,
    normalizeTag,
    SEARCH_INTENT_TAGS.length,
  );
  if (tags.length) filters.tags = tags;

  const geType = normalizeArray(
    rawFilters.ge_type,
    (item) =>
      typeof item === "string" &&
      (SEARCH_INTENT_GE_TYPES as readonly string[]).includes(item.trim())
        ? item.trim()
        : undefined,
    SEARCH_INTENT_GE_TYPES.length,
  );
  if (geType.length) filters.ge_type = geType;

  const geTarget = normalizeArray(
    rawFilters.ge_target,
    (item) =>
      typeof item === "string" &&
      (SEARCH_INTENT_GE_TARGETS as readonly string[]).includes(item.trim())
        ? item.trim()
        : undefined,
    SEARCH_INTENT_GE_TARGETS.length,
  );
  if (geTarget.length) filters.ge_target = geTarget;

  const credits = normalizeArray(
    rawFilters.credits,
    (item) =>
      typeof item === "number" &&
      Number.isInteger(item) &&
      (SEARCH_INTENT_CREDITS as readonly number[]).includes(item)
        ? item
        : undefined,
    SEARCH_INTENT_CREDITS.length,
  );
  if (credits.length) filters.credits = credits;

  let query = stripFilterWords(cleanText(record.query, 120), filters);
  // "資工" alongside department CS is the filter restated, not a topic.
  const queryDepartment = query ? resolveDepartment(query, departments) : undefined;
  if (queryDepartment && filters.department?.includes(queryDepartment)) query = "";

  return {
    query,
    filters,
    explanation:
      cleanText(record.explanation, 180) || fallbackExplanation(lang),
  };
}

export const normalizeSearchQuery = (query: string) =>
  query.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-TW");

export const searchIntentCacheKey = (
  query: string,
  semester = "all",
  lang: "zh" | "en" = "zh",
) =>
  `${CACHE_KEY_PREFIX}${encodeURIComponent(semester)}:${lang}:${encodeURIComponent(normalizeSearchQuery(query))}`;

const requestIp = (c: { req: { header(name: string): string | undefined } }) =>
  c.req.header("cf-connecting-ip") ??
  c.req.header("x-forwarded-for") ??
  c.req.header("x-real-ip") ??
  "unknown";

const loadDepartmentOptions = async (
  c: Parameters<typeof supabase_server>[0],
  semester?: string,
): Promise<DepartmentOption[]> => {
  let query = supabase_server(c).from("courses").select("department").limit(5000);
  if (semester) query = query.eq("semester", semester);
  const { data, error } = await query;
  if (error || !data?.length) {
    if (error) console.error("AI search department lookup failed:", error.message);
    return FALLBACK_DEPARTMENTS;
  }
  const known = new Map(FALLBACK_DEPARTMENTS.map((item) => [item.code, item]));
  return unique(
    data
      .map((row) => row.department)
      .filter(
        (department): department is string =>
          typeof department === "string" && Boolean(department.trim()),
      )
      .map((code) => ({ code, ...known.get(code) })),
  );
};

export const searchIntentSystemPrompt = (
  lang: "zh" | "en",
  departments: readonly DepartmentOption[],
) => {
  // Codes with short Chinese names only: the English names tripled the prompt,
  // and free tiers meter tokens per minute. resolveDepartment still accepts
  // English names server-side.
  const departmentList = departments
    .map((department) =>
      department.name_zh ? `${department.code}=${department.name_zh}` : department.code,
    )
    .join(" ");
  return `${
    lang === "en"
      ? "You convert a student's natural-language NTHU course request into a precise search intent. Explain the applied constraints in one short English sentence."
      : "你要把學生對清大課程的自然語言需求轉成精確的搜尋意圖。請用一句簡短的繁體中文說明套用的條件。"
  }
Return JSON only. Do not invent constraints. Every filter value must be copied exactly from the allowed values below.
query is matched as text against course names, so it holds ONLY the subject/topic words (e.g. "機器學習", "線性代數", "machine learning"). Never repeat something a filter already expresses: no department names, weekdays, 上午/下午/晚上, 英文授課/English-taught, 通識/GE/向度, credit counts, or words like 課程/courses. When the filters say everything, query is "". Every query word must match, so when the student offers alternatives (A or B) put only the broader one.
Set department only when the student names a department or its field of study as such (資工 → CS, 電機系 → EE). A topic like 機器學習 or data science is a query keyword, not a department.
Allowed courseLevel: ${SEARCH_INTENT_COURSE_LEVELS.join(", ")}
Allowed language: ${SEARCH_INTENT_LANGUAGES.join(", ")} (中=Chinese, 英=English)
Allowed tags: ${SEARCH_INTENT_TAGS.join(", ")}
Allowed ge_type: ${SEARCH_INTENT_GE_TYPES.join(" | ")}
Allowed ge_target: ${SEARCH_INTENT_GE_TARGETS.join(", ")}
Allowed credits: ${SEARCH_INTENT_CREDITS.join(", ")}
Allowed separate_times: day M/T/W/R/F/S followed by period 1-9,a,b,c,n, such as T5 or M7. Never output a bare day. Use one value per selected slot. NTHU periods: 1-4 morning (08:00-12:00), n noon, 5-9 afternoon (13:20-18:20), a,b,c evening (18:30-21:20). So "Tuesday afternoon" is T5,T6,T7,T8,T9 and "Thursday evening" is Ra,Rb,Rc.
Department is a real facet code; output the code only (English requests: CS=computer science, EE=electrical engineering, and so on). Codes: ${departmentList}`;
};

const app = new Hono<{ Bindings: Bindings }>().post(
  "/",
  zValidator(
    "json",
    z.object({
      query: z.string().trim().min(1, "A search query is required").max(200),
      semester: z.string().trim().min(1).max(20).optional(),
      lang: z.enum(["zh", "en"]).optional(),
    }),
  ),
  async (c) => {
    const { query, semester, lang = "zh" } = c.req.valid("json");
    const cacheKey = searchIntentCacheKey(query, semester ?? "all", lang);
    const prisma = await prismaClients.fetch(c.env.DB);

    try {
      const cached = await prisma.cache.findUnique({ where: { key: cacheKey } });
      if (cached) {
        try {
          const value = JSON.parse(cached.data) as SearchIntent;
          if (value && typeof value.explanation === "string") return c.json(value);
        } catch {
          // Treat a corrupt cache entry as a miss and regenerate it.
        }
      }
    } catch (error) {
      console.error("Failed to read AI search intent cache:", error);
    }

    const limiter = c.env.AI_RATE_LIMITER;
    if (limiter) {
      try {
        const outcome = await limiter.limit({ key: requestIp(c) });
        if (!outcome.success) {
          return c.json(
            { error: "Too many uncached AI search requests", code: "rate_limited" },
            429,
          );
        }
      } catch (error) {
        console.error("AI search rate limiting failed:", error);
      }
    }

    const departmentOptions = await loadDepartmentOptions(c, semester);
    try {
      const generated = await generateJSON<unknown>({
        env: c.env,
        system: searchIntentSystemPrompt(lang, departmentOptions),
        text: `Student request: ${query}\nSemester: ${semester ?? "any semester"}`,
        schema: SEARCH_INTENT_SCHEMA,
        purpose: "bulk",
      });
      const intent = normalizeSearchIntent(generated.data, lang, departmentOptions);
      const response: SearchIntent = {
        ...intent,
        provider: generated.provider,
        model: generated.model,
      };
      try {
        await prisma.cache.upsert({
          where: { key: cacheKey },
          update: { data: JSON.stringify(response) },
          create: { key: cacheKey, data: JSON.stringify(response) },
        });
      } catch (error) {
        console.error("Failed to write AI search intent cache:", error);
      }
      return c.json(response);
    } catch (error) {
      const providerError = error as LLMProviderError;
      console.error("AI search intent generation failed:", {
        provider: providerError.provider,
        model: providerError.model,
        code: providerError.code,
        message: providerError.message,
      });
      return c.json(
        { error: "AI search is temporarily unavailable", code: "unavailable" },
        503,
      );
    }
  },
);

export default app;
