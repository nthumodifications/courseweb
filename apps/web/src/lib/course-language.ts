/**
 * Course data marks the teaching language with a single character code
 * ("中" or "英"). These are data values, not UI text, so they live here
 * rather than as literals in components.
 */
export const isChineseCourseLanguage = (language: string | null | undefined) =>
  language === "中";
export const isEnglishCourseLanguage = (language: string | null | undefined) =>
  language === "英";
