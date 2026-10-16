export const getSectionIdFromHash = (
  hash: string,
  sectionIds: readonly string[],
  settingIds: readonly string[] = [],
): string | null => {
  const sectionId = hash.startsWith("#") ? hash.slice(1) : hash;
  return [...sectionIds, ...settingIds].includes(sectionId) ? sectionId : null;
};
