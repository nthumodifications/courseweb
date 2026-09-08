import type { CampusBuilding } from "@courseweb/shared";

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
