import type {
  CampusBuilding,
  CampusMapData,
  CampusMapFeature,
} from "@courseweb/shared";

export const DEFAULT_BUILDING_HEIGHT = 12;
export const CAMPUS_FLOOR_HEIGHT = 3.4;

export type CampusBuildingColorCategory =
  | "standard"
  | "course"
  | "food"
  | "dormitory";

export const CAMPUS_BUILDING_COLORS: Record<
  CampusBuildingColorCategory,
  string
> = {
  course: "#cdb9d1",
  food: "#efc99f",
  dormitory: "#b9d8e8",
  standard: "#d5d5d2",
};

export const CAMPUS_ROAD_COLOR = "#555b61";

const FOOD_BUILDING_NAMES = new Set(["小吃部", "風雲樓", "水木生活中心"]);

export function getBuildingColorCategory(
  building: CampusBuilding,
): CampusBuildingColorCategory {
  if (FOOD_BUILDING_NAMES.has(building.names.zh)) return "food";
  if (/齋|宿舍/.test(building.names.zh)) return "dormitory";
  return building.identityId ? "course" : "standard";
}

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
  data: Pick<CampusMapData, "buildings" | "water"> &
    Partial<Pick<CampusMapData, "areas">>,
): ReadonlyMap<string, number> {
  const firstBuildingByLabel = new Map<string, CampusBuilding>();
  data.buildings.forEach((building) => {
    const key = getCampusFeatureLabelKey(building);
    if (!firstBuildingByLabel.has(key)) {
      firstBuildingByLabel.set(key, building);
    }
  });

  const features = [
    ...firstBuildingByLabel.values(),
    ...data.water,
    ...(data.areas ?? []).filter((area) => Boolean(area.names)),
  ].sort(
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
