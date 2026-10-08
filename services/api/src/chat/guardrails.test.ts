import { describe, expect, it } from "bun:test";
import {
  MAX_MESSAGE_CHARACTERS,
  MAX_MESSAGES_PER_REQUEST,
  MAX_TOTAL_REQUEST_CHARACTERS,
  validateChatRequest,
} from "./guardrails";

const message = (content = "hello") => ({ role: "user", content });

describe("chat request guardrails", () => {
  it("rejects a request with too many messages", () => {
    const result = validateChatRequest({
      messages: Array.from({ length: MAX_MESSAGES_PER_REQUEST + 1 }, message),
    });

    expect(result).toMatchObject({ success: false, status: 400 });
    if (!result.success)
      expect(result.error).toContain(`${MAX_MESSAGES_PER_REQUEST}`);
  });

  it("rejects a message that exceeds the per-message character cap", () => {
    const result = validateChatRequest({
      messages: [message("x".repeat(MAX_MESSAGE_CHARACTERS + 1))],
    });

    expect(result).toMatchObject({ success: false, status: 400 });
    if (!result.success)
      expect(result.error).toContain(`${MAX_MESSAGE_CHARACTERS}`);
  });

  it("rejects a request whose serialized body is too large", () => {
    const result = validateChatRequest(
      { messages: [message("x".repeat(10))] },
      MAX_TOTAL_REQUEST_CHARACTERS + 1,
    );

    expect(result).toEqual({
      success: false,
      status: 413,
      error: `Chat request exceeds the ${MAX_TOTAL_REQUEST_CHARACTERS}-character limit`,
    });
  });

  it("whitelists only context needed by prompts and tools", () => {
    const result = validateChatRequest({
      messages: [message()],
      userContext: {
        department: "資訊工程學系",
        entranceYear: "113",
        currentSemester: "11510",
        currentYear: 2026,
        language: "zh",
        token: "must-not-reach-the-model",
        email: "student@example.com",
        studentId: "S123456",
        selectedCourses: [
          {
            raw_id: "11510CS 535100",
            name_zh: "人工智慧",
            times: ["M3M4"],
            credits: 3,
          },
        ],
        courseHistory: [
          {
            semester: "11420",
            year: 2025,
            semesterNumber: 2,
            courses: [{ raw_id: "11420CS 135100", name_en: "Algorithms" }],
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.userContext).toEqual({
      department: "資訊工程學系",
      entranceYear: "113",
      currentSemester: "11510",
      currentYear: 2026,
      selectedCourses: [
        { raw_id: "11510CS 535100", name_zh: "人工智慧", times: ["M3M4"] },
      ],
      courseHistory: [
        {
          semester: "11420",
          courses: [{ raw_id: "11420CS 135100", name_en: "Algorithms" }],
        },
      ],
    });
  });
});
