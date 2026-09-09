import { describe, expect, test } from "bun:test";
import {
  CAMPUS_FLOOR_HEIGHT,
  createCampusFeatureLabelNumbers,
  DEFAULT_BUILDING_HEIGHT,
  getCampusFeatureLabelKey,
  getCampusFeatureGoogleMapsUrl,
  getCampusFeatureNames,
  isCampusBuilding,
  resolveBuildingHeight,
} from "./sceneLogic";
import type {
  CampusAreaFeature,
  CampusBuilding,
  CampusMapData,
} from "@courseweb/shared";

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

  test("numbers visible labels north-to-south and groups building parts", () => {
    const secondBuildingPart: CampusBuilding = {
      ...building,
      id: "building-part-2",
      identityId: "shared-building",
      location: { lat: 24.789, lon: 120.991 },
    };
    const firstBuildingPart: CampusBuilding = {
      ...building,
      identityId: "shared-building",
    };
    const data = {
      buildings: [firstBuildingPart, secondBuildingPart],
      water: [unnamedLake],
    } satisfies Pick<CampusMapData, "buildings" | "water">;

    const numbers = createCampusFeatureLabelNumbers(data);

    expect(numbers.size).toBe(2);
    expect(numbers.get(getCampusFeatureLabelKey(unnamedLake))).toBe(1);
    expect(numbers.get(getCampusFeatureLabelKey(firstBuildingPart))).toBe(2);
    expect(numbers.get(getCampusFeatureLabelKey(secondBuildingPart))).toBe(2);
  });

  test("uses a manual label group before CourseWeb identity", () => {
    const first = {
      ...building,
      id: "first",
      identityId: "identity-a",
      labelGroupId: "curation:shared",
      labelNumber: 40,
    };
    const second = {
      ...building,
      id: "second",
      identityId: "identity-b",
      labelGroupId: "curation:shared",
      labelNumber: 40,
    };
    const numbers = createCampusFeatureLabelNumbers({
      buildings: [first, second],
      water: [],
    });

    expect(getCampusFeatureLabelKey(first)).toBe("curation:shared");
    expect(numbers.size).toBe(1);
    expect(numbers.get("curation:shared")).toBe(40);
  });
});
