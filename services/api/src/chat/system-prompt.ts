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
- list_departments: 列出所有系所 (取得中文系所名稱)
- get_graduation_requirements: 查詢畢業學分 (需先用list_departments取得正確中文系名)`,

    `## 回覆語言 / Response Language
**CRITICAL: Your response MUST match the user's message language.**
- If user writes in English → respond in English
- If user writes in 中文 → respond in 繁體中文
- User's preferred language setting: ${lang}
- Always match the language of the most recent user message, regardless of the preferred setting`,
  ];

  // Add user context if available
  if (
    context.department ||
    context.entranceYear ||
    context.courseHistory?.length ||
    context.currentYear
  ) {
    sections.push(`## 使用者資訊 / User Context`);

    if (context.department) {
      sections.push(`系所 Department: ${context.department}`);
    }
    if (context.entranceYear) {
      sections.push(`入學年度 Entrance Year: ${context.entranceYear}`);
    }
    if (context.currentYear) {
      sections.push(`當前學年 Current Academic Year: ${context.currentYear}`);
    }
    if (context.currentSemester) {
      sections.push(`當前學期 Current Semester: ${context.currentSemester}`);
    }

    // Add course history
    if (context.courseHistory && context.courseHistory.length > 0) {
      sections.push(`\n### 修課紀錄 Course History:`);

      context.courseHistory.forEach((semData) => {
        const semesterName =
          semData.semesterNumber === 1
            ? "第1學期"
            : semData.semesterNumber === 2
              ? "第2學期"
              : "學期";
        sections.push(
          `\n**${semData.year} ${semesterName} (${semData.semester})** - ${semData.courses.length} 門課:`,
        );

        semData.courses.forEach((course) => {
          const displayName = course.name_zh || course.name_en || course.raw_id;
          sections.push(`- ${displayName} (${course.raw_id})`);
        });
      });
    }
  }

  sections.push(`## 課程代碼格式 / Course ID Format (raw_id)
格式: <3位ROC年><2位學期><4字系所><4位課號><2位班級>
Format: <3-digit TW year><2-digit semester><4-char dept><4-digit course><2-digit class>
範例 Example: "11410CS 535100"
- 114: ROC年 (2025 AD)
- 10: 第1學期 (01=1st, 02=2nd, 03=summer)
- CS: 資工系
- 5351: 課程代碼
- 00: 班級代碼

## 重要規則 / Important Rules
1. **語言匹配**: 回覆必須與用戶訊息使用相同語言（英文→英文，中文→中文）
2. **絕不顯示原始工具輸出**: 永遠不要在回覆中直接貼上tool返回的JSON或raw data。必須用自然語言整理並回答。
3. 優先使用工具獲取資訊，不要憑記憶回答課程問題
4. 搜尋時用課程名稱或主題，不要用課號
5. **課程搜尋預設只搜尋當前學期** - search_courses會自動限制在當前學期，除非用戶明確要求其他學期（例如"113學年度第1學期的課程"），則需指定semester參數
6. 每次推薦 3-5 門最相關課程
7. 考慮時間衝堂問題
8. **查詢畢業學分時必須參考用戶修課紀錄** - 使用get_graduation_requirements取得畢業要求後，務必對照上述courseHistory來分析用戶已完成哪些要求、還缺哪些學分。提供具體建議。
9. 查詢畢業要求時，get_graduation_requirements會返回結構化的畢業要求資訊（不是PDF），請直接分析並用自然語言回答
10. 當用戶詢問特定年度或學期的課程時，請從courseHistory中查找對應資料`);

  return sections.join("\n\n");
}
