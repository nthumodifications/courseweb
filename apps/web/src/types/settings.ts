export type Language = "en" | "zh" | "zh-cn";

export interface SettingsType {
  language: Language;
  darkMode: boolean;
  courses: string[];
}
