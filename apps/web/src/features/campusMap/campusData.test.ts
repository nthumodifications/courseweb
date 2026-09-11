import { describe, expect, test } from "bun:test";
import {
  CAMPUS_BUILDING_IDENTITIES,
  findCampusBuildingForIdentity,
  resolveVenueToCampusIdentity,
  type CampusMapData,
} from "@courseweb/shared";
import {
  createCampusFeatureLabelNumbers,
  getCampusFeatureLabelKey,
} from "./sceneLogic";

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
    expect(count("wood")).toBe(14);
    expect(count("sports-pitch")).toBe(6);
    expect(count("athletics-track")).toBe(1);
    expect(count("parking")).toBe(23);
    expect(data.trees.filter(({ id }) => id.startsWith("osm-"))).toHaveLength(
      33,
    );
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

  test.each([
    ["osm-way-246271641-0", "室外排球場", "Outdoor Volleyball Courts", 92],
    ["osm-relation-3809891-0", "田徑場", "Athletics Track", 93],
  ])("adds a clickable label for %s", (id, zh, en, labelNumber) => {
    const area = data.areas.find((candidate) => candidate.id === id);
    const numbers = createCampusFeatureLabelNumbers(data);

    expect(area).toMatchObject({ names: { zh, en }, labelNumber });
    expect(numbers.get(getCampusFeatureLabelKey(area!))).toBe(labelNumber);
  });

  test("uses one contiguous number sequence for rendered labels", () => {
    const numbers = [...createCampusFeatureLabelNumbers(data).values()].sort(
      (left, right) => left - right,
    );

    expect(numbers).toEqual(
      Array.from({ length: numbers.length }, (_, index) => index + 1),
    );
    expect(numbers).toHaveLength(93);
    expect(
      data.buildings.some(
        ({ source }) => source.type === "way" && source.id === 1230511808,
      ),
    ).toBe(false);
  });

  test("clips all generated roads and paths to the display bounds", () => {
    const inBounds = ([lon, lat]: [number, number]) =>
      lon >= data.bounds.west &&
      lon <= data.bounds.east &&
      lat >= data.bounds.south &&
      lat <= data.bounds.north;

    expect(data.roads.flatMap(({ points }) => points).every(inBounds)).toBe(
      true,
    );
    expect(data.paths.flatMap(({ points }) => points).every(inBounds)).toBe(
      true,
    );
  });

  test("clips every road and path to the visible main-campus boundary", () => {
    const boundary = data.boundary;
    expect(boundary).toBeDefined();

    const pointOnRing = (
      [lon, lat]: [number, number],
      ring: [number, number][],
    ) =>
      ring.slice(0, -1).some(([startLon, startLat], index) => {
        const [endLon, endLat] = ring[index + 1];
        const segmentLon = endLon - startLon;
        const segmentLat = endLat - startLat;
        const pointLon = lon - startLon;
        const pointLat = lat - startLat;
        const cross = segmentLon * pointLat - segmentLat * pointLon;
        const dot = pointLon * segmentLon + pointLat * segmentLat;
        const squaredLength = segmentLon ** 2 + segmentLat ** 2;
        return (
          Math.abs(cross) <= 2e-9 && dot >= -2e-9 && dot <= squaredLength + 2e-9
        );
      });
    const pointInRing = (
      [lon, lat]: [number, number],
      ring: [number, number][],
    ) => {
      let inside = false;
      for (
        let index = 0, previous = ring.length - 1;
        index < ring.length;
        previous = index++
      ) {
        const [currentLon, currentLat] = ring[index];
        const [previousLon, previousLat] = ring[previous];
        if (
          currentLat > lat !== previousLat > lat &&
          lon <
            ((previousLon - currentLon) * (lat - currentLat)) /
              (previousLat - currentLat) +
              currentLon
        ) {
          inside = !inside;
        }
      }
      return inside;
    };
    const insideVisibleBoundary = (point: [number, number]) =>
      (pointInRing(point, boundary!.polygon) ||
        pointOnRing(point, boundary!.polygon)) &&
      !(boundary!.holes ?? []).some(
        (hole) => pointInRing(point, hole) && !pointOnRing(point, hole),
      );

    expect(
      [...data.roads, ...data.paths]
        .flatMap(({ points }) => points)
        .every(insideVisibleBoundary),
    ).toBe(true);
  });

  test("includes sparse illustrative trees in the requested campus areas", () => {
    const pointInRing = (
      point: { lat: number; lon: number },
      ring: [number, number][],
    ) => {
      let inside = false;
      for (
        let index = 0, previous = ring.length - 1;
        index < ring.length;
        previous = index++
      ) {
        const currentPoint = ring[index];
        const previousPoint = ring[previous];
        if (
          currentPoint[1] > point.lat !== previousPoint[1] > point.lat &&
          point.lon <
            ((previousPoint[0] - currentPoint[0]) *
              (point.lat - currentPoint[1])) /
              (previousPoint[1] - currentPoint[1]) +
              currentPoint[0]
        ) {
          inside = !inside;
        }
      }
      return inside;
    };
    const curatedTrees = data.trees.filter(({ id }) =>
      id.startsWith("curation-"),
    );
    const counts = Object.fromEntries(
      [
        "mei-garden",
        "life-sciences",
        "student-dormitories",
        "humanities-social-sciences",
        "yi-garden",
      ].map((cluster) => [
        cluster,
        curatedTrees.filter(({ id }) => id.startsWith(`curation-${cluster}-`))
          .length,
      ]),
    );

    expect(counts).toEqual({
      "mei-garden": 24,
      "life-sciences": 24,
      "student-dormitories": 17,
      "humanities-social-sciences": 12,
      "yi-garden": 14,
    });
    const buildingCollisions = curatedTrees.flatMap((tree) =>
      data.buildings
        .filter(
          (building) =>
            pointInRing(tree.location, building.geometry.footprint) &&
            !(building.geometry.holes ?? []).some((hole) =>
              pointInRing(tree.location, hole),
            ),
        )
        .map((building) => `${tree.id} inside ${building.id}`),
    );
    expect(buildingCollisions).toEqual([]);
  });

  test("includes flat curated vegetation across the southern hillside", () => {
    const vegetation = data.areas.filter(({ id }) =>
      id.startsWith("curation-vegetation-"),
    );

    expect(vegetation.map(({ id }) => id)).toEqual([
      "curation-vegetation-mei-garden-hillside",
      "curation-vegetation-humanities-hillside",
      "curation-vegetation-life-sciences-hillside",
      "curation-vegetation-yi-garden-hillside",
    ]);
    expect(
      vegetation.every(
        ({ kind, polygon }) => kind === "wood" && polygon.length >= 4,
      ),
    ).toBe(true);
  });
});
