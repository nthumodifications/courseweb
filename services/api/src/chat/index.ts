import { Hono } from "hono";
import { streamChat } from "./gemini";
import type { ChatRequest } from "./types";
import { auth } from "../utils/auth";

type Bindings = {
  GOOGLE_CLOUD_SERVICE_ACCOUNT?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
};

const chat = new Hono<{ Bindings: Bindings }>()
  // Apply auth middleware - requires user to be authenticated (no specific scope required)
  .use("/*", auth())
  .post("/", async (c) => {
    const body = await c.req.json<ChatRequest>();
    const { messages, userContext } = body;

    const serviceAccountJson = c.env.GOOGLE_CLOUD_SERVICE_ACCOUNT;
    const project = c.env.GOOGLE_CLOUD_PROJECT;
    const location = c.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!serviceAccountJson || !project) {
      return c.json(
        {
          error:
            "Vertex AI not configured. Missing GOOGLE_CLOUD_SERVICE_ACCOUNT or GOOGLE_CLOUD_PROJECT.",
        },
        500,
      );
    }

    let credentials: object;
    try {
      credentials = JSON.parse(atob(serviceAccountJson));
    } catch {
      return c.json(
        {
          error:
            "Invalid GOOGLE_CLOUD_SERVICE_ACCOUNT value (expected base64-encoded JSON).",
        },
        500,
      );
    }

    if (!messages || messages.length === 0) {
      return c.json({ error: "No messages provided" }, 400);
    }

    try {
      // Create streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamChat(c, messages, userContext || {}, {
              project,
              location,
              credentials,
            });

            for await (const event of generator) {
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            const errorEvent = {
              type: "error",
              data: error instanceof Error ? error.message : "Unknown error",
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
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      return c.json(
        {
          error: error instanceof Error ? error.message : "Chat request failed",
        },
        500,
      );
    }
  })

  .get("/", (c) => {
    return c.json({
      name: "NTHUMods AI Chat",
      version: "1.0.0",
      model: "gemini-2.0-flash-exp",
      description: "AI course planning assistant",
      requiresAuth: true,
    });
  });

export default chat;
