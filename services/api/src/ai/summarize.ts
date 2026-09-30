import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase_server from "../config/supabase_server";
import prismaClients from "../prisma/client";
import type { Bindings } from "../index";
import {
  generateJSON,
  type LLMProviderError,
} from "./llm";

export type Workload =
  | "輕鬆"
  | "適中"
  | "繁重"
  | "Light"
  | "Moderate"
  | "Heavy";

export interface SyllabusSummary {
  bullets: string[];
  workload: Workload;
  audience: string;
  difficultyRating: number;
  provider?: "gemini" | "groq" | "workers-ai";
  model?: string;
}

const CACHE_KEY_PREFIX = "syllabus_summary:";
const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    bullets: {
      type: "array",
      items: { type: "string" },
      description: "At most three concise bullet points",
    },
    workload: {
      type: "string",
      enum: ["輕鬆", "適中", "繁重", "Light", "Moderate", "Heavy"],
    },
    audience: { type: "string" },
    difficultyRating: { type: "integer" },
  },
  required: ["bullets", "workload", "audience", "difficultyRating"],
} as const;

function workloadForLanguage(value: Workload, english: boolean): Workload {
  const englishValue: Record<string, Workload> = {
    輕鬆: "Light",
    適中: "Moderate",
    繁重: "Heavy",
  };
  const chineseValue: Record<string, Workload> = {
    Light: "輕鬆",
    Moderate: "適中",
    Heavy: "繁重",
  };
  return english
    ? englishValue[value] ?? value
    : chineseValue[value] ?? value;
}

/** Validates and normalizes model output before it is cached permanently. */
export function normalizeSyllabusSummary(
  value: unknown,
  english: boolean,
): SyllabusSummary {
  if (!value || typeof value !== "object") throw new Error("Invalid summary object");
  const summary = value as Record<string, unknown>;
  const bullets = Array.isArray(summary.bullets)
    ? summary.bullets.filter((item): item is string => typeof item === "string").slice(0, 3)
    : [];
  const workload = summary.workload;
  if (
    workload !== "輕鬆" &&
    workload !== "適中" &&
    workload !== "繁重" &&
    workload !== "Light" &&
    workload !== "Moderate" &&
    workload !== "Heavy"
  ) {
    throw new Error("Invalid workload in summary");
  }
  if (typeof summary.audience !== "string") {
    throw new Error("Invalid audience in summary");
  }
  const difficulty = Number(summary.difficultyRating);
  if (!Number.isFinite(difficulty)) throw new Error("Invalid difficulty in summary");
  return {
    bullets,
    workload: workloadForLanguage(workload, english),
    audience: summary.audience,
    difficultyRating: Math.max(1, Math.min(5, Math.round(difficulty))),
  };
}

function requestIp(c: { req: { header(name: string): string | undefined } }): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for") ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

function providerFailure(error: unknown): { error: string; code: "unavailable" } {
  const message =
    error instanceof Error ? error.message : "All AI providers failed";
  return { error: message, code: "unavailable" };
}

const app = new Hono<{ Bindings: Bindings }>().get(
  "/:courseId",
  zValidator("param", z.object({ courseId: z.string() })),
  async (c) => {
    const { courseId } = c.req.valid("param");
    const prisma = await prismaClients.fetch(c.env.DB);
    const cacheKey = `${CACHE_KEY_PREFIX}${courseId}`;
    let cached;
    try {
      cached = await prisma.cache.findUnique({ where: { key: cacheKey } });
    } catch (error) {
      console.error("Failed to read AI summary cache:", error);
      return c.json(
        { error: "AI summary storage is unavailable", code: "unavailable" },
        503,
      );
    }
    if (cached) {
      try {
        return c.json(JSON.parse(cached.data) as SyllabusSummary);
      } catch {
        // Treat a corrupt cache entry as a miss and regenerate it.
      }
    }

    const limiter = c.env.AI_RATE_LIMITER;
    if (limiter) {
      try {
        const outcome = await limiter.limit({ key: requestIp(c) });
        if (!outcome.success) {
          return c.json(
            { error: "Too many uncached AI summary requests", code: "rate_limited" },
            429,
          );
        }
      } catch (error) {
        console.error("AI summary rate limiting failed:", error);
      }
    }

    const supabase = supabase_server(c);
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select(
        "name_zh, name_en, department, credits, teacher_zh, teacher_en, prerequisites, language",
      )
      .eq("raw_id", courseId)
      .single();

    if (courseError || !courseData) {
      return c.json({ error: "Course not found" }, 404);
    }

    const { data: syllabusData, error: syllabusError } = await supabase
      .from("course_syllabus")
      .select("brief, content, has_file, keywords")
      .eq("raw_id", courseId)
      .single();

    if (syllabusError || !syllabusData) {
      return c.json({ error: "No syllabus available for this course" }, 404);
    }

    const courseName = courseData.name_zh || courseData.name_en || courseId;
    const teachers = [
      ...(courseData.teacher_zh ?? []),
      ...(courseData.teacher_en ?? []),
    ]
      .filter(Boolean)
      .join(", ");
    const english = courseData.language === "英";
    const metaText = [
      `課程名稱 / Course: ${courseName}`,
      `系所 / Department: ${courseData.department ?? ""}`,
      `學分 / Credits: ${courseData.credits ?? ""}`,
      `授課教師 / Teacher: ${teachers}`,
      courseData.prerequisites
        ? `先修條件 / Prerequisites: ${courseData.prerequisites}`
        : null,
      syllabusData.keywords?.length
        ? `關鍵字 / Keywords: ${syllabusData.keywords.join(", ")}`
        : null,
      syllabusData.brief ? `課程簡介 / Brief: ${syllabusData.brief}` : null,
      syllabusData.content
        ? `\n\n課程大綱 / Syllabus:\n${syllabusData.content}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    const supabaseUrl = c.env.SUPABASE_URL;
    const pdf =
      !syllabusData.content && syllabusData.has_file && supabaseUrl
        ? {
            url: `${supabaseUrl}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`,
          }
        : undefined;

    try {
      const generated = await generateJSON<unknown>({
        env: c.env,
        system: english
          ? "You are a course analyst. Summarize the provided course information concisely and accurately in English. Be direct and student-focused."
          : "你是課程分析師。請根據提供的課程資訊，簡潔準確地摘要。用繁體中文回答，從學生角度直接切入重點。",
        text: metaText,
        pdf,
        schema: SUMMARY_SCHEMA,
        userGeminiKey: c.req.header("X-Gemini-Api-Key"),
        purpose: "summary",
      });
      const summary = normalizeSyllabusSummary(generated.data, english);
      await prisma.cache.upsert({
        where: { key: cacheKey },
        update: { data: JSON.stringify(summary) },
        create: { key: cacheKey, data: JSON.stringify(summary) },
      });
      return c.json({ ...summary, provider: generated.provider, model: generated.model });
    } catch (error) {
      const failure = providerFailure(error as LLMProviderError);
      return c.json(failure, 503);
    }
  },
);

export default app;
