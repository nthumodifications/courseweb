export const SETTINGS_SECTION_IDS = [
  "appearance",
  "display",
  "calendar",
  "timetable",
  "ai",
  "account",
  "privacy",
  "advanced",
] as const;

export const SETTINGS_SETTING_IDS = [
  "setting-dark-mode",
  "setting-language",
  "setting-compact-header",
  "setting-academic-calendar",
  "setting-experimental-calendar",
  "setting-widget-dashboard",
  "setting-default-view",
  "setting-ai-department",
  "setting-ai-entrance-year",
  "setting-ai-api-key",
  "setting-ai-api-key-value",
  "setting-account",
  "setting-sync-status",
  "setting-restore-backup",
  "setting-analytics",
  "setting-custom-css",
] as const;

export const getSectionIdFromHash = (
  hash: string,
  sectionIds: readonly string[],
  settingIds: readonly string[] = [],
): string | null => {
  const sectionId = hash.startsWith("#") ? hash.slice(1) : hash;
  return [...sectionIds, ...settingIds].includes(sectionId) ? sectionId : null;
};
