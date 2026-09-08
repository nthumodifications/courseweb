import { describe, expect, test } from "bun:test";
import {
  findCampusBuildingForIdentity,
  isGeoCoordinateInPolygon,
  resolveVenueToCampusIdentity,
  type CampusMapData,
} from "@courseweb/shared";

const data = (await Bun.file(
  new URL("../../../public/data/nthu-main-campus.json", import.meta.url),
).json()) as CampusMapData;

describe("generated NTHU campus data", () => {
  test.each(["台達", "DELTA", "DELTA台達629"])(
    "connects %s to the generated Delta Building footprint",
    (query) => {
      const identity = resolveVenueToCampusIdentity(query);
      const building = identity
        ? findCampusBuildingForIdentity(data, identity.id)
        : undefined;

      expect(identity?.id).toBe("delta");
      expect(building?.source).toEqual({ type: "relation", id: 3815072 });
      expect(building?.geometry.footprint.length).toBeGreaterThan(3);
    },
  );

  test("contains usable campus context and attribution", () => {
    expect(data.buildings.length).toBeGreaterThan(100);
    expect(data.roads.length).toBeGreaterThan(0);
    expect(data.paths.length).toBeGreaterThan(0);
    expect(data.water.length).toBeGreaterThan(0);
    expect(data.boundary?.polygon.length).toBeGreaterThan(3);
    expect(data.attribution.text).toContain("OpenStreetMap");
  });

  test("only contains buildings and water inside the NTHU boundary", () => {
    expect(data.boundary).toBeDefined();
    const polygon = data.boundary!.polygon;
    const isInside = ({ location }: { location: CampusMapData["origin"] }) =>
      isGeoCoordinateInPolygon([location.lon, location.lat], polygon);

    expect(data.buildings.every(isInside)).toBe(true);
    expect(data.water.every(isInside)).toBe(true);
  });

  test.each([
    ["osm-relation-3927538-0", "成功湖", "Cheng Kung Lake"],
    ["osm-way-220880239-0", "昆明湖", "Kun Ming Lake"],
  ])("labels %s with its bilingual lake name", (id, zh, en) => {
    const lake = data.water.find((area) => area.id === id);

    expect(lake?.names).toEqual({ zh, en });
    expect(lake?.location.lat).toBeGreaterThan(24.79);
  });
});
