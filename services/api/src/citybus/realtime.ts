import type {
  CityBusStaticDirection,
  CityBusStaticRoute,
  CityBusStaticStop,
  TdxEtaRecord,
  TdxNearStopRecord,
} from "./types";

export const CITYBUS_REALTIME_TTL_MS = 20_000;
export const CITYBUS_REALTIME_STALE_MS = 120_000;

export interface CityBusRealtimeStop {
  stopId: string;
  etaSeconds: number | null;
  status: number | null;
  nextBusTime: string | null;
  isLastBus: boolean;
  plate: string | null;
}

export interface CityBusRealtimeBus {
  plate: string | null;
  stopId: string;
  event: string | number | null;
}

export interface CityBusEtaResponse {
  routeId: string;
  directionId: string;
  stops: CityBusRealtimeStop[];
  buses: CityBusRealtimeBus[];
  updatedAt: string | null;
  realtime: boolean;
}

export interface CityBusSnapshot {
  eta: TdxEtaRecord[];
  nearStop: TdxNearStopRecord[];
  updatedAt: string | null;
  fetchedAt: number;
}

interface CityBusBindings {
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
}

interface CacheLike {
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}

const TDX_BASE_URL = "https://tdx.transportdata.tw/api/basic/v2/Bus";
const TDX_TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const memorySnapshots = new Map<string, CityBusSnapshot>();
const snapshotFlights = new Map<string, Promise<CityBusSnapshot | undefined>>();
let memoryToken: { accessToken: string; expiresAt: number } | undefined;
let tokenFlight: Promise<string | undefined> | undefined;

function getCache() {
  return (
    globalThis as typeof globalThis & {
      caches?: { default?: CacheLike };
    }
  ).caches?.default;
}

function routeCacheKey(route: CityBusStaticRoute) {
  return new Request(
    `https://nthumods.internal/citybus/realtime/${encodeURIComponent(route.id)}`,
  );
}

const tokenCacheKey = new Request(
  "https://nthumods.internal/citybus/tdx-token",
);

function timestampFor(record: TdxEtaRecord | TdxNearStopRecord) {
  return (
    record.SrcUpdateTime ?? record.UpdateTime ?? record.DataTime ?? undefined
  );
}

function latestTimestamp(records: Array<TdxEtaRecord | TdxNearStopRecord>) {
  return (
    records
      .map(timestampFor)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null
  );
}

async function readCachedSnapshot(route: CityBusStaticRoute) {
  const memory = memorySnapshots.get(route.id);
  const cache = getCache();
  const cachedResponse = cache
    ? await cache.match(routeCacheKey(route)).catch(() => undefined)
    : undefined;
  let cached: CityBusSnapshot | undefined;
  if (cachedResponse) {
    try {
      cached = (await cachedResponse.json()) as CityBusSnapshot;
    } catch {
      cached = undefined;
    }
  }
  if (!memory) return cached;
  if (!cached) return memory;
  return cached.fetchedAt >= memory.fetchedAt ? cached : memory;
}

async function writeCachedSnapshot(
  route: CityBusStaticRoute,
  snapshot: CityBusSnapshot,
) {
  memorySnapshots.set(route.id, snapshot);
  const cache = getCache();
  if (!cache) return;
  await cache
    .put(
      routeCacheKey(route),
      new Response(JSON.stringify(snapshot), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=20, stale-if-error=100",
        },
      }),
    )
    .catch(() => undefined);
}

async function readCachedToken() {
  const cache = getCache();
  if (!cache) return undefined;
  const response = await cache.match(tokenCacheKey).catch(() => undefined);
  if (!response) return undefined;
  try {
    return (await response.json()) as {
      accessToken?: string;
      expiresAt?: number;
    };
  } catch {
    return undefined;
  }
}

async function writeCachedToken(token: {
  accessToken: string;
  expiresAt: number;
}) {
  const cache = getCache();
  if (!cache) return;
  await cache
    .put(
      tokenCacheKey,
      new Response(JSON.stringify(token), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800",
        },
      }),
    )
    .catch(() => undefined);
}

export async function getTdxAccessToken(env: CityBusBindings = {}) {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) return undefined;
  const usableBefore = Date.now() + 60_000;
  if (memoryToken && memoryToken.expiresAt > usableBefore)
    return memoryToken.accessToken;

  const cached = await readCachedToken();
  if (
    cached?.accessToken &&
    typeof cached.expiresAt === "number" &&
    cached.expiresAt > usableBefore
  ) {
    memoryToken = {
      accessToken: cached.accessToken,
      expiresAt: cached.expiresAt,
    };
    return cached.accessToken;
  }

  if (!tokenFlight) {
    tokenFlight = (async () => {
      const response = await fetch(TDX_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: env.TDX_CLIENT_ID!,
          client_secret: env.TDX_CLIENT_SECRET!,
        }),
      });
      if (!response.ok) return undefined;
      const token = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (!token.access_token) return undefined;
      const value = {
        accessToken: token.access_token,
        expiresAt: Date.now() + Math.max(60, token.expires_in ?? 1800) * 1000,
      };
      memoryToken = value;
      await writeCachedToken(value);
      return value.accessToken;
    })().finally(() => {
      tokenFlight = undefined;
    });
  }
  return tokenFlight;
}

function tdxPath(route: CityBusStaticRoute, resource: string) {
  const scope = route.source === "city" ? "City/Hsinchu" : "InterCity";
  return `${TDX_BASE_URL}/${resource}/${scope}/${encodeURIComponent(route.tdxRouteName)}?$format=JSON`;
}

async function fetchJson<T>(url: string, token: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return undefined;
  return (await response.json()) as T;
}

async function fetchSnapshot(
  route: CityBusStaticRoute,
  token: string,
): Promise<CityBusSnapshot> {
  const etaResponse = await fetchJson<TdxEtaRecord[]>(
    tdxPath(route, "EstimatedTimeOfArrival"),
    token,
  );
  if (!etaResponse) throw new Error("TDX ETA request failed");
  const nearStopResponse = await fetchJson<TdxNearStopRecord[]>(
    tdxPath(route, "RealTimeNearStop"),
    token,
  );
  if (!nearStopResponse) throw new Error("TDX near-stop request failed");
  const records = [...etaResponse, ...(nearStopResponse ?? [])];
  return {
    eta: etaResponse,
    nearStop: nearStopResponse ?? [],
    updatedAt: latestTimestamp(records),
    fetchedAt: Date.now(),
  };
}

export async function getCityBusRealtimeSnapshot(
  route: CityBusStaticRoute,
  env: CityBusBindings = {},
) {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) return undefined;
  const now = Date.now();
  const cached = await readCachedSnapshot(route);
  if (cached && now - cached.fetchedAt < CITYBUS_REALTIME_TTL_MS) {
    memorySnapshots.set(route.id, cached);
    return cached;
  }

  const flight = snapshotFlights.get(route.id);
  if (flight) return flight;
  const next = (async () => {
    try {
      const token = await getTdxAccessToken(env);
      if (!token) return undefined;
      const snapshot = await fetchSnapshot(route, token);
      await writeCachedSnapshot(route, snapshot);
      return snapshot;
    } catch {
      const stale = await readCachedSnapshot(route);
      return stale && Date.now() - stale.fetchedAt < CITYBUS_REALTIME_STALE_MS
        ? stale
        : undefined;
    }
  })().finally(() => snapshotFlights.delete(route.id));
  snapshotFlights.set(route.id, next);
  return next;
}

function stopKey(value: string | undefined) {
  return value?.replace(/^[A-Za-z]+/, "") ?? "";
}

function recordMatchesStop(
  record: TdxEtaRecord | TdxNearStopRecord,
  stop: CityBusStaticStop,
) {
  return (
    record.StopUID === stop.id ||
    record.StopID === stop.id ||
    stopKey(record.StopID) === stopKey(stop.id)
  );
}

function recordsForDirection(
  records: TdxEtaRecord[] | TdxNearStopRecord[],
  route: CityBusStaticRoute,
  direction: CityBusStaticDirection,
) {
  const exact = records.filter((record) => record.SubRouteUID === direction.id);
  if (exact.length > 0) return exact;
  const directionValue = /(?:-1|2)$/.test(direction.id) ? 1 : 0;
  return records.filter(
    (record) =>
      (!record.SubRouteUID || record.SubRouteUID === route.tdxRouteUid) &&
      record.Direction === directionValue,
  );
}

function usableEta(record: TdxEtaRecord) {
  if (record.StopStatus !== undefined && record.StopStatus !== 0) return null;
  const value = record.EstimateTime ?? record.StopCountDown;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function bestEtaRecord(records: TdxEtaRecord[]) {
  return [...records].sort((a, b) => {
    const aEta = usableEta(a);
    const bEta = usableEta(b);
    if (aEta === null && bEta !== null) return 1;
    if (aEta !== null && bEta === null) return -1;
    return (
      (aEta ?? Number.POSITIVE_INFINITY) - (bEta ?? Number.POSITIVE_INFINITY)
    );
  })[0];
}

function plate(value: string | null | undefined) {
  return value && value !== "-1" ? value : null;
}

function nearStopEvent(record: TdxNearStopRecord) {
  return (
    record.EventType ??
    record.A2EventType ??
    record.Event ??
    record.BusStatus ??
    null
  );
}

function stopIdForRecord(
  record: TdxNearStopRecord,
  stops: CityBusStaticStop[],
) {
  return stops.find((stop) => recordMatchesStop(record, stop))?.id;
}

export function buildCityBusEtaResponse(
  route: CityBusStaticRoute,
  direction: CityBusStaticDirection,
  snapshot: CityBusSnapshot,
): CityBusEtaResponse {
  const etaRecords = recordsForDirection(snapshot.eta, route, direction);
  const nearStopRecords = recordsForDirection(
    snapshot.nearStop,
    route,
    direction,
  );
  const stops = direction.stops.map((stop) => {
    const record = bestEtaRecord(
      etaRecords.filter((candidate) => recordMatchesStop(candidate, stop)),
    );
    return {
      stopId: stop.id,
      etaSeconds: record ? usableEta(record) : null,
      status: record?.StopStatus ?? null,
      nextBusTime: record?.NextBusTime ?? null,
      isLastBus: record?.IsLastBus ?? false,
      plate: plate(record?.PlateNumb),
    };
  });
  const buses = nearStopRecords.flatMap((record) => {
    const stopId = stopIdForRecord(record, direction.stops);
    return stopId
      ? [
          {
            plate: plate(record.PlateNumb),
            stopId,
            event: nearStopEvent(record),
          },
        ]
      : [];
  });
  return {
    routeId: route.id,
    directionId: direction.id,
    stops,
    buses,
    updatedAt: snapshot.updatedAt,
    realtime: true,
  };
}

export function resetCityBusRealtimeCacheForTests() {
  memorySnapshots.clear();
  snapshotFlights.clear();
  memoryToken = undefined;
  tokenFlight = undefined;
}
