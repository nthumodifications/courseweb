import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { ChatMessage, UserContext } from "./types";
import { TOOL_DECLARATIONS, executeTool } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import type { Context } from "hono";

interface VertexAIChatOptions {
  project: string;
  location: string;
  credentials: object;
  model?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildAI(options: VertexAIChatOptions): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true,
    project: options.project,
    location: options.location,
    googleAuthOptions: {
      credentials: options.credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
  });
}

export async function* streamChat(
  c: Context,
  messages: ChatMessage[],
  userContext: UserContext,
  options: VertexAIChatOptions,
): AsyncGenerator<{
  type: "text" | "tool_call" | "tool_result" | "done";
  data?: unknown;
}> {
  const ai = buildAI(options);
  const model = options.model || "gemini-2.0-flash-lite";
  const systemPrompt = buildSystemPrompt(userContext);

  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  let fullText = "";
  let currentMessages: Array<{
    role: string;
    parts: Array<{
      text?: string;
      functionResponse?: unknown;
      inlineData?: { mimeType: string; data: string };
    }>;
  }> = [...geminiMessages];
  const MAX_TURNS = 10;
  let turnCount = 0;

  while (turnCount < MAX_TURNS) {
    turnCount++;

    const response = await ai.models.generateContentStream({
      model,
      contents: currentMessages,
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

    const toolResults: Array<{
      name: string;
      result?: unknown;
      error?: string;
    }> = [];

    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
        yield { type: "text", data: chunk.text };
      }

      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        for (const fc of chunk.functionCalls) {
          yield { type: "tool_call", data: { name: fc.name, args: fc.args } };

          try {
            const result = await executeTool(
              c,
              fc.name!,
              fc.args as Record<string, unknown>,
              userContext,
            );
            toolResults.push({ name: fc.name!, result });
            yield { type: "tool_result", data: { name: fc.name, result } };
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : "Tool execution failed";
            toolResults.push({ name: fc.name!, error: errorMsg });
            yield {
              type: "tool_result",
              data: { name: fc.name, error: errorMsg },
            };
          }
        }
      }
    }

    if (toolResults.length === 0) {
      break;
    }

    const modelParts: Array<{
      functionResponse?: unknown;
      inlineData?: { mimeType: string; data: string };
    }> = [];

    for (const tr of toolResults) {
      const responseData = tr.error ? { error: tr.error } : tr.result;

      // If the tool result contains a PDF URL, fetch it and pass as inline data
      if (
        !tr.error &&
        typeof tr.result === "object" &&
        tr.result !== null &&
        "uploadToGemini" in tr.result &&
        "pdfUrl" in tr.result
      ) {
        const resultObj = tr.result as Record<string, unknown>;

        try {
          const pdfResponse = await fetch(resultObj.pdfUrl as string);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
          }

          const pdfBuffer = await pdfResponse.arrayBuffer();
          const base64Data = arrayBufferToBase64(pdfBuffer);

          const { uploadToGemini, pdfUrl, ...responseWithoutUpload } =
            resultObj;
          modelParts.push({
            functionResponse: {
              name: tr.name,
              response: {
                ...responseWithoutUpload,
                message: `已解析PDF: ${resultObj.college} ${resultObj.department} ${resultObj.entranceYear} 入學年度畢業學分表`,
              },
            },
          });

          modelParts.push({
            inlineData: { mimeType: "application/pdf", data: base64Data },
          });
        } catch (error) {
          console.error("PDF fetch error:", error);
          const { uploadToGemini, ...fallbackResponse } = resultObj;
          modelParts.push({
            functionResponse: {
              name: tr.name,
              response: {
                ...fallbackResponse,
                note: "無法讀取PDF，請使用連結查看",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            },
          });
        }
      } else {
        modelParts.push({
          functionResponse: {
            name: tr.name,
            response: responseData,
          },
        });
      }
    }

    currentMessages = [
      ...currentMessages,
      { role: "model", parts: modelParts },
    ];
  }

  yield { type: "done" };
}

export async function chat(
  c: Context,
  messages: ChatMessage[],
  userContext: UserContext,
  options: VertexAIChatOptions,
): Promise<{ text: string; toolResults: { name: string; result: unknown }[] }> {
  const ai = buildAI(options);
  const model = options.model || "gemini-2.0-flash-lite";
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

  if (response.functionCalls) {
    for (const fc of response.functionCalls) {
      const result = await executeTool(
        c,
        fc.name!,
        fc.args as Record<string, unknown>,
        userContext,
      );
      toolResults.push({ name: fc.name!, result });
    }
  }

  return {
    text: response.text || "",
    toolResults,
  };
}
