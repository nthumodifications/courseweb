import type { Language } from "@/types/settings";

export type ContentLanguage = "zh" | "en";

/** Map UI locales to the two languages used by bilingual API data. */
export const contentLanguage = (
  lang: Language | string | undefined,
): ContentLanguage => (lang === "en" ? "en" : "zh");

export const intlLocale = (
  lang: Language | string | undefined,
): "en-US" | "zh-TW" | "zh-CN" =>
  lang === "en" ? "en-US" : lang === "zh-cn" ? "zh-CN" : "zh-TW";

export const resolveTimetableContentLanguage = (
  preference: "app" | ContentLanguage,
  uiLanguage: Language | string | undefined,
): ContentLanguage =>
  preference === "app" ? contentLanguage(uiLanguage) : preference;
