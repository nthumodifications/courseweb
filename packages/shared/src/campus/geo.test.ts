import { describe, expect, test } from "bun:test";
import { clipGeoPolylineToBounds, geoToWorld, worldToGeo } from "./geo";

const origin = { lat: 24.792, lon: 120.993 };

describe("campus geographic conversion", () => {
  test("keeps the origin at zero", () => {
    expect(geoToWorld(origin, origin)).toEqual({ x: 0, z: -0 });
  });

  test("uses approximately one metre per world unit", () => {
    const north = geoToWorld(
      { lat: origin.lat + 0.001, lon: origin.lon },
      origin,
    );
    const east = geoToWorld(
      { lat: origin.lat, lon: origin.lon + 0.001 },
      origin,
    );

    expect(Math.abs(north.z)).toBeWithin(111, 112);
    expect(east.x).toBeWithin(100, 102);
  });

  test("round trips campus coordinates", () => {
    const geographic = { lat: 24.7957488, lon: 120.9919946 };
    const roundTrip = worldToGeo(geoToWorld(geographic, origin), origin);

    expect(roundTrip.lat).toBeCloseTo(geographic.lat, 8);
    expect(roundTrip.lon).toBeCloseTo(geographic.lon, 8);
  });

  test("clips a line to campus bounds without dropping crossing segments", () => {
    const parts = clipGeoPolylineToBounds(
      [
        [-1, 0.5],
        [0.5, 0.5],
        [2, 0.5],
      ],
      { south: 0, west: 0, north: 1, east: 1 },
    );

    expect(parts).toEqual([
      [
        [0, 0.5],
        [0.5, 0.5],
        [1, 0.5],
      ],
    ]);
  });

  test("splits a line that leaves and re-enters campus bounds", () => {
    const parts = clipGeoPolylineToBounds(
      [
        [0.25, 0.25],
        [2, 0.25],
        [2, 0.75],
        [0.25, 0.75],
      ],
      { south: 0, west: 0, north: 1, east: 1 },
    );

    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual([
      [0.25, 0.25],
      [1, 0.25],
    ]);
    expect(parts[1]).toEqual([
      [1, 0.75],
      [0.25, 0.75],
    ]);
  });
});
