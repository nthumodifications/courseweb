export interface AnnouncementsDeepLink {
  source?: string;
}

export const parseAnnouncementsDeepLink = (
  searchParams: URLSearchParams,
  sourceIds: readonly string[],
): AnnouncementsDeepLink => {
  const source = getSingleSearchParam(searchParams, "source");
  return {
    source: source && sourceIds.includes(source) ? source : undefined,
  };
};
import { getSingleSearchParam } from "@/lib/deep-links/search-params";
