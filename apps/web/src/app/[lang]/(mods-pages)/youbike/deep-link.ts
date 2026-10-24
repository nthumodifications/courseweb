import type { YouBikeTab } from "@/lib/youbike";

const YOUBIKE_TABS: readonly YouBikeTab[] = ["all", "main", "nanda", "mine"];
const YOUBIKE_STATION_ID = /^\d{9}$/;

export interface YouBikeDeepLink {
  tab?: YouBikeTab;
  stationId?: string;
}

export const parseYouBikeDeepLink = (
  searchParams: URLSearchParams,
): YouBikeDeepLink => {
  const tab = searchParams.get("tab");
  const station = searchParams.get("station");

  return {
    tab: YOUBIKE_TABS.includes(tab as YouBikeTab)
      ? (tab as YouBikeTab)
      : undefined,
    stationId:
      station && YOUBIKE_STATION_ID.test(station) ? station : undefined,
  };
};
