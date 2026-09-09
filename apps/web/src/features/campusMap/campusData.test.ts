import { describe, expect, test } from "bun:test";
import {
  CAMPUS_BUILDING_IDENTITIES,
  findCampusBuildingForIdentity,
  resolveVenueToCampusIdentity,
  type CampusMapData,
} from "@courseweb/shared";

const data = (await Bun.file(
  new URL("../../../public/data/nthu-main-campus.json", import.meta.url),
).json()) as CampusMapData;

describe("generated NTHU campus data", () => {
  test("reports CourseWeb campus identity coverage without ambiguous mappings", () => {
    const matchedIds = new Set(
      data.buildings
        .map((building) => building.identityId)
        .filter((id): id is string => Boolean(id)),
    );
    const matched = CAMPUS_BUILDING_IDENTITIES.filter((identity) =>
      matchedIds.has(identity.id),
    );
    const unmatched = CAMPUS_BUILDING_IDENTITIES.filter(
      (identity) => !matchedIds.has(identity.id),
    );
    const ambiguous = CAMPUS_BUILDING_IDENTITIES.filter((identity) => {
      const sourceIds = new Set(
        data.buildings
          .filter((building) => building.identityId === identity.id)
          .map((building) => `${building.source.type}/${building.source.id}`),
      );
      return sourceIds.size > 1;
    });

    console.info(
      [
        `Campus identities: ${CAMPUS_BUILDING_IDENTITIES.length}`,
        `Matched: ${matched.length}`,
        `Unmatched: ${unmatched.length}`,
        `Ambiguous: ${ambiguous.length}`,
        `Unmatched identities: ${unmatched.map(({ id }) => id).join(", ")}`,
      ].join("\n"),
    );

    expect(CAMPUS_BUILDING_IDENTITIES).toHaveLength(29);
    expect(matched).toHaveLength(27);
    expect(unmatched.map(({ id }) => id)).toEqual([
      "computer-center",
      "physics-lab",
    ]);
    expect(ambiguous).toEqual([]);
  });

  test.each([
    ["delta", "relation", 3815072],
    ["mxic", "way", 180365523],
    ["tsmc", "way", 432044412],
    ["general-ii", "way", 180522500],
    ["physics", "way", 180522523],
    ["hss", "relation", 3809408],
  ] as const)("matches the important %s identity", (identityId, type, id) => {
    const building = findCampusBuildingForIdentity(data, identityId);

    expect(building?.source).toEqual({ type, id });
    expect(building?.geometry.footprint.length).toBeGreaterThan(3);
  });

  test.each(["delta", "hss"])(
    "preserves the courtyard in the %s multipolygon",
    (identityId) => {
      const building = findCampusBuildingForIdentity(data, identityId);

      expect(building?.geometry.holes?.length).toBeGreaterThan(0);
      expect(building?.geometry.holes?.[0].length).toBeGreaterThan(3);
    },
  );

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

  test.each([
    ["osm-relation-3927538-0", "成功湖", "Cheng Kung Lake"],
    ["osm-way-220880239-0", "昆明湖", "Kun Ming Lake"],
  ])("labels %s with its bilingual lake name", (id, zh, en) => {
    const lake = data.water.find((area) => area.id === id);

    expect(lake?.names).toEqual({ zh, en });
    expect(lake?.location.lat).toBeGreaterThan(24.79);
  });

  test("preserves the islands in Cheng Kung Lake", () => {
    const lake = data.water.find(
      (area) => area.id === "osm-relation-3927538-0",
    );

    expect(lake?.holes).toHaveLength(2);
  });

  test("contains recognizable procedural campus environment geometry", () => {
    const count = (kind: (typeof data.areas)[number]["kind"]) =>
      data.areas.filter((area) => area.kind === kind).length;

    expect(count("grass")).toBe(28);
    expect(count("park")).toBe(0);
    expect(count("wood")).toBe(10);
    expect(count("sports-pitch")).toBe(6);
    expect(count("athletics-track")).toBe(1);
    expect(count("parking")).toBe(23);
    expect(data.trees).toHaveLength(33);
    expect(data.roads.every((road) => Boolean(road.roadClass))).toBe(true);
  });

  test("keeps the athletics track hole and a distinct baseball surface", () => {
    const track = data.areas.find(
      (area) => area.id === "osm-relation-3809891-0",
    );
    const baseball = data.areas.find(
      (area) => area.id === "osm-way-97344543-0",
    );

    expect(track?.kind).toBe("athletics-track");
    expect(track?.holes).toHaveLength(1);
    expect(baseball).toMatchObject({
      kind: "sports-pitch",
      sport: "baseball",
    });
  });
});
