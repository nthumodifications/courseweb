import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import {
  routeHasHsinchuCityStop,
  isHsinchuCityStop,
  normalizeScheduleRecords,
  type AnyRecord,
} from "./normalize";
import { sanitizeLogValue } from "./logging";

const BASE = "https://tdx.transportdata.tw/api/basic/v2/Bus";
const TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const RAW_DIR = "tools/citybus/raw";
const API_DATA_PATH = "services/api/src/citybus/data.json";
const WEB_DIR = "apps/web/public/fallback_data/citybus";
const CAMPUS_STOP = /清華|清大|台積館|北校門|南大|光復路/;
const PILOT_MARKER = /先導/;
const TAIWANBUS_URL = "https://www.taiwanbus.tw/";

type Category = "pilot" | "city" | "intercity";

interface CityBusStop {
  id: string;
  nameZh: string;
  nameEn: string;
  sequence: number;
  nearCampus: boolean;
  position?: { lat: number; lon: number };
}

interface CityBusDirection {
  id: string;
  labelZh: string;
  labelEn: string;
  originZh: string;
  originEn: string;
  destinationZh: string;
  destinationEn: string;
  stops: CityBusStop[];
  schedules: ReturnType<typeof normalizeScheduleRecords>;
}

interface CityBusRoute {
  id: string;
  source: "city" | "intercity";
  category: Category;
  tdxRouteUid: string;
  tdxRouteName: string;
  nameZh: string;
  nameEn: string;
  operatorZh?: string;
  operatorEn?: string;
  timesUrl?: string;
  directions: CityBusDirection[];
}

const routeAliases: Record<string, string> = {
  藍線: "blue",
  藍線1區: "blue-1",
};

const source = {
  name: "TDX Transport Data eXchange",
  url: "https://tdx.transportdata.tw/api-service/swagger",
  license: "政府資料開放授權條款－第1版",
  attribution: "資料來源：交通部運輸資料流通服務平臺（TDX）",
};

async function getToken() {
  const clientId = process.env.TDX_CLIENT_ID;
  const clientSecret = process.env.TDX_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!response.ok)
    throw new Error(`TDX token request failed: ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

async function fetchRaw(name: string, path: string, token?: string) {
  const response = await fetch(`${BASE}/${path}?%24format=JSON`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "NTHUMods city bus data generator",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok)
    throw new Error(`TDX request failed (${response.status}): ${path}`);
  const text = await response.text();
  await Bun.write(`${RAW_DIR}/${name}.json`, `${text.trim()}\n`);
  return JSON.parse(text) as AnyRecord[];
}

async function readRaw(name: string) {
  return JSON.parse(
    await Bun.file(`${RAW_DIR}/${name}.json`).text(),
  ) as AnyRecord[];
}

async function loadIntercityStops(token?: string) {
  const path = "StopOfRoute/InterCity";
  const query = new URLSearchParams({
    $filter:
      "Stops/any(s:s/StopPosition/PositionLat ge 24.7 and s/StopPosition/PositionLat le 24.88 and s/StopPosition/PositionLon ge 120.9 and s/StopPosition/PositionLon le 121.06)",
    $select: "RouteUID,RouteName,Direction,Stops",
    $format: "JSON",
  }).toString();
  const response = await fetch(`${BASE}/${path}?${query}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "NTHUMods city bus data generator",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok)
    throw new Error(`TDX request failed (${response.status}): ${path}`);
  const text = await response.text();
  await Bun.write(`${RAW_DIR}/intercity-campus-stops.json`, `${text.trim()}\n`);
  return JSON.parse(text) as AnyRecord[];
}

async function loadSourceData() {
  await mkdir(RAW_DIR, { recursive: true });
  const token = await getToken();
  const shouldFetch =
    process.argv.includes("--fetch") ||
    !existsSync(`${RAW_DIR}/route-city-hsinchu.json`);
  if (shouldFetch) {
    const [routes, stops, schedules] = await Promise.all([
      fetchRaw("route-city-hsinchu", "Route/City/Hsinchu", token),
      fetchRaw("stopofroute-city-hsinchu", "StopOfRoute/City/Hsinchu", token),
      fetchRaw("schedule-city-hsinchu", "Schedule/City/Hsinchu", token),
    ]);
    return {
      routes,
      stops,
      schedules,
      intercityStops: await loadIntercityStops(token),
    };
  }
  return {
    routes: await readRaw("route-city-hsinchu"),
    stops: await readRaw("stopofroute-city-hsinchu"),
    schedules: await readRaw("schedule-city-hsinchu"),
    intercityStops: existsSync(`${RAW_DIR}/intercity-campus-stops.json`)
      ? await readRaw("intercity-campus-stops")
      : [],
  };
}

function routeId(name: string, uid: string, sourceType: "city" | "intercity") {
  if (sourceType === "intercity") return `intercity-${uid.toLowerCase()}`;
  return routeAliases[name] ?? name;
}

function categoryFor(name: string): Category {
  return PILOT_MARKER.test(name) ? "pilot" : "city";
}

function operator(route: AnyRecord) {
  const item = route.Operators?.[0]?.OperatorName;
  return { zh: item?.Zh_tw, en: item?.En };
}

function stopFromRaw(stop: AnyRecord, sequence = 0): CityBusStop {
  return {
    id: stop.StopUID,
    nameZh: stop.StopName?.Zh_tw ?? stop.StopUID,
    nameEn: stop.StopName?.En ?? stop.StopUID,
    sequence: Number(stop.StopSequence ?? sequence),
    nearCampus: CAMPUS_STOP.test(stop.StopName?.Zh_tw ?? ""),
    ...(stop.StopPosition
      ? {
          position: {
            lat: stop.StopPosition.PositionLat,
            lon: stop.StopPosition.PositionLon,
          },
        }
      : {}),
  };
}

function directionFor(
  route: AnyRecord,
  routeStop: AnyRecord,
  scheduleRecords: AnyRecord[],
): CityBusDirection {
  const subRoute = route.SubRoutes?.find(
    (item: AnyRecord) => item.SubRouteUID === routeStop.SubRouteUID,
  );
  const rawStops = [...(routeStop.Stops ?? [])].sort(
    (a, b) => Number(a.StopSequence ?? 0) - Number(b.StopSequence ?? 0),
  );
  const stops = rawStops.map((stop, index) => stopFromRaw(stop, index + 1));
  const schedules = normalizeScheduleRecords(scheduleRecords, rawStops);
  const first = stops[0];
  const last = stops[stops.length - 1];
  return {
    id: routeStop.SubRouteUID ?? `${route.RouteUID}-${routeStop.Direction}`,
    labelZh:
      subRoute?.Headsign ??
      `${routeStop.DepartureStopNameZh ?? first?.nameZh ?? ""}→${routeStop.DestinationStopNameZh ?? last?.nameZh ?? ""}`,
    labelEn:
      subRoute?.HeadsignEn ??
      `${routeStop.DepartureStopNameEn ?? first?.nameEn ?? ""} to ${routeStop.DestinationStopNameEn ?? last?.nameEn ?? ""}`,
    originZh: routeStop.DepartureStopNameZh ?? first?.nameZh ?? "",
    originEn: routeStop.DepartureStopNameEn ?? first?.nameEn ?? "",
    destinationZh: routeStop.DestinationStopNameZh ?? last?.nameZh ?? "",
    destinationEn: routeStop.DestinationStopNameEn ?? last?.nameEn ?? "",
    stops,
    schedules,
  };
}

function buildCityRoutes(
  routes: AnyRecord[],
  stopRows: AnyRecord[],
  scheduleRows: AnyRecord[],
): CityBusRoute[] {
  return routes.map((route) => {
    const rows = stopRows.filter((item) => item.RouteUID === route.RouteUID);
    const directions = rows.map((row) =>
      directionFor(
        route,
        row,
        scheduleRows.filter(
          (item) =>
            item.RouteUID === route.RouteUID &&
            (row.SubRouteUID
              ? item.SubRouteUID === row.SubRouteUID
              : item.Direction === row.Direction),
        ),
      ),
    );
    const routeOperator = operator(route);
    const name = route.RouteName?.Zh_tw ?? route.RouteUID;
    return {
      id: routeId(name, route.RouteUID, "city"),
      source: "city",
      category: categoryFor(name),
      tdxRouteUid: route.RouteUID,
      tdxRouteName: name,
      nameZh: name,
      nameEn: route.RouteName?.En ?? name,
      ...(routeOperator.zh ? { operatorZh: routeOperator.zh } : {}),
      ...(routeOperator.en ? { operatorEn: routeOperator.en } : {}),
      directions,
    };
  });
}

function buildIntercityRoutes(rows: AnyRecord[]): CityBusRoute[] {
  const byRoute = new Map<string, AnyRecord[]>();
  for (const row of rows.filter(routeHasHsinchuCityStop)) {
    const list = byRoute.get(row.RouteUID) ?? [];
    list.push(row);
    byRoute.set(row.RouteUID, list);
  }
  return [...byRoute.entries()].map(([uid, routeRows]) => {
    const routeName = routeRows[0].RouteName?.Zh_tw ?? uid;
    const directions = routeRows.map((row) =>
      directionFor({ RouteUID: uid, SubRoutes: [] }, row, []),
    );
    return {
      id: routeId(routeName, uid, "intercity"),
      source: "intercity",
      category: "intercity",
      tdxRouteUid: uid,
      tdxRouteName: routeName,
      nameZh: routeName,
      nameEn: routeRows[0].RouteName?.En ?? routeName,
      timesUrl: TAIWANBUS_URL,
      directions,
    };
  });
}

function campusRank(name: string) {
  const index = [
    "清華大學",
    "清大北校門",
    "清大南大校區",
    "台積館",
    "光復路",
    "北校門",
  ].findIndex((item) => name.includes(item));
  return index === -1 ? 99 : index;
}

function directionSummary(direction: CityBusDirection) {
  return {
    id: direction.id,
    labelZh: direction.labelZh,
    labelEn: direction.labelEn,
    destinationZh: direction.destinationZh,
    destinationEn: direction.destinationEn,
    campusStops: direction.stops
      .filter((stop) => stop.nearCampus)
      .sort((a, b) => campusRank(a.nameZh) - campusRank(b.nameZh))
      .map((stop) => ({
        id: stop.id,
        nameZh: stop.nameZh,
        nameEn: stop.nameEn,
      })),
  };
}

function indexFor(routes: CityBusRoute[], generatedAt: string) {
  return {
    routes: routes.map((route) => ({
      id: route.id,
      source: route.source,
      category: route.category,
      nameZh: route.nameZh,
      nameEn: route.nameEn,
      ...(route.timesUrl ? { timesUrl: route.timesUrl } : {}),
      directions: route.directions.map(directionSummary),
      stopNamesZh: [
        ...new Set(
          route.directions.flatMap((direction) =>
            direction.stops.map((stop) => stop.nameZh),
          ),
        ),
      ],
      stopNamesEn: [
        ...new Set(
          route.directions.flatMap((direction) =>
            direction.stops.map((stop) => stop.nameEn),
          ),
        ),
      ],
    })),
  };
}

const {
  routes: rawRoutes,
  stops,
  schedules,
  intercityStops,
} = await loadSourceData();
const generatedAt = new Date().toISOString().slice(0, 10);
const routes = [
  ...buildCityRoutes(rawRoutes, stops, schedules),
  ...buildIntercityRoutes(intercityStops),
];
const output = { version: 2, generatedAt, source, routes };

await mkdir(`${WEB_DIR}/routes`, { recursive: true });
await Bun.write(API_DATA_PATH, JSON.stringify(output));
await Bun.write(
  `${WEB_DIR}/index.json`,
  JSON.stringify(indexFor(routes, generatedAt)),
);
for (const route of routes) {
  await Bun.write(
    `${WEB_DIR}/routes/${encodeURIComponent(route.id)}.json`,
    JSON.stringify({ ...route, generatedAt, sourceInfo: source }),
  );
}
console.log(
  `Wrote ${sanitizeLogValue(routes.length)} routes (${sanitizeLogValue(rawRoutes.length)} city, ${sanitizeLogValue(new Set(intercityStops.map((row) => row.RouteUID)).size)} intercity)`,
);
