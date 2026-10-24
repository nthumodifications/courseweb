import {
  getSearchParamValues,
  getSingleSearchParam,
  type SearchParamsLike,
} from "@/lib/search-params";

export interface ShopAreaDeepLinkState {
  area: string;
  areas?: string[];
}

export function getShopAreaDeepLinkKey(params: SearchParamsLike): string {
  return JSON.stringify([
    getSearchParamValues(params, "area"),
    getSearchParamValues(params, "building"),
  ]);
}

export function resolveShopAreaDeepLink(
  params: SearchParamsLike,
  availableAreas: readonly string[],
): ShopAreaDeepLinkState {
  const requestedArea = getSingleSearchParam(params, "area");
  if (requestedArea && availableAreas.includes(requestedArea)) {
    return { area: requestedArea };
  }

  const building = getSingleSearchParam(params, "building")?.trim() ?? "";
  if (!building) return { area: "" };

  const matchingAreas = availableAreas.filter(
    (area) => area.startsWith(building) || area.includes(building),
  );
  if (matchingAreas.length === 1) return { area: matchingAreas[0] };
  if (matchingAreas.length > 1) return { area: "", areas: matchingAreas };
  return { area: "" };
}
