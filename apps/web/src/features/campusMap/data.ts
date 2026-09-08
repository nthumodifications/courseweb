import type { CampusMapData } from "@courseweb/shared";

const CAMPUS_DATA_URL = `${import.meta.env.BASE_URL}data/nthu-main-campus.json`;

function isCampusMapData(value: unknown): value is CampusMapData {
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

export async function loadCampusMapData(
  signal?: AbortSignal,
): Promise<CampusMapData> {
  const response = await fetch(CAMPUS_DATA_URL, { signal });
  if (!response.ok) {
    throw new Error(`Campus map data request failed (${response.status})`);
  }
  const data: unknown = await response.json();
  if (!isCampusMapData(data)) {
    throw new Error("Campus map data has an unsupported format");
  }
  return data;
}
