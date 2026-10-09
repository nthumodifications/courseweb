export const getSectionIdFromHash = (
  hash: string,
  sectionIds: readonly string[],
): string | null => {
  const sectionId = hash.startsWith("#") ? hash.slice(1) : hash;
  return sectionIds.includes(sectionId) ? sectionId : null;
};
