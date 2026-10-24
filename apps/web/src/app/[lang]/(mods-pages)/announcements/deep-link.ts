export interface AnnouncementsDeepLink {
  source?: string;
}

export const parseAnnouncementsDeepLink = (
  searchParams: URLSearchParams,
  sourceIds: readonly string[],
): AnnouncementsDeepLink => {
  const source = searchParams.get("source");
  return {
    source: source && sourceIds.includes(source) ? source : undefined,
  };
};
