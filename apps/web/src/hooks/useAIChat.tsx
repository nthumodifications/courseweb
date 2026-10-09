import { useState, useCallback, useRef, useEffect } from "react";
import useUserTimetable from "./contexts/useUserTimetable";
import { useAuth } from "react-oidc-context";
import { event as gtagEvent } from "@/lib/gtag";
import { SSEParser, ParsedSSEEvent } from "./sseParser";

export type ChatErrorCode =
  | "quota"
  | "auth"
  | "unavailable"
  | "bad_request"
  | "unknown";

export interface ChatError {
  code: ChatErrorCode;
  message: string;
}

export interface QuotaError {
  isQuotaExceeded: true;
  retryAfter?: number;
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
  errorCode?: ChatErrorCode;
  metadata?: {
    courses?: string[];
    provider?: string;
    model?: string;
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
  times?: string[];
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

class ChatFailure extends Error {
  constructor(
    public readonly code: ChatErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ChatFailure";
  }
}

function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return (
    value === "quota" ||
    value === "auth" ||
    value === "unavailable" ||
    value === "bad_request" ||
    value === "unknown"
  );
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}

function getStoredApiKey() {
  try {
    const settings = localStorage.getItem("ai_settings");
    if (!settings) return undefined;
    const parsed = JSON.parse(settings) as {
      useCustomKey?: boolean;
      apiKey?: string;
    };
    return parsed.useCustomKey && parsed.apiKey ? parsed.apiKey : undefined;
  } catch {
    return undefined;
  }
}

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
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const lastPromptRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const { courses, semester, getSemesterCourses } = useUserTimetable();
  const { user } = useAuth();

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
        const yearPart = Number.parseInt(firstCourseId.substring(0, 3));
        const semesterPart = Number.parseInt(firstCourseId.substring(3, 5));
        let semesterNumber: 1 | 2 | undefined;
        if (semesterPart === 10) semesterNumber = 1;
        else if (semesterPart === 20) semesterNumber = 2;

        courseHistory.push({
          semester: sem,
          year: 1911 + yearPart,
          semesterNumber,
          courses: semesterCourseData.map((course) => ({
            raw_id: course.raw_id,
            name_zh: course.name_zh,
            name_en: course.name_en,
          })),
        });
      }
    });

    const currentYear = semester
      ? 1911 + Number.parseInt(semester.substring(0, 3))
      : undefined;

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

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };
      const conversation = messagesRef.current;
      messagesRef.current = [...conversation, userMessage, assistantMessage];
      setMessages(messagesRef.current);
      lastPromptRef.current = content;
      setIsLoading(true);
      loadingRef.current = true;
      setError(null);
      setChatError(null);
      setQuotaError(null);
      setRequiresSignIn(false);

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

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const toolCalls: ToolCall[] = [];
      let fullContent = "";
      let metadata: ChatMessage["metadata"];
      let receivedDone = false;

      const updateAssistant = (changes: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, ...changes }
              : message,
          ),
        );
      };

      const handleEvent = (event: ParsedSSEEvent | "[DONE]") => {
        if (event === "[DONE]") return;

        if (event.type === "done") {
          receivedDone = true;
          return;
        }

        if (event.type === "meta") {
          const data = event.data as {
            provider: NonNullable<ChatMessage["metadata"]>["provider"];
            model?: string;
          };
          metadata = {
            ...metadata,
            ...(data?.provider ? { provider: data.provider } : {}),
            ...(data?.model ? { model: data.model } : {}),
          };
          updateAssistant({ metadata });
          return;
        }

        if (event.type === "error") {
          const code = isChatErrorCode(event.code) ? event.code : "unknown";
          throw new ChatFailure(
            code,
            getErrorMessage(
              event.data,
              "The AI service could not complete the request.",
            ),
          );
        }

        if (event.type === "text") {
          if (typeof event.data !== "string") return;
          fullContent += event.data;
          updateAssistant({
            content: fullContent,
            toolCalls: [...toolCalls],
            metadata,
          });
          return;
        }

        if (event.type === "tool_call") {
          const data = event.data as {
            name?: string;
            args?: Record<string, unknown>;
          };
          if (!data?.name) return;
          toolCalls.push({ name: data.name, args: data.args });
          updateAssistant({ content: fullContent, toolCalls: [...toolCalls] });
          return;
        }

        if (event.type === "tool_result") {
          const data = event.data as {
            name?: string;
            result?: unknown;
            error?: string;
          };
          if (!data?.name) return;
          const toolIndex = [...toolCalls]
            .map((tool, index) => ({ tool, index }))
            .reverse()
            .find(
              ({ tool }) =>
                tool.name === data.name &&
                tool.result === undefined &&
                !tool.error,
            )?.index;
          if (toolIndex === undefined) return;
          toolCalls[toolIndex] = {
            ...toolCalls[toolIndex],
            ...(data.error ? { error: data.error } : { result: data.result }),
          };
          updateAssistant({ content: fullContent, toolCalls: [...toolCalls] });
        }
      };

      const removeAssistant = () => {
        messagesRef.current = messagesRef.current.filter(
          (message) => message.id !== assistantMessage.id,
        );
        setMessages(messagesRef.current);
      };

      try {
        const userContext = getUserContext();
        const apiKey = options.userApiKey || getStoredApiKey();
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user?.access_token && {
              Authorization: `Bearer ${user.access_token}`,
            }),
          },
          body: JSON.stringify({
            messages: conversation.concat(userMessage).map((message) => ({
              role: message.role,
              content: message.content,
            })),
            userContext,
            apiKey,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: unknown;
          } | null;
          if (response.status === 401) {
            setRequiresSignIn(true);
            setError(null);
            setChatError(null);
            removeAssistant();
            return;
          }

          let code: ChatErrorCode = "unknown";
          if (response.status === 429) code = "quota";
          else if (response.status === 400) code = "bad_request";
          else if (response.status >= 500) code = "unavailable";
          const message = getErrorMessage(
            payload?.error ?? payload,
            `Chat request failed (${response.status}).`,
          );
          setChatError({ code, message });
          setError(message);
          if (code === "quota") {
            const retryAfter = Number.parseInt(
              response.headers.get("Retry-After") || "",
              10,
            );
            setQuotaError({
              isQuotaExceeded: true,
              retryAfter: Number.isNaN(retryAfter) ? undefined : retryAfter,
              message,
            });
          }
          removeAssistant();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new ChatFailure(
            "unavailable",
            "No response stream was returned.",
          );
        }

        const parser = new SSEParser();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const event of parser.push(
            decoder.decode(value, { stream: true }),
          )) {
            handleEvent(event);
          }
        }
        for (const event of parser.push(decoder.decode())) handleEvent(event);
        for (const event of parser.finish()) handleEvent(event);

        if (receivedDone && !fullContent.trim() && toolCalls.length === 0) {
          throw new Error("AI provider returned an empty response");
        }

        updateAssistant({
          content: fullContent,
          isStreaming: false,
          toolCalls: [...toolCalls],
          metadata,
        });

        gtagEvent({
          action: "ai_chat_response_received",
          category: "AI Chat",
          label: "Assistant Response",
          data: {
            response_length: fullContent.length,
            tools_used: toolCalls.length,
            tool_names: toolCalls.map((tool) => tool.name).join(","),
          },
        });
      } catch (caughtError) {
        if ((caughtError as Error).name === "AbortError") {
          removeAssistant();
          gtagEvent({
            action: "ai_chat_cancelled",
            category: "AI Chat",
            label: "User Cancelled",
          });
        } else {
          const failure =
            caughtError instanceof ChatFailure
              ? caughtError
              : new ChatFailure(
                  "unavailable",
                  "The AI service is temporarily unavailable.",
                );
          setChatError({ code: failure.code, message: failure.message });
          setError(failure.message);
          if (failure.code === "quota") {
            setQuotaError({
              isQuotaExceeded: true,
              message: failure.message,
            });
          }

          if (fullContent || toolCalls.length > 0) {
            updateAssistant({
              content: fullContent,
              isStreaming: false,
              toolCalls: [...toolCalls],
              metadata,
              errorCode: failure.code,
            });
          } else {
            removeAssistant();
          }

          gtagEvent({
            action: "ai_chat_error",
            category: "AI Chat",
            label: failure.code,
            data: { error_message: failure.message },
          });
        }
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [getUserContext, apiEndpoint, options.userApiKey, user],
  );

  const retryLastMessage = useCallback(async () => {
    if (loadingRef.current || !lastPromptRef.current) return;
    const prompt = lastPromptRef.current;
    const currentMessages = messagesRef.current;
    const lastUserIndex = currentMessages
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(
        ({ message }) => message.role === "user" && message.content === prompt,
      )?.index;
    const baseMessages =
      lastUserIndex === undefined
        ? currentMessages
        : currentMessages.slice(0, lastUserIndex);
    messagesRef.current = baseMessages;
    setMessages(baseMessages);
    await sendMessage(prompt);
  }, [sendMessage]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setChatError(null);
    setQuotaError(null);
    setRequiresSignIn(false);
    lastPromptRef.current = null;
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const clearQuotaError = useCallback(() => {
    setQuotaError(null);
    setChatError((current) => (current?.code === "quota" ? null : current));
    setError((current) => (chatError?.code === "quota" ? null : current));
  }, [chatError]);

  const clearError = useCallback(() => {
    setError(null);
    setChatError(null);
    setQuotaError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    chatError,
    quotaError,
    requiresSignIn,
    sendMessage,
    retryLastMessage,
    cancel,
    clear,
    clearQuotaError,
    clearError,
    getUserContext,
  };
}
