import type { LatLon, WorldPosition } from "./types";

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
