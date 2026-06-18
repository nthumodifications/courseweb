export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  userContext?: UserContext;
}

export interface CourseInfo {
  raw_id: string; // e.g., "11420CS 535100"
  name_zh?: string; // Chinese name
  name_en?: string; // English name
}

export interface SemesterCourses {
  semester: string; // e.g., "11420"
  year?: number; // e.g., 2025 (for academic year)
  semesterNumber?: number; // 1 or 2
  courses: CourseInfo[];
}

export interface SelectedCourseInfo {
  raw_id: string;
  name_zh?: string;
  name_en?: string;
  times?: string[]; // 2-char pairs e.g. ["M3M4", "W3W4"] ([day_letter][period])
  credits?: number;
  semester?: string;
}

export interface UserContext {
  department?: string; // e.g., "資訊工程學系" (Chinese)
  entranceYear?: string; // e.g., "113"
  currentSemester?: string; // e.g., "11420"
  currentYear?: number; // e.g., 2025 (current academic year)
  courseHistory?: SemesterCourses[]; // All courses across all semesters
  selectedCourses?: SelectedCourseInfo[]; // All courses in timetable with time info
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
