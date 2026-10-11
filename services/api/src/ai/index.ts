import { Hono } from "hono";
import type { Bindings } from "../index";
import { rateLimitMiddleware, userIdKeyGenerator } from "../utils/rate-limit";
import summarize from "./summarize";
import searchIntent from "./search-intent";
import { testGeminiKey } from "./llm";

const MAX_TEST_KEY_BODY_BYTES = 8 * 1024;

const app = new Hono<{ Bindings: Bindings }>()
  .use(
    "/*",
    rateLimitMiddleware({
      limiter: "AI_RATE_LIMITER",
      keyGenerator: userIdKeyGenerator,
      errorMessage: "Too many AI requests. Please try again in a minute.",
    }),
  )
  .post("/test-key", async (c) => {
    const contentLength = Number(c.req.header("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_TEST_KEY_BODY_BYTES
    ) {
      return c.json({ ok: false, code: "body_too_large" }, 413);
    }

    let rawBody: string;
    try {
      rawBody = await c.req.text();
    } catch {
      return c.json(
        { ok: false, code: "auth", error: "Invalid JSON body" },
        400,
      );
    }
    if (rawBody.length > MAX_TEST_KEY_BODY_BYTES) {
      return c.json({ ok: false, code: "body_too_large" }, 413);
    }

    let body: { apiKey?: unknown };
    try {
      body = JSON.parse(rawBody) as { apiKey?: unknown };
    } catch {
      return c.json(
        { ok: false, code: "auth", error: "Invalid JSON body" },
        400,
      );
    }
    if (
      !body ||
      typeof body !== "object" ||
      typeof body.apiKey !== "string" ||
      !body.apiKey.trim()
    ) {
      return c.json(
        { ok: false, code: "auth", error: "A Gemini API key is required" },
        400,
      );
    }
    const result = await testGeminiKey(body.apiKey.trim());
    return c.json(result, 200);
  })
  .get("/status", (c) =>
    c.json({
      providers: [
        { name: "gemini", configured: Boolean(c.env.GOOGLE_AI_API_KEY) },
        { name: "groq", configured: Boolean(c.env.GROQ_API_KEY) },
        { name: "cerebras", configured: Boolean(c.env.CEREBRAS_API_KEY) },
        { name: "openrouter", configured: Boolean(c.env.OPENROUTER_API_KEY) },
        { name: "mistral", configured: Boolean(c.env.MISTRAL_API_KEY) },
        { name: "workers-ai", configured: Boolean(c.env.AI) },
      ],
      chat: true,
    }),
  )
  .route("/search-intent", searchIntent)
  .route("/summarize", summarize);

export default app;
