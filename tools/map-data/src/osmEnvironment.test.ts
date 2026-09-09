import { describe, expect, test } from "bun:test";
import {
  classifyEnvironmentArea,
  extractTreeLocations,
  relationPolygonRings,
  sampleTreeRow,
  type OsmElement,
} from "./osmEnvironment";

describe("OSM campus environment normalization", () => {
  test.each([
    [{ leisure: "pitch", sport: "baseball" }, "sports-pitch", "baseball"],
    [{ leisure: "track", sport: "running" }, "athletics-track", "running"],
    [{ landuse: "grass" }, "grass", undefined],
    [{ landuse: "recreation_ground" }, "grass", undefined],
    [{ leisure: "park" }, "park", undefined],
    [{ natural: "wood" }, "wood", undefined],
    [{ landuse: "forest" }, "wood", undefined],
    [{ amenity: "parking" }, "parking", undefined],
  ] as const)("normalizes %o", (tags, kind, sport) => {
    expect(classifyEnvironmentArea(tags)).toEqual({
      kind,
      ...(sport ? { sport } : {}),
    });
  });

  test("does not treat a stadium building as a ground surface", () => {
    expect(classifyEnvironmentArea({ leisure: "stadium" })).toBeUndefined();
  });

  test("preserves multipolygon inner rings", () => {
    const element: OsmElement = {
      type: "relation",
      id: 1,
      members: [
        {
          type: "way",
          ref: 10,
          role: "outer",
          geometry: [
            { lat: 0, lon: 0 },
            { lat: 0, lon: 4 },
            { lat: 4, lon: 4 },
          ],
        },
        {
          type: "way",
          ref: 11,
          role: "outer",
          geometry: [
            { lat: 4, lon: 4 },
            { lat: 4, lon: 0 },
            { lat: 0, lon: 0 },
          ],
        },
        {
          type: "way",
          ref: 12,
          role: "inner",
          geometry: [
            { lat: 1, lon: 1 },
            { lat: 1, lon: 2 },
            { lat: 2, lon: 2 },
            { lat: 2, lon: 1 },
            { lat: 1, lon: 1 },
          ],
        },
      ],
    };

    const polygons = relationPolygonRings(element);
    expect(polygons).toHaveLength(1);
    expect(polygons[0].outer).toHaveLength(5);
    expect(polygons[0].holes).toHaveLength(1);
    expect(polygons[0].holes[0]).toHaveLength(5);
  });

  test("extracts deterministic sparse positions from a tree row", () => {
    const points = [
      { lat: 24.79, lon: 120.99 },
      { lat: 24.79, lon: 120.9904 },
    ];

    expect(sampleTreeRow(points, 20)).toEqual(sampleTreeRow(points, 20));
    expect(sampleTreeRow(points, 20)).toHaveLength(2);
    expect(sampleTreeRow(points, 100)).toHaveLength(1);
  });

  test("extracts an individual OSM tree without making it interactive", () => {
    expect(
      extractTreeLocations({
        type: "node",
        id: 42,
        lat: 24.79,
        lon: 120.99,
        tags: { natural: "tree" },
      }),
    ).toEqual([{ lat: 24.79, lon: 120.99 }]);
    expect(
      extractTreeLocations({
        type: "node",
        id: 43,
        lat: 24.79,
        lon: 120.99,
        tags: { amenity: "bench" },
      }),
    ).toEqual([]);
  });
});
