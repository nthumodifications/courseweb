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

    const campusStations = rawData
      .filter((raw) => {
        const no = String(raw.station_no ?? "");
        if (!no.startsWith("5004")) return false;

        const latitude = Number(raw.lat ?? 0);
        const longitude = Number(raw.lng ?? 0);
        const twName = String(raw.name_tw ?? "");

        const inMain =
          latitude >= 24.783 &&
          latitude <= 24.805 &&
          longitude >= 120.982 &&
          longitude <= 121.012;
        const inNanda =
          latitude >= 24.78 &&
          latitude <= 24.797 &&
          longitude >= 120.955 &&
          longitude <= 120.982;
        const matchName = twName.includes("清華") || twName.includes("清大");

        return inMain || inNanda || matchName;
      })
      .map(
        (raw): YouBikeStationData => ({
          id: String(raw.station_no ?? ""),
          nameZh: String(raw.name_tw ?? ""),
          nameEn: String(raw.name_en ?? raw.name_tw ?? ""),
          districtZh: String(raw.district_tw ?? "東區"),
          districtEn: String(raw.district_en ?? "East Dist"),
          addressZh: String(raw.address_tw ?? ""),
          addressEn: String(raw.address_en ?? ""),
          totalCapacity: Number(raw.parking_spaces ?? 0),
          availableBikes: Number(raw.available_spaces ?? 0),
          regularBikes: Number(raw.available_spaces_detail?.yb2 ?? 0),
          eBikes: Number(raw.available_spaces_detail?.eyb ?? 0),
          emptyDocks: Number(raw.empty_spaces ?? 0),
          lat: Number(raw.lat ?? 0),
          lng: Number(raw.lng ?? 0),
          status: Number(raw.status ?? 1),
          updatedAt: String(raw.updated_at ?? ""),
        }),
      );

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
