import { Hono } from "hono";
import { streamChat } from "./gemini";
import type { ChatRequest } from "./types";
import { auth } from "../utils/auth";
import { rateLimitMiddleware, userIdKeyGenerator } from "../utils/rate-limit";
import type { LlmEnv } from "../ai/llm";
import {
  sanitizeUserContext,
  validateChatRequest,
  MAX_TOTAL_REQUEST_CHARACTERS,
} from "./guardrails";

type Bindings = LlmEnv & Record<string, unknown>;

const chat = new Hono<{ Bindings: Bindings }>()
  // Apply auth middleware - requires user to be authenticated (no specific scope required)
  .use("/*", auth())
  .use(
    "/*",
    rateLimitMiddleware({
      limiter: "AI_RATE_LIMITER",
      keyGenerator: userIdKeyGenerator,
      errorMessage: "Too many AI requests. Please try again in a minute.",
    }),
  )
  .post("/", async (c) => {
    let rawBody: string;
    try {
      rawBody = await c.req.text();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (rawBody.length > MAX_TOTAL_REQUEST_CHARACTERS) {
      return c.json(
        {
          error: `Chat request exceeds the ${MAX_TOTAL_REQUEST_CHARACTERS}-character limit`,
        },
        413,
      );
    }

    let input: unknown;
    try {
      input = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const validation = validateChatRequest(input, rawBody.length);
    if (!validation.success) {
      return c.json({ error: validation.error }, validation.status);
    }

    const { messages, userContext, apiKey } = validation.data as ChatRequest;
    const safeUserContext = sanitizeUserContext(userContext);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChat(c, messages, safeUserContext, {
            apiKey,
          });
          for await (const event of generator) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorEvent = {
            type: "error",
            data: error instanceof Error ? error.message : "Unknown error",
            code: "unknown",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  })

  .get("/", (c) => {
    return c.json({
      name: "NTHUMods AI Chat",
      version: "1.0.0",
      model: "provider-chain",
      description: "AI course planning assistant",
      requiresAuth: true,
    });
  });

export default chat;
