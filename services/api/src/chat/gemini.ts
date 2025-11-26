import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { ChatMessage, UserContext } from "./types";
import { TOOL_DECLARATIONS, executeTool } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import type { Context } from "hono";

interface GeminiChatOptions {
  apiKey: string;
  model?: string;
}

export async function* streamChat(
  c: Context,
  messages: ChatMessage[],
  userContext: UserContext,
  options: GeminiChatOptions,
): AsyncGenerator<{
  type: "text" | "tool_call" | "tool_result" | "done";
  data?: unknown;
}> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const model = options.model || "gemini-2.0-flash-exp";

  // Build system prompt with user context
  const systemPrompt = buildSystemPrompt(userContext);

  // Convert messages to Gemini format
  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Initial generation with tools
  const response = await ai.models.generateContentStream({
    model,
    contents: geminiMessages,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
        },
      },
    },
  });

  let fullText = "";
  const pendingToolCalls: { name: string; args: Record<string, unknown> }[] =
    [];

  for await (const chunk of response) {
    // Handle text chunks
    if (chunk.text) {
      fullText += chunk.text;
      yield { type: "text", data: chunk.text };
    }

    // Handle function calls
    if (chunk.functionCalls && chunk.functionCalls.length > 0) {
      for (const fc of chunk.functionCalls) {
        yield { type: "tool_call", data: { name: fc.name, args: fc.args } };

        // Execute the tool
        try {
          const result = await executeTool(
            c,
            fc.name!,
            fc.args as Record<string, unknown>,
          );
          yield { type: "tool_result", data: { name: fc.name, result } };

          // For multi-turn: would need to send result back and continue
          // For now, we'll include tool results in the final response
        } catch (error) {
          yield {
            type: "tool_result",
            data: {
              name: fc.name,
              error:
                error instanceof Error
                  ? error.message
                  : "Tool execution failed",
            },
          };
        }
      }
    }
  }

  yield { type: "done" };
}

// Non-streaming version for simpler use cases
export async function chat(
  c: Context,
  messages: ChatMessage[],
  userContext: UserContext,
  options: GeminiChatOptions,
): Promise<{ text: string; toolResults: { name: string; result: unknown }[] }> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const model = options.model || "gemini-2.0-flash-exp";
  const systemPrompt = buildSystemPrompt(userContext);

  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await ai.models.generateContent({
    model,
    contents: geminiMessages,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
    },
  });

  const toolResults: { name: string; result: unknown }[] = [];

  // Execute any function calls
  if (response.functionCalls) {
    for (const fc of response.functionCalls) {
      const result = await executeTool(
        c,
        fc.name!,
        fc.args as Record<string, unknown>,
      );
      toolResults.push({ name: fc.name!, result });
    }
  }

  return {
    text: response.text || "",
    toolResults,
  };
}
