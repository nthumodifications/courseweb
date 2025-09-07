export type Language = "en" | "zh";

export interface SettingsType {
  language: Language;
  darkMode: boolean;
  courses: string[];
}
