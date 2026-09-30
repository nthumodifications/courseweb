import { Hono } from "hono";
import type { Bindings } from "../index";
import summarize from "./summarize";
import searchIntent from "./search-intent";
import { testGeminiKey } from "./llm";

const app = new Hono<{ Bindings: Bindings }>()
  .post("/test-key", async (c) => {
    let body: { apiKey?: unknown };
    try {
      body = await c.req.json<{ apiKey?: unknown }>();
    } catch {
      return c.json({ ok: false, code: "auth", error: "Invalid JSON body" }, 200);
    }
    if (typeof body.apiKey !== "string" || !body.apiKey.trim()) {
      return c.json({ ok: false, code: "auth", error: "A Gemini API key is required" }, 200);
    }
    const result = await testGeminiKey(body.apiKey.trim());
    return c.json(result, 200);
  })
  .get("/status", (c) =>
    c.json({
      providers: [
        { name: "gemini", configured: Boolean(c.env.GOOGLE_AI_API_KEY) },
        { name: "groq", configured: Boolean(c.env.GROQ_API_KEY) },
        { name: "workers-ai", configured: Boolean(c.env.AI) },
      ],
      chat: true,
    }),
  )
  .route("/search-intent", searchIntent)
  .route("/summarize", summarize);

export default app;
