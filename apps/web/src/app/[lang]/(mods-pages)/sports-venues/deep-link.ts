export interface SportsVenuesDeepLink {
  facility?: string;
}

export type SportsDeepLinkAction = "open" | "update" | "close" | "ignore";

export const getSportsDeepLinkAction = (
  selectedFacility: string | undefined,
  requestedFacility: string | undefined,
): SportsDeepLinkAction => {
  if (!requestedFacility) return selectedFacility ? "close" : "ignore";
  return selectedFacility === requestedFacility ? "update" : "open";
};

export const parseSportsVenuesDeepLink = (
  searchParams: URLSearchParams,
  facilityNames: readonly string[],
): SportsVenuesDeepLink => {
  const facility = getSingleSearchParam(searchParams, "facility");
  return {
    facility:
      facility && facilityNames.includes(facility) ? facility : undefined,
  };
};
import { getSingleSearchParam } from "@/lib/deep-links/search-params";
