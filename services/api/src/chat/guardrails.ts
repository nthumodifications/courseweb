import { z } from "zod";
import type { ChatRequest, UserContext } from "./types";

/**
 * The web client keeps at most 100 history entries, then sends that history
 * plus the new user message. The remaining headroom prevents a normal client
 * history from being rejected while bounding provider input size.
 */
export const MAX_MESSAGES_PER_REQUEST = 120;
export const MAX_MESSAGE_CHARACTERS = 16_000;
export const MAX_TOTAL_REQUEST_CHARACTERS = 400_000;

const contextText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value ?? undefined);

const contextSemester = contextText(20);

const courseForContextSchema = z
  .object({
    raw_id: contextText(100),
    name_zh: contextText(200),
    name_en: contextText(200),
  })
  .strip();

const selectedCourseSchema = z
  .object({
    raw_id: contextText(100),
    name_zh: contextText(200),
    name_en: contextText(200),
    times: z
      .array(z.string().trim().max(20))
      .max(20)
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    semester: contextSemester,
  })
  .strip();

/**
 * This is deliberately a whitelist. Unknown fields such as access tokens,
 * email addresses, and student identifiers are removed before the context is
 * passed to the prompt or a tool.
 */
const userContextSchema = z
  .object({
    department: contextText(120),
    entranceYear: contextText(4),
    currentSemester: contextSemester,
    currentYear: z.number().int().min(1900).max(2200).nullable().optional(),
    courseHistory: z
      .array(
        z
          .object({
            semester: contextSemester,
            courses: z.array(courseForContextSchema).max(100),
          })
          .strip(),
      )
      .max(100)
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    selectedCourses: z
      .array(selectedCourseSchema)
      .max(100)
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
  })
  .strip();

const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z
      .string()
      .max(
        MAX_MESSAGE_CHARACTERS,
        `Each message must be at most ${MAX_MESSAGE_CHARACTERS} characters`,
      ),
  })
  .strip();

const chatRequestSchema = z
  .object({
    messages: z
      .array(chatMessageSchema)
      .min(1, "At least one message is required")
      .max(
        MAX_MESSAGES_PER_REQUEST,
        `At most ${MAX_MESSAGES_PER_REQUEST} messages are allowed per request`,
      ),
    userContext: userContextSchema.nullable().optional(),
    apiKey: z.string().min(1).max(512).optional(),
  })
  .strip();

export type ChatRequestValidation =
  | { success: true; data: ChatRequest }
  | { success: false; status: 400 | 413; error: string };

const firstValidationError = (error: z.ZodError) => {
  const issue = error.issues[0];
  if (!issue) return "Invalid chat request";
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
};

/** Validate and whitelist the entire chat request before starting a stream. */
export function validateChatRequest(
  value: unknown,
  serializedLength = JSON.stringify(value)?.length ?? 0,
): ChatRequestValidation {
  if (serializedLength > MAX_TOTAL_REQUEST_CHARACTERS) {
    return {
      success: false,
      status: 413,
      error: `Chat request exceeds the ${MAX_TOTAL_REQUEST_CHARACTERS}-character limit`,
    };
  }

  const parsed = chatRequestSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      status: 400,
      error: firstValidationError(parsed.error),
    };
  }

  return { success: true, data: parsed.data as ChatRequest };
}

/** The exact context shape that is allowed to reach prompts and tools. */
export function sanitizeUserContext(value: unknown): UserContext {
  const parsed = userContextSchema.safeParse(value ?? {});
  return parsed.success ? (parsed.data as UserContext) : {};
}
