import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  createPartFromUri,
} from "@google/genai";
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
  const model = options.model || "gemini-flash-lite-latest";

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
  let currentMessages: Array<{
    role: string;
    parts: Array<{ text?: string; functionResponse?: any }>;
  }> = [...geminiMessages];
  const MAX_TURNS = 10; // Prevent infinite loops
  let turnCount = 0;

  // Multi-turn conversation loop to handle multiple tool calls
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
    let turnHasText = false;

    // Process the response stream
    for await (const chunk of response) {
      // Handle text chunks
      if (chunk.text) {
        turnHasText = true;
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

    // If no tools were called, we're done
    if (toolResults.length === 0) {
      break;
    }

    // Add tool results to conversation history for next turn
    // Handle PDF uploads to Gemini File API
    const modelParts: any[] = [];

    for (const tr of toolResults) {
      const response = tr.error ? { error: tr.error } : tr.result;

      // Check if this tool result contains a PDF that should be uploaded to Gemini
      if (
        !tr.error &&
        typeof tr.result === "object" &&
        tr.result !== null &&
        "uploadToGemini" in tr.result &&
        "pdfUrl" in tr.result
      ) {
        const resultObj = tr.result as any;

        try {
          // Fetch the PDF
          const pdfResponse = await fetch(resultObj.pdfUrl);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
          }

          const pdfBlob = await pdfResponse.blob();

          // Upload to Gemini File API
          const uploadedFile = await ai.files.upload({
            file: pdfBlob,
            config: {
              mimeType: "application/pdf",
              displayName: `${resultObj.department}_${resultObj.entranceYear}.pdf`,
            },
          });

          // Wait for file processing
          let fileStatus = await ai.files.get({ name: uploadedFile.name! });
          let attempts = 0;
          while (fileStatus.state === "PROCESSING" && attempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            fileStatus = await ai.files.get({ name: uploadedFile.name! });
            attempts++;
          }

          if (fileStatus.state === "FAILED") {
            throw new Error("File processing failed");
          }

          // Add function response without upload flag
          const { uploadToGemini, pdfUrl, ...responseWithoutUpload } =
            resultObj;
          modelParts.push({
            functionResponse: {
              name: tr.name,
              response: {
                ...responseWithoutUpload,
                message: `已上傳並解析PDF: ${resultObj.college} ${resultObj.department} ${resultObj.entranceYear} 入學年度畢業學分表`,
              },
            },
          });

          // Add PDF file reference
          if (uploadedFile.uri && uploadedFile.mimeType) {
            modelParts.push(
              createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
            );
          }
        } catch (error) {
          console.error("PDF upload error:", error);
          // Fallback to returning URL only
          const { uploadToGemini, ...fallbackResponse } = resultObj;
          modelParts.push({
            functionResponse: {
              name: tr.name,
              response: {
                ...fallbackResponse,
                note: "無法上傳PDF，請使用連結查看",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            },
          });
        }
      } else {
        // Regular tool response
        modelParts.push({
          functionResponse: {
            name: tr.name,
            response,
          },
        });
      }
    }

    currentMessages = [
      ...currentMessages,
      {
        role: "model",
        parts: modelParts,
      },
    ];

    // Continue to next turn to let model respond to tool results
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
