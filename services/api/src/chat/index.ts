import { Hono } from "hono";
import { streamChat } from "./gemini";
import type { ChatRequest } from "./types";
import { auth } from "../utils/auth";
import type { LlmEnv } from "../ai/llm";

type Bindings = LlmEnv & Record<string, unknown>;

const chat = new Hono<{ Bindings: Bindings }>()
  // Apply auth middleware - requires user to be authenticated (no specific scope required)
  .use("/*", auth())
  .post("/", async (c) => {
    let body: ChatRequest;
    try {
      body = await c.req.json<ChatRequest>();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { messages, userContext, apiKey } = body;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.some(
        (message) =>
          !message ||
          (message.role !== "user" && message.role !== "assistant") ||
          typeof message.content !== "string",
      )
    ) {
      return c.json({ error: "No messages provided" }, 400);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChat(c, messages, userContext || {}, {
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
