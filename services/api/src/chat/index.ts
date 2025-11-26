import { Hono } from "hono";
import { streamChat } from "./gemini";
import type { ChatRequest } from "./types";

// Extend Bindings type to include GOOGLE_AI_API_KEY
type Bindings = {
  GOOGLE_AI_API_KEY?: string;
};

const chat = new Hono<{ Bindings: Bindings }>()
  .post("/", async (c) => {
    const body = await c.req.json<ChatRequest>();
    const { messages, userContext, apiKey } = body;

    // Use user's API key or fall back to default
    const effectiveApiKey = apiKey || c.env.GOOGLE_AI_API_KEY;

    if (!effectiveApiKey) {
      return c.json(
        {
          error:
            "No API key configured. Please provide your own Gemini API key in settings.",
        },
        400,
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
              apiKey: effectiveApiKey,
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
    });
  });

export default chat;
