import type {
  CampusBuilding,
  CampusMapData,
  CampusMapFeature,
} from "@courseweb/shared";

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

export function getCampusFeatureLabelKey(feature: CampusMapFeature): string {
  return isCampusBuilding(feature)
    ? (feature.labelGroupId ?? feature.identityId ?? feature.id)
    : feature.id;
}

export function createCampusFeatureLabelNumbers(
  data: Pick<CampusMapData, "buildings" | "water">,
): ReadonlyMap<string, number> {
  const firstBuildingByLabel = new Map<string, CampusBuilding>();
  data.buildings.forEach((building) => {
    const key = getCampusFeatureLabelKey(building);
    if (!firstBuildingByLabel.has(key)) {
      firstBuildingByLabel.set(key, building);
    }
  });

  const features = [...firstBuildingByLabel.values(), ...data.water].sort(
    (left, right) =>
      right.location.lat - left.location.lat ||
      left.location.lon - right.location.lon ||
      getCampusFeatureLabelKey(left).localeCompare(
        getCampusFeatureLabelKey(right),
      ),
  );

  const reservedNumbers = new Set(
    features
      .map((feature) => feature.labelNumber)
      .filter((number): number is number => number !== undefined),
  );
  let nextNumber = 1;
  return new Map(
    features.map((feature) => {
      while (reservedNumbers.has(nextNumber)) nextNumber += 1;
      const number = feature.labelNumber ?? nextNumber++;
      return [getCampusFeatureLabelKey(feature), number];
    }),
  );
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
