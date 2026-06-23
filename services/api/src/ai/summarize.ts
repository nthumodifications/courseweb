import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "hono/adapter";
import { GoogleGenAI, Type } from "@google/genai";
import supabase_server from "../config/supabase_server";
import prismaClients from "../prisma/client";

type Bindings = {
  DB: import("@cloudflare/workers-types").D1Database;
  GOOGLE_AI_API_KEY?: string;
};

export interface SyllabusSummary {
  bullets: string[];
  workload: "輕鬆" | "適中" | "繁重";
  audience: string;
  difficultyRating: number;
}

const CACHE_KEY_PREFIX = "syllabus_summary:";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const app = new Hono<{ Bindings: Bindings }>().get(
  "/:courseId",
  zValidator("param", z.object({ courseId: z.string() })),
  async (c) => {
    const { courseId } = c.req.valid("param");
    const { SUPABASE_URL, GOOGLE_AI_API_KEY } = env<{
      SUPABASE_URL: string;
      GOOGLE_AI_API_KEY?: string;
    }>(c);

    // 1. Check D1 cache — permanent, no TTL
    const prisma = await prismaClients.fetch(c.env.DB);
    const cacheKey = `${CACHE_KEY_PREFIX}${courseId}`;
    const cached = await prisma.cache.findUnique({ where: { key: cacheKey } });
    if (cached) {
      return c.json(JSON.parse(cached.data) as SyllabusSummary);
    }

    // 2. Fetch course + syllabus from Supabase
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

    // 3. Validate API key
    if (!GOOGLE_AI_API_KEY) {
      return c.json({ error: "GOOGLE_AI_API_KEY not configured" }, 500);
    }

    const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

    // 4. Build prompt content
    const courseName = courseData.name_zh || courseData.name_en || courseId;
    const teachers = [
      ...(courseData.teacher_zh ?? []),
      ...(courseData.teacher_en ?? []),
    ]
      .filter(Boolean)
      .join(", ");
    const isEnglish = courseData.language === "英";

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
    ]
      .filter(Boolean)
      .join("\n");

    const parts: object[] = [{ text: metaText }];

    if (syllabusData.content) {
      parts.push({ text: `\n\n課程大綱 / Syllabus:\n${syllabusData.content}` });
    } else if (syllabusData.has_file) {
      const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`;
      try {
        const pdfRes = await fetch(pdfUrl);
        if (pdfRes.ok) {
          const buffer = await pdfRes.arrayBuffer();
          parts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: arrayBufferToBase64(buffer),
            },
          });
        }
      } catch {
        // PDF unavailable — proceed with metadata only
      }
    }

    // 5. Call Gemini with responseSchema for structured output
    const systemInstruction = isEnglish
      ? "You are a course analyst. Summarize the provided course information concisely and accurately. Respond in English. Be direct and student-focused."
      : "你是課程分析師。請根據提供的課程資訊，簡潔準確地摘要。用繁體中文回答。以學生視角撰寫，直接切入重點。";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bullets: {
              type: Type.ARRAY,
              description:
                "Exactly 3 concise bullet points describing what students will learn or do",
              items: { type: Type.STRING },
            },
            workload: {
              type: Type.STRING,
              description: isEnglish
                ? "Estimated workload: 'Light', 'Moderate', or 'Heavy'"
                : "預估學習負擔：'輕鬆'、'適中' 或 '繁重'",
              enum: isEnglish
                ? ["Light", "Moderate", "Heavy"]
                : ["輕鬆", "適中", "繁重"],
            },
            audience: {
              type: Type.STRING,
              description:
                "One sentence describing who this course is best suited for",
            },
            difficultyRating: {
              type: Type.NUMBER,
              description: "Difficulty from 1 (very easy) to 5 (very hard)",
            },
          },
          required: ["bullets", "workload", "audience", "difficultyRating"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return c.json({ error: "Failed to generate summary" }, 500);
    }

    let summary: SyllabusSummary;
    try {
      summary = JSON.parse(text) as SyllabusSummary;
    } catch {
      return c.json({ error: "Invalid summary format from AI" }, 500);
    }

    // 6. Cache permanently (syllabi don't change mid-semester)
    await prisma.cache.upsert({
      where: { key: cacheKey },
      update: { data: JSON.stringify(summary) },
      create: { key: cacheKey, data: JSON.stringify(summary) },
    });

    return c.json(summary);
  },
);

export default app;
