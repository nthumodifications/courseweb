import type {
  CampusBounds,
  GeoCoordinate,
  LatLon,
  WorldPosition,
} from "./types";

const EARTH_RADIUS_METERS = 6_378_137;
const DEGREES_TO_RADIANS = Math.PI / 180;

export const NTHU_MAIN_CAMPUS_ORIGIN: LatLon = {
  lat: 24.792,
  lon: 120.993,
};

/**
 * Projects WGS84 coordinates onto a local, campus-scale Cartesian plane.
 * Positive x points east and negative z points north. One unit is one metre.
 */
export function geoToWorld(
  position: LatLon,
  origin: LatLon = NTHU_MAIN_CAMPUS_ORIGIN,
): WorldPosition {
  const meanLatitude = ((position.lat + origin.lat) / 2) * DEGREES_TO_RADIANS;
  const x =
    (position.lon - origin.lon) *
    DEGREES_TO_RADIANS *
    EARTH_RADIUS_METERS *
    Math.cos(meanLatitude);
  const north =
    (position.lat - origin.lat) * DEGREES_TO_RADIANS * EARTH_RADIUS_METERS;

  return { x, z: -north };
}

export function worldToGeo(
  position: WorldPosition,
  origin: LatLon = NTHU_MAIN_CAMPUS_ORIGIN,
): LatLon {
  const lat =
    origin.lat - position.z / (EARTH_RADIUS_METERS * DEGREES_TO_RADIANS);
  const meanLatitude = ((lat + origin.lat) / 2) * DEGREES_TO_RADIANS;
  const lon =
    origin.lon +
    position.x /
      (EARTH_RADIUS_METERS * DEGREES_TO_RADIANS * Math.cos(meanLatitude));

  return { lat, lon };
}

function clipSegmentToBounds(
  start: GeoCoordinate,
  end: GeoCoordinate,
  bounds: CampusBounds,
): [GeoCoordinate, GeoCoordinate] | undefined {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const p = [-dx, dx, -dy, dy];
  const q = [
    start[0] - bounds.west,
    bounds.east - start[0],
    start[1] - bounds.south,
    bounds.north - start[1],
  ];
  let entering = 0;
  let leaving = 1;

  for (let index = 0; index < p.length; index += 1) {
    if (p[index] === 0) {
      if (q[index] < 0) return undefined;
      continue;
    }
    const ratio = q[index] / p[index];
    if (p[index] < 0) entering = Math.max(entering, ratio);
    else leaving = Math.min(leaving, ratio);
    if (entering > leaving) return undefined;
  }

  return [
    [start[0] + entering * dx, start[1] + entering * dy],
    [start[0] + leaving * dx, start[1] + leaving * dy],
  ];
}

function sameCoordinate(left: GeoCoordinate, right: GeoCoordinate): boolean {
  return (
    Math.abs(left[0] - right[0]) < 1e-10 && Math.abs(left[1] - right[1]) < 1e-10
  );
}

/** Clips a polyline and splits it when the source leaves and re-enters bounds. */
export function clipGeoPolylineToBounds(
  points: GeoCoordinate[],
  bounds: CampusBounds,
): GeoCoordinate[][] {
  const parts: GeoCoordinate[][] = [];
  let current: GeoCoordinate[] | undefined;

  for (let index = 0; index < points.length - 1; index += 1) {
    const clipped = clipSegmentToBounds(
      points[index],
      points[index + 1],
      bounds,
    );
    if (!clipped) {
      if (current && current.length >= 2) parts.push(current);
      current = undefined;
      continue;
    }

    if (!current || !sameCoordinate(current.at(-1)!, clipped[0])) {
      if (current && current.length >= 2) parts.push(current);
      current = [clipped[0], clipped[1]];
    } else if (!sameCoordinate(current.at(-1)!, clipped[1])) {
      current.push(clipped[1]);
    }
  }
  if (current && current.length >= 2) parts.push(current);
  return parts;
}
