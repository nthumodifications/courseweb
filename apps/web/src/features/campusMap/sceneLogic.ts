import type { CampusBuilding, CampusMapFeature } from "@courseweb/shared";

export const DEFAULT_BUILDING_HEIGHT = 12;
export const CAMPUS_FLOOR_HEIGHT = 3.4;

export function resolveBuildingHeight(
  height?: number,
  levels?: number,
): number {
  if (height !== undefined && Number.isFinite(height) && height > 0) {
    return height;
  }
  if (levels !== undefined && Number.isFinite(levels) && levels > 0) {
    return levels * CAMPUS_FLOOR_HEIGHT;
  }
  return DEFAULT_BUILDING_HEIGHT;
}

export function getBuildingHeight(building: CampusBuilding): number {
  return resolveBuildingHeight(
    building.geometry.height,
    building.geometry.levels,
  );
}

export function isCampusBuilding(
  feature: CampusMapFeature,
): feature is CampusBuilding {
  return "geometry" in feature;
}

export function getCampusFeatureNames(feature: CampusMapFeature): {
  zh: string;
  en?: string;
} {
  return feature.names ?? { zh: "湖泊", en: "Lake" };
}

export function getCampusFeatureGoogleMapsUrl(
  feature: CampusMapFeature,
): string {
  const configuredQuery = isCampusBuilding(feature)
    ? feature.googleMaps?.query
    : undefined;
  const query =
    configuredQuery ?? `${feature.location.lat},${feature.location.lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
