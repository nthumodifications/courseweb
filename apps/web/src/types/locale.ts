export const SUPPORTED_LOCALES = ["zh", "en", "zh-cn"] as const;
export const LANGUAGE_PICKER_OPTIONS = ["zh", "en", "zh-cn"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const isLocale = (value: string | undefined): value is Locale =>
  value !== undefined && SUPPORTED_LOCALES.includes(value as Locale);

export const localeFromBrowserLanguage = (language: string): Locale => {
  const normalized = language.replaceAll("_", "-").toLowerCase();
  if (
    normalized === "zh-cn" ||
    normalized === "zh-sg" ||
    normalized.startsWith("zh-hans")
  ) {
    return "zh-cn";
  }
  if (
    normalized === "zh" ||
    normalized === "zh-tw" ||
    normalized === "zh-hk" ||
    normalized.startsWith("zh-hant")
  ) {
    return "zh";
  }
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return "zh";
};

export const normalizeLocaleSegment = (segment: string): Locale | undefined => {
  const normalized = segment.replaceAll("_", "-").toLowerCase();
  if (normalized === "zh-cn") return "zh-cn";
  if (normalized === "zh-tw" || normalized === "zh-hk") return "zh";
  if (normalized === "zh") return "zh";
  if (normalized === "en") return "en";
  return undefined;
};

export const localizedPath = (pathname: string, locale: Locale): string => {
  const suffix = pathname.replace(/^\/(?:zh-cn|zh|en)(?=\/|$)/, "");
  return `/${locale}${suffix || "/"}`;
};

export const localizedRoutePath = (
  routeLocale: string | undefined,
  suffix: string,
): string => {
  const locale = isLocale(routeLocale) ? routeLocale : "zh";
  return `/${locale}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
};

export const localizedLocation = (
  pathname: string,
  locale: Locale,
  search = "",
  hash = "",
): string => `${localizedPath(pathname, locale)}${search}${hash}`;
