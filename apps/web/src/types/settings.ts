export type Language = "en" | "zh";
export type ZhScript = "hant" | "hans";

export interface SettingsType {
  language: Language;
  darkMode: boolean;
  courses: string[];
}
