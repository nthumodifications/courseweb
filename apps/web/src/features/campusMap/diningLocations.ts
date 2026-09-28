import type { CampusMapFeature } from "@courseweb/shared";
import type { DiningArea, DiningShop } from "../dining/types";
import { isCampusBuilding } from "./sceneLogic";

export type CampusDiningLocation = "food-court" | "shui-mu" | "feng-yun";

// Both mapped Food Court footprints refer to the same single-storey location.
// Stable OSM source IDs also survive label renames and language changes.
const DINING_LOCATIONS: Record<string, CampusDiningLocation> = {
  "way/158391363": "food-court",
  "way/749979081": "food-court",
  "way/158364457": "shui-mu",
  "way/138080029": "feng-yun",
};

const AREA_PATTERNS: Record<CampusDiningLocation, RegExp> = {
  "food-court": /^小吃部(?:\s*(\d+)\s*樓)?$/,
  "shui-mu": /^水木生活中心(?:\s*(\d+)\s*樓)?$/,
  "feng-yun": /^風雲(?:樓)?(?:\s*(\d+)\s*樓)?$/,
};

export function getCampusDiningLocation(
  feature: CampusMapFeature,
): CampusDiningLocation | undefined {
  if (!isCampusBuilding(feature)) return;
  return DINING_LOCATIONS[`${feature.source.type}/${feature.source.id}`];
}

export type CampusDiningShop = { shop: DiningShop; floor?: number };

export function getCampusDiningShops(
  areas: DiningArea[],
  location: CampusDiningLocation,
): CampusDiningShop[] {
  return areas
    .flatMap((area) => area.restaurants)
    .flatMap((shop): CampusDiningShop[] => {
      // Match the shop's actual location, not its name or the API group's
      // heading (which can include a changing manager's contact details).
      const match = AREA_PATTERNS[location].exec(shop.area.trim());
      if (!match) return [];
      const floor =
        location !== "food-court" && match[1] ? Number(match[1]) : undefined;
      return [{ shop, floor }];
    })
    .sort((a, b) => (a.floor ?? Infinity) - (b.floor ?? Infinity));
}
