export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  userContext?: UserContext;
  apiKey?: string; // Optional user-provided key
}

export interface UserContext {
  department?: string; // e.g., "資訊工程學系" (Chinese)
  entranceYear?: string; // e.g., "113"
  currentCourses?: string[]; // raw_ids from timetable
  semester?: string; // e.g., "11410"
  language?: "zh" | "en";
}

export interface ChatResponse {
  content: string;
  toolCalls?: {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }[];
}
