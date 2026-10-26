import type { YouBikeTab } from "@/lib/youbike";
import { getSingleSearchParam } from "@/lib/deep-links/search-params";

export const YOUBIKE_TABS: readonly YouBikeTab[] = [
  "all",
  "main",
  "nanda",
  "mine",
];
export const YOUBIKE_STATION_ID_PATTERN = "\\d{9}";
const YOUBIKE_STATION_ID = new RegExp(`^${YOUBIKE_STATION_ID_PATTERN}$`);

export interface YouBikeDeepLink {
  tab?: YouBikeTab;
  stationId?: string;
}

export const parseYouBikeDeepLink = (
  searchParams: URLSearchParams,
): YouBikeDeepLink => {
  const tab = getSingleSearchParam(searchParams, "tab");
  const station = getSingleSearchParam(searchParams, "station");

  return {
    tab: YOUBIKE_TABS.includes(tab as YouBikeTab)
      ? (tab as YouBikeTab)
      : undefined,
    stationId:
      station && YOUBIKE_STATION_ID.test(station) ? station : undefined,
  };
};
