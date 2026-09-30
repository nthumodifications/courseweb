import type { Context } from "hono";
import {
  streamChatWithTools,
  type ChatStreamEvent,
  type LlmEnv,
} from "../ai/llm";
import type { ChatMessage, UserContext } from "./types";

/** Compatibility wrapper for callers that still import the old chat module. */
export function streamChat(
  c: Context,
  messages: ChatMessage[],
  userContext: UserContext,
  options: { apiKey?: string } = {},
): AsyncGenerator<ChatStreamEvent> {
  return streamChatWithTools(c, messages, userContext, {
    env: c.env as LlmEnv,
    userGeminiKey: options.apiKey,
  });
}
