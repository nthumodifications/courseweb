import type { CampusMapFeature } from "@courseweb/shared";
import type { DiningArea, DiningShop } from "../dining/types";
import {
  getDiningLocationForArea,
  getDiningLocationForSource,
  type DiningLocation,
} from "../dining/locations";
import { isCampusBuilding } from "./sceneLogic";

export type CampusDiningLocation = DiningLocation;

export function getCampusDiningLocation(
  feature: CampusMapFeature,
): CampusDiningLocation | undefined {
  if (!isCampusBuilding(feature)) return;
  return getDiningLocationForSource(
    `${feature.source.type}/${feature.source.id}`,
  );
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
      const match = getDiningLocationForArea(shop.area);
      if (match?.location !== location) return [];
      return [{ shop, floor: match.floor }];
    })
    .sort((a, b) => (a.floor ?? Infinity) - (b.floor ?? Infinity));
}
