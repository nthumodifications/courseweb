import type { UserContext } from "./types";

/**
 * Builds the system prompt for the AI.
 *
 * @param context - User context passed from frontend via ChatRequest.userContext
 *                  Frontend gets this from:
 *                  - useUserTimetable hook (currentCourses, semester)
 *                  - localStorage (department, entranceYear from AIPreferences)
 *                  - Browser settings (language)
 */
export function buildSystemPrompt(context: UserContext): string {
  const lang = context.language === "en" ? "English" : "繁體中文";

  const sections: string[] = [
    `你是 NTHUMods AI 助手，專門協助國立清華大學學生規劃課程。
You are NTHUMods AI, a course planning assistant for NTHU students.`,

    `## 可用工具 / Available Tools
- search_courses: 搜尋課程 (用名稱、主題、教授名搜尋)
- get_course_details: 取得課程詳細資訊
- compare_courses: 比較多個主題的課程
- get_graduation_requirements: 查詢畢業學分 (系所需用中文)`,

    `## 回覆語言 / Response Language: ${lang}`,
  ];

  // Add user context if available
  if (
    context.department ||
    context.entranceYear ||
    context.currentCourses?.length
  ) {
    sections.push(`## 使用者資訊 / User Context`);

    if (context.department) {
      sections.push(`系所 Department: ${context.department}`);
    }
    if (context.entranceYear) {
      sections.push(`入學年度 Entrance Year: ${context.entranceYear}`);
    }
    if (context.currentCourses?.length) {
      sections.push(
        `已選課程 Current Courses (${context.currentCourses.length} 門):`,
      );
      sections.push(context.currentCourses.slice(0, 10).join(", "));
      if (context.currentCourses.length > 10) {
        sections.push(`...還有 ${context.currentCourses.length - 10} 門`);
      }
    }
    if (context.semester) {
      sections.push(`當前學期 Current Semester: ${context.semester}`);
    }
  }

  sections.push(`## 重要規則 / Important Rules
1. 優先使用工具獲取資訊，不要憑記憶回答課程問題
2. 課程代碼格式: "11410CS 535100" (學期+系所+課號)
3. 搜尋時用課程名稱或主題，不要用課號
4. 每次推薦 3-5 門最相關課程
5. 考慮時間衝堂問題`);

  return sections.join("\n\n");
}
