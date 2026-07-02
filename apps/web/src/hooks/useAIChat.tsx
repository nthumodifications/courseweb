import { useState, useCallback, useRef, useEffect } from "react";
import useUserTimetable from "./contexts/useUserTimetable";
import { useAuth } from "react-oidc-context";
import { event as gtagEvent } from "@/lib/gtag";

export interface QuotaError {
  isQuotaExceeded: true;
  retryAfter?: number; // seconds to wait before retry
  message: string;
}

export interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  metadata?: {
    courses?: string[]; // raw_ids mentioned
  };
}

export interface CourseInfo {
  raw_id: string;
  name_zh?: string;
  name_en?: string;
}

export interface SemesterCourses {
  semester: string;
  year?: number;
  semesterNumber?: number;
  courses: CourseInfo[];
}

export interface SelectedCourseInfo {
  raw_id: string;
  name_zh?: string;
  name_en?: string;
  times?: string[]; // 2-char pairs e.g. ["M3M4", "W3W4"]
  credits?: number;
  semester?: string;
}

export interface UserContext {
  department?: string;
  entranceYear?: string;
  currentSemester?: string;
  currentYear?: number;
  courseHistory?: SemesterCourses[];
  selectedCourses?: SelectedCourseInfo[];
  language?: "zh" | "en";
}

interface UseAIChatOptions {
  apiEndpoint?: string;
  userApiKey?: string;
}

const HISTORY_KEY = "nthumods_chat_history";
const HISTORY_MAX = 100;

export function useAIChat(options: UseAIChatOptions = {}) {
  const apiEndpoint =
    options.apiEndpoint || `${import.meta.env.VITE_COURSEWEB_API_URL}/chat`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as ChatMessage[];
      return parsed.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
        isStreaming: false,
      }));
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist chat history to localStorage
  useEffect(() => {
    const toSave = messages.filter((m) => !m.isStreaming);
    if (messages.length === 0) {
      localStorage.removeItem(HISTORY_KEY);
    } else if (toSave.length > 0) {
      try {
        localStorage.setItem(
          HISTORY_KEY,
          JSON.stringify(toSave.slice(-HISTORY_MAX)),
        );
      } catch {}
    }
  }, [messages]);

  // Get user's current courses from timetable
  const { courses, semester, getSemesterCourses } = useUserTimetable();
  const { user } = useAuth();

  // Build user context from timetable and stored preferences
  const getUserContext = useCallback((): UserContext => {
    let department: string | undefined;
    let entranceYear: string | undefined;

    try {
      const prefs = localStorage.getItem("ai_user_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        department = parsed.department;
        entranceYear = parsed.entranceYear;
      }
    } catch {}

    const language =
      typeof navigator !== "undefined" && navigator.language.startsWith("zh")
        ? "zh"
        : "en";

    const courseHistory: SemesterCourses[] = [];
    Object.keys(courses).forEach((sem) => {
      const semesterCourseData = getSemesterCourses(sem);
      if (semesterCourseData && semesterCourseData.length > 0) {
        const firstCourseId = semesterCourseData[0].raw_id;
        const yearPart = parseInt(firstCourseId.substring(0, 3));
        const semesterPart = parseInt(firstCourseId.substring(3, 5));

        courseHistory.push({
          semester: sem,
          year: 1911 + yearPart,
          semesterNumber:
            semesterPart === 10 ? 1 : semesterPart === 20 ? 2 : undefined,
          courses: semesterCourseData.map((course) => ({
            raw_id: course.raw_id,
            name_zh: course.name_zh,
            name_en: course.name_en,
          })),
        });
      }
    });

    const currentYear = semester
      ? 1911 + parseInt(semester.substring(0, 3))
      : undefined;

    // Build selected courses list with time/credit info for conflict detection
    const selectedCourses: SelectedCourseInfo[] = Object.keys(courses).flatMap(
      (sem) => {
        const semCourses = getSemesterCourses(sem);
        return semCourses.map((c) => ({
          raw_id: c.raw_id,
          name_zh: c.name_zh,
          name_en: c.name_en,
          times: c.times,
          credits: c.credits,
          semester: sem,
        }));
      },
    );

    return {
      department,
      entranceYear,
      currentSemester: semester,
      currentYear,
      courseHistory,
      selectedCourses: selectedCourses.length > 0 ? selectedCourses : undefined,
      language,
    };
  }, [courses, semester, getSemesterCourses]);

  // Send message to AI
  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      gtagEvent({
        action: "ai_chat_message_sent",
        category: "AI Chat",
        label: "User Message",
        data: {
          message_length: content.length,
          has_context: !!(
            getUserContext().department || getUserContext().currentSemester
          ),
        },
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      abortControllerRef.current = new AbortController();

      try {
        const userContext = getUserContext();

        let apiKey: string | undefined;
        try {
          const settings = localStorage.getItem("ai_settings");
          if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.useCustomKey && parsed.apiKey) {
              apiKey = parsed.apiKey;
            }
          }
        } catch {}

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user?.access_token && {
              Authorization: `Bearer ${user.access_token}`,
            }),
          },
          body: JSON.stringify({
            messages: messages.concat(userMessage).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userContext,
            apiKey,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("請先登入以使用 AI 課程助手");
          }
          if (response.status === 403) {
            throw new Error("您沒有權限使用此功能");
          }
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const retrySeconds = retryAfter
              ? parseInt(retryAfter, 10)
              : undefined;

            setQuotaError({
              isQuotaExceeded: true,
              retryAfter: retrySeconds,
              message: "API 配額已超出限制，請稍後再試或使用您自己的 API Key",
            });

            setMessages((prev) =>
              prev.filter((m) => m.id !== assistantMessage.id),
            );
            setIsLoading(false);
            return;
          }
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";
        const toolCalls: ToolCall[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "error" && parsed.data) {
                  const errorData =
                    typeof parsed.data === "string"
                      ? parsed.data
                      : JSON.stringify(parsed.data);
                  if (
                    errorData.includes("429") ||
                    errorData.includes("RESOURCE_EXHAUSTED") ||
                    errorData.includes("quota")
                  ) {
                    const retryMatch = errorData.match(/retry.*?(\d+)/i);
                    const retrySeconds = retryMatch
                      ? parseInt(retryMatch[1], 10)
                      : undefined;

                    setQuotaError({
                      isQuotaExceeded: true,
                      retryAfter: retrySeconds,
                      message:
                        "API 配額已超出限制，請稍後再試或使用您自己的 API Key",
                    });

                    setMessages((prev) =>
                      prev.filter((m) => m.id !== assistantMessage.id),
                    );
                    setIsLoading(false);
                    return;
                  }
                }

                if (parsed.type === "text" && parsed.data) {
                  fullContent += parsed.data;

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? {
                            ...m,
                            content: fullContent,
                            toolCalls: [...toolCalls],
                          }
                        : m,
                    ),
                  );
                }

                if (parsed.type === "tool_call" && parsed.data) {
                  const toolCall: ToolCall = {
                    name: parsed.data.name,
                    args: parsed.data.args,
                  };
                  toolCalls.push(toolCall);

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? {
                            ...m,
                            content: fullContent,
                            toolCalls: [...toolCalls],
                          }
                        : m,
                    ),
                  );
                }

                if (parsed.type === "tool_result" && parsed.data) {
                  const lastToolCall = toolCalls[toolCalls.length - 1];
                  if (lastToolCall && lastToolCall.name === parsed.data.name) {
                    if (parsed.data.error) {
                      lastToolCall.error = parsed.data.error;
                    } else {
                      lastToolCall.result = parsed.data.result;
                    }

                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessage.id
                          ? {
                              ...m,
                              content: fullContent,
                              toolCalls: [...toolCalls],
                            }
                          : m,
                      ),
                    );
                  }
                }
              } catch (e) {
                console.error("Failed to parse SSE line:", line, e);
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: fullContent, isStreaming: false, toolCalls }
              : m,
          ),
        );

        gtagEvent({
          action: "ai_chat_response_received",
          category: "AI Chat",
          label: "Assistant Response",
          data: {
            response_length: fullContent.length,
            tools_used: toolCalls.length,
            tool_names: toolCalls.map((t) => t.name).join(","),
          },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantMessage.id),
          );
          gtagEvent({
            action: "ai_chat_cancelled",
            category: "AI Chat",
            label: "User Cancelled",
          });
        } else {
          setError((err as Error).message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    content: "抱歉，發生錯誤。請稍後再試。",
                    isStreaming: false,
                  }
                : m,
            ),
          );
          gtagEvent({
            action: "ai_chat_error",
            category: "AI Chat",
            label: "Error",
            data: {
              error_message: (err as Error).message,
            },
          });
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, getUserContext, apiEndpoint, user],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setQuotaError(null);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const clearQuotaError = useCallback(() => {
    setQuotaError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    quotaError,
    sendMessage,
    cancel,
    clear,
    clearQuotaError,
    getUserContext,
  };
}
