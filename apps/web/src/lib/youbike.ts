export interface YouBikeStation {
  id: string;
  nameZh: string;
  nameEn: string;
  districtZh: string;
  districtEn: string;
  addressZh: string;
  addressEn: string;
  totalCapacity: number;
  availableBikes: number;
  regularBikes: number;
  eBikes: number;
  emptyDocks: number;
  lat: number;
  lng: number;
  status: number; // 1 = normal, 2 = out of service
  updatedAt: string;
}

export type YouBikeTab = "all" | "main" | "nanda" | "mine";

export const DEFAULT_PINNED_STATIONS = [
  "500401008", // 清華大學(北校門)
  "500401004", // 清華大學(小吃部)
  "500401016", // 清華大學(台達館)
  "500401030", // 清華大學(南大校區)
  "500401053", // 清大夜市
];

const STORAGE_KEY = "courseweb_youbike_pinned_stations";

export function getPinnedStationIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_PINNED_STATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PINNED_STATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PINNED_STATIONS;
  } catch {
    return DEFAULT_PINNED_STATIONS;
  }
}

export function togglePinnedStationId(id: string): string[] {
  if (typeof window === "undefined") return DEFAULT_PINNED_STATIONS;
  const current = getPinnedStationIds();
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error("Failed to save pinned YouBike stations", e);
  }
  return next;
}

/**
  Determines if a station is on Nanda Campus based on lat/lng or station_no / name.
 */
export function isNandaCampusStation(station: YouBikeStation): boolean {
  if (station.id === "500401030" || station.nameZh.includes("南大")) {
    return true;
  }
  return (
    station.lat >= 24.78 &&
    station.lat <= 24.797 &&
    station.lng >= 120.955 &&
    station.lng <= 120.982
  );
}

/**
  Client fallback fetching method in case backend API /v1/youbike returns 404 or fails.
 */
async function fetchClientFallback(): Promise<YouBikeStation[]> {
  const response = await fetch(
    "https://apis.youbike.com.tw/json/station-yb2.json",
  );
  if (!response.ok) {
    throw new Error(`Public YouBike API failed (${response.status})`);
  }
  const rawData = (await response.json()) as any[];
  const campusStations: YouBikeStation[] = [];

  for (const item of rawData) {
    const stationNo = String(item.station_no ?? "");
    if (!stationNo.startsWith("5004")) continue;

    const lat = Number(item.lat ?? 0);
    const lng = Number(item.lng ?? 0);
    const nameTw = String(item.name_tw ?? "");

    const isMainCampus =
      lat >= 24.783 && lat <= 24.805 && lng >= 120.982 && lng <= 121.012;
    const isNandaCampus =
      lat >= 24.78 && lat <= 24.797 && lng >= 120.955 && lng <= 120.982;
    const isNthuNamed = nameTw.includes("清華") || nameTw.includes("清大");

    if (isMainCampus || isNandaCampus || isNthuNamed) {
      campusStations.push({
        id: stationNo,
        nameZh: nameTw,
        nameEn: String(item.name_en ?? nameTw),
        districtZh: String(item.district_tw ?? "東區"),
        districtEn: String(item.district_en ?? "East Dist"),
        addressZh: String(item.address_tw ?? ""),
        addressEn: String(item.address_en ?? ""),
        totalCapacity: Number(item.parking_spaces ?? 0),
        availableBikes: Number(item.available_spaces ?? 0),
        regularBikes: Number(item.available_spaces_detail?.yb2 ?? 0),
        eBikes: Number(item.available_spaces_detail?.eyb ?? 0),
        emptyDocks: Number(item.empty_spaces ?? 0),
        lat,
        lng,
        status: Number(item.status ?? 1),
        updatedAt: String(item.updated_at ?? ""),
      });
    }
  }

  return campusStations;
}

export const getYouBikeStations = async (): Promise<YouBikeStation[]> => {
  try {
    // Try backend proxy API first if available
    const response = await fetch("/__api/youbike");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data as YouBikeStation[];
      }
    }
  } catch {
    // Fall back gracefully
  }

  // Fallback to client fetch
  return fetchClientFallback();
};
