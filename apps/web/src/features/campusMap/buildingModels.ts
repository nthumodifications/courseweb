import type { CampusBuilding, GeoCoordinate } from "@courseweb/shared";

export type BuildingModelProfile = {
  /** Verified storey counts; metres and facade spacing remain approximations. */
  levels?: number;
  wall: string;
  facade: "windows" | "bands" | "glass" | "plain";
  landmark?: "mxic" | "delta" | "engineering";
};

// Key by source ID: renaming or regrouping a map label must not change its model.
// References and the boundary between verified and illustrative detail: MODELS.md.
const PROFILES: Record<string, BuildingModelProfile> = {
  "way/180365523": {
    levels: 7,
    wall: "#e1dcd0",
    facade: "bands",
    landmark: "mxic",
  },
  "relation/3815072": {
    levels: 9,
    wall: "#c5b6a2",
    facade: "windows",
    landmark: "delta",
  },
  "way/180365526": {
    levels: 9,
    wall: "#c8a18b",
    facade: "bands",
    landmark: "engineering",
  },
  "way/180522500": {
    levels: 8,
    wall: "#d5ccbc",
    facade: "bands",
  },
  "way/180522501": {
    levels: 8,
    wall: "#d6d5ce",
    facade: "bands",
  },
};

export function getBuildingModelProfile(
  building: CampusBuilding,
): BuildingModelProfile | undefined {
  return PROFILES[`${building.source.type}/${building.source.id}`];
}

export type BuildingModelPart = {
  footprint: GeoCoordinate[];
  holes?: GeoCoordinate[][];
  height: number;
  levels: number;
  facade: BuildingModelProfile["facade"];
};

export function getBuildingModelParts(
  building: CampusBuilding,
  height: number,
): BuildingModelPart[] {
  const profile = getBuildingModelProfile(building);
  const suppliedLevels = building.geometry.levels ?? profile?.levels;
  const levels =
    suppliedLevels && Number.isFinite(suppliedLevels) && suppliedLevels > 0
      ? suppliedLevels
      : Math.max(1, Math.round(height / 3.4));
  const base: BuildingModelPart = {
    footprint: building.geometry.footprint,
    holes: building.geometry.holes,
    height,
    levels,
    facade: profile?.facade ?? "windows",
  };

  // The supplied OSM outline combines MXIC's oval four-storey front and
  // seven-storey rear. Split at its two neck vertices without moving any edge.
  // Guard the source geometry so a future OSM edit falls back safely.
  const ring = building.geometry.footprint;
  if (
    profile?.landmark === "mxic" &&
    !building.geometry.holes?.length &&
    ring.length === 25 &&
    Math.abs(ring[3][0] - 120.9949284) < 0.000001 &&
    Math.abs(ring[3][1] - 24.7953912) < 0.000001 &&
    Math.abs(ring[17][0] - 120.994461) < 0.000001 &&
    Math.abs(ring[17][1] - 24.7953327) < 0.000001
  ) {
    return [
      {
        ...base,
        footprint: [...ring.slice(0, 4), ...ring.slice(17)],
        levels: 7,
      },
      {
        ...base,
        footprint: [...ring.slice(3, 18), ring[3]],
        height: (height * 4) / 7,
        levels: 4,
        facade: "glass",
      },
    ];
  }
  return [base];
}
