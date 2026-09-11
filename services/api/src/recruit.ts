import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import supabase_server from "./config/supabase_server";
import type { Bindings } from "./index";
import { auth } from "./utils/auth";
import { rateLimitMiddleware, userIdKeyGenerator } from "./utils/rate-limit";

const RESUME_BUCKET = "resumes";
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const OPEN_ROLE_IDS = [
  "maintainer",
  "administrator",
  "frontend",
  "backend",
  "community",
] as const;

const OPEN_ROLES = OPEN_ROLE_IDS.map((id) => ({ id }));

const applicationSchema = z.object({
  role: z.enum(OPEN_ROLE_IDS),
  statement: z.string().trim().min(20).max(5000),
  contactPreference: z.enum(["email", "discord", "either"]),
  links: z
    .object({
      github: z.string().url().max(500).optional(),
      portfolio: z.string().url().max(500).optional(),
    })
    .default({}),
});

const applicationRateLimit = rateLimitMiddleware({
  limiter: "VENUE_RATE_LIMITER",
  keyGenerator: userIdKeyGenerator,
  errorMessage: "Too many recruitment requests. Please try again later.",
});

const getApplicantSub = (c: Context<{ Bindings: Bindings }>) => {
  const sub = c.get("user")?.sub;
  return sub;
};

const resumeObjectPath = (sub: string) =>
  `applicants/${encodeURIComponent(sub)}.pdf`;

const hasPdfMagicBytes = (bytes: Uint8Array) =>
  bytes.length >= 5 &&
  bytes[0] === 0x25 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x44 &&
  bytes[3] === 0x46 &&
  bytes[4] === 0x2d;

const recruit = new Hono<{ Bindings: Bindings }>()
  .get("/roles", (c) => c.json({ roles: OPEN_ROLES }))
  .get("/application", auth(), async (c) => {
    const sub = getApplicantSub(c);
    if (!sub) return c.json({ error: "Authenticated subject is missing" }, 401);

    const { data, error } = await supabase_server(c)
      .from("recruitment_applications")
      .select("id, role, status, created_at, updated_at")
      .eq("applicant_sub", sub)
      .maybeSingle();

    if (error) {
      console.error("Failed to load recruitment application:", error);
      return c.json({ error: "Failed to load application" }, 500);
    }

    return c.json(data);
  })
  .post("/resume-upload", auth(), applicationRateLimit, async (c) => {
    const sub = getApplicantSub(c);
    if (!sub) {
      return c.json({ error: "Authenticated subject is missing" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return c.json(
        { error: "A resume PDF is required", code: "RESUME_REQUIRED" },
        400,
      );
    }

    if (file.size > MAX_RESUME_BYTES) {
      return c.json(
        { error: "Resume must be 5 MB or smaller", code: "RESUME_TOO_LARGE" },
        413,
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfMagicBytes(bytes)) {
      return c.json(
        { error: "Resume must be a valid PDF", code: "INVALID_RESUME" },
        415,
      );
    }

    const objectPath = resumeObjectPath(sub);
    const { error } = await supabase_server(c)
      .storage.from(RESUME_BUCKET)
      .upload(objectPath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error("Failed to store recruitment resume:", error);
      return c.json(
        { error: "Failed to store resume", code: "RESUME_STORAGE_FAILED" },
        500,
      );
    }

    return c.json({ uploaded: true }, 201);
  })
  .post(
    "/apply",
    auth(),
    applicationRateLimit,
    zValidator("json", applicationSchema),
    async (c) => {
      const sub = getApplicantSub(c);
      if (!sub) {
        return c.json({ error: "Authenticated subject is missing" }, 401);
      }

      const supabase = supabase_server(c);
      const { data: existing, error: existingError } = await supabase
        .from("recruitment_applications")
        .select("id")
        .eq("applicant_sub", sub)
        .maybeSingle();

      if (existingError) {
        console.error(
          "Failed to check existing recruitment application:",
          existingError,
        );
        return c.json({ error: "Failed to submit application" }, 500);
      }
      if (existing) {
        return c.json(
          {
            error: "An application already exists for this account",
            code: "ALREADY_APPLIED",
          },
          409,
        );
      }

      const { role, statement, contactPreference, links } = c.req.valid("json");
      const objectPath = resumeObjectPath(sub);
      const { data: resume, error: resumeError } = await supabase.storage
        .from(RESUME_BUCKET)
        .download(objectPath);

      if (resumeError || !resume) {
        return c.json(
          {
            error: "Upload your resume before submitting an application",
            code: "RESUME_REQUIRED",
          },
          400,
        );
      }

      const { data, error } = await supabase
        .from("recruitment_applications")
        .insert({
          applicant_sub: sub,
          role,
          statement,
          contact_preference: contactPreference,
          links,
          resume_object_path: objectPath,
        })
        .select("id, role, status, created_at, updated_at")
        .single();

      if (error) {
        if (error.code === "23505") {
          return c.json(
            {
              error: "An application already exists for this account",
              code: "ALREADY_APPLIED",
            },
            409,
          );
        }
        console.error("Failed to store recruitment application:", error);
        return c.json({ error: "Failed to submit application" }, 500);
      }

      return c.json(data, 201);
    },
  );

export default recruit;
