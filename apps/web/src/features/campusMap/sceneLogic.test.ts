import { describe, expect, test } from "bun:test";
import {
  CAMPUS_FLOOR_HEIGHT,
  DEFAULT_BUILDING_HEIGHT,
  getCampusFeatureGoogleMapsUrl,
  getCampusFeatureNames,
  isCampusBuilding,
  resolveBuildingHeight,
} from "./sceneLogic";
import type { CampusAreaFeature, CampusBuilding } from "@courseweb/shared";

const building: CampusBuilding = {
  id: "building",
  source: { type: "way", id: 1 },
  names: { zh: "測試館", en: "Test Building" },
  location: { lat: 24.79, lon: 120.99 },
  geometry: { footprint: [] },
  googleMaps: { query: "Test Building NTHU" },
};

const unnamedLake: CampusAreaFeature = {
  id: "lake",
  kind: "water",
  location: { lat: 24.795, lon: 120.992 },
  polygon: [],
};

describe("campus building height", () => {
  test("prefers an explicit OSM height", () => {
    expect(resolveBuildingHeight(27, 9)).toBe(27);
  });

  test("uses building levels when height is absent", () => {
    expect(resolveBuildingHeight(undefined, 4)).toBe(4 * CAMPUS_FLOOR_HEIGHT);
  });

  test("uses a stable fallback for incomplete metadata", () => {
    expect(resolveBuildingHeight()).toBe(DEFAULT_BUILDING_HEIGHT);
    expect(resolveBuildingHeight(0, 0)).toBe(DEFAULT_BUILDING_HEIGHT);
  });
});

describe("campus map features", () => {
  test("identifies buildings and preserves their bilingual names", () => {
    expect(isCampusBuilding(building)).toBe(true);
    expect(getCampusFeatureNames(building)).toEqual(building.names);
  });

  test("gives unnamed lakes a bilingual label", () => {
    expect(isCampusBuilding(unnamedLake)).toBe(false);
    expect(getCampusFeatureNames(unnamedLake)).toEqual({
      zh: "湖泊",
      en: "Lake",
    });
  });

  test("creates Google Maps links for configured names and coordinates", () => {
    expect(getCampusFeatureGoogleMapsUrl(building)).toContain(
      "query=Test%20Building%20NTHU",
    );
    expect(getCampusFeatureGoogleMapsUrl(unnamedLake)).toContain(
      "query=24.795%2C120.992",
    );
  });
});
