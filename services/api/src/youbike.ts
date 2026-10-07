import { Hono } from "hono";

export interface YouBikeStationData {
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
  status: number;
  updatedAt: string;
}

const YOUBIKE_API_URL = "https://apis.youbike.com.tw/json/station-yb2.json";
const YOUBIKE_TIMEOUT_MS = 8_000;
const YOUBIKE_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=120";

const app = new Hono().get("/", async (c) => {
  try {
    const response = await fetch(YOUBIKE_API_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(YOUBIKE_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`YouBike API returned ${response.status}`);
      return c.json({ error: "YouBike service unavailable" }, 502);
    }

    const rawData = (await response.json()) as any[];
    if (!Array.isArray(rawData)) {
      return c.json({ error: "Invalid YouBike payload" }, 502);
    }

    const campusStations: YouBikeStationData[] = [];

    for (const item of rawData) {
      const stationNo = String(item.station_no ?? "");
      if (!stationNo.startsWith("5004")) continue;

      const lat = Number(item.lat ?? 0);
      const lng = Number(item.lng ?? 0);
      const nameTw = String(item.name_tw ?? "");

      // Main campus box: 24.783..24.805, 120.982..121.012
      const isMainCampus =
        lat >= 24.783 && lat <= 24.805 && lng >= 120.982 && lng <= 121.012;
      // Nanda campus & interconnecting shuttle box: 24.780..24.797, 120.955..120.982
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

    return c.json(campusStations, {
      headers: {
        "Cache-Control": YOUBIKE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("Failed to fetch YouBike data", error);
    return c.json({ error: "YouBike service unavailable" }, 502);
  }
});

export default app;
