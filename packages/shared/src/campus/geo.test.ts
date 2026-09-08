import { describe, expect, test } from "bun:test";
import { geoToWorld, isGeoCoordinateInPolygon, worldToGeo } from "./geo";

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
});

describe("geographic polygon containment", () => {
  const polygon = [
    [120.99, 24.79],
    [121, 24.79],
    [121, 24.8],
    [120.99, 24.8],
    [120.99, 24.79],
  ] as const;

  test("includes points inside the polygon", () => {
    expect(isGeoCoordinateInPolygon([120.995, 24.795], [...polygon])).toBe(
      true,
    );
  });

  test("excludes points outside the polygon", () => {
    expect(isGeoCoordinateInPolygon([121.01, 24.795], [...polygon])).toBe(
      false,
    );
  });

  test("includes points on the campus boundary", () => {
    expect(isGeoCoordinateInPolygon([121, 24.795], [...polygon])).toBe(true);
  });
});
