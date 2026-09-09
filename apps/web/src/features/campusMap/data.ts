import type {
  CampusAreaFeature,
  CampusMapData,
  GeoCoordinate,
  LatLon,
} from "@courseweb/shared";

export const CAMPUS_MAP_DATA_CACHE_VERSION = 3;
const CAMPUS_DATA_URL = `${import.meta.env.BASE_URL}data/nthu-main-campus.json?v=${CAMPUS_MAP_DATA_CACHE_VERSION}`;

function hasCampusMapDataShape(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CampusMapData>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.buildings) &&
    Array.isArray(candidate.roads) &&
    Array.isArray(candidate.paths) &&
    Array.isArray(candidate.water) &&
    Boolean(candidate.origin) &&
    Boolean(candidate.attribution)
  );
}

function isLatLon(value: unknown): value is LatLon {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LatLon>;
  return (
    typeof candidate.lat === "number" &&
    Number.isFinite(candidate.lat) &&
    typeof candidate.lon === "number" &&
    Number.isFinite(candidate.lon)
  );
}

function polygonCenter(points: GeoCoordinate[]): LatLon | undefined {
  if (points.length === 0) return undefined;
  const [firstLon, firstLat] = points[0];
  const [lastLon, lastLat] = points.at(-1)!;
  const unique =
    points.length > 1 && firstLon === lastLon && firstLat === lastLat
      ? points.slice(0, -1)
      : points;
  if (unique.length === 0) return undefined;

  const total = unique.reduce(
    (result, [lon, lat]) => ({
      lat: result.lat + lat,
      lon: result.lon + lon,
    }),
    { lat: 0, lon: 0 },
  );
  return {
    lat: total.lat / unique.length,
    lon: total.lon / unique.length,
  };
}

function normalizeAreaLocation(
  area: CampusAreaFeature,
  fallback: LatLon,
): CampusAreaFeature {
  return {
    ...area,
    location: isLatLon(area.location)
      ? area.location
      : (polygonCenter(area.polygon) ?? fallback),
  };
}

export function normalizeCampusMapData(value: unknown): CampusMapData {
  if (!hasCampusMapDataShape(value)) {
    throw new Error("Campus map data has an unsupported format");
  }

  const data = value as CampusMapData;
  return {
    ...data,
    water: data.water.map((area) => normalizeAreaLocation(area, data.origin)),
    boundary: data.boundary
      ? normalizeAreaLocation(data.boundary, data.origin)
      : undefined,
  };
}

export async function loadCampusMapData(
  signal?: AbortSignal,
): Promise<CampusMapData> {
  const response = await fetch(CAMPUS_DATA_URL, { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Campus map data request failed (${response.status})`);
  }
  return normalizeCampusMapData(await response.json());
}
