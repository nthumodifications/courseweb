import type {
  CityBusStaticDirection,
  CityBusStaticRoute,
  CityBusStaticStop,
  TdxEtaRecord,
  TdxNearStopRecord,
  TdxPositionRecord,
} from "./types";

/**
 * TDX allows this key only 5 data requests per minute, so live data is fetched
 * for the whole city at once (3 calls) and shared by every user through one
 * snapshot row, instead of being fetched per route. Refreshes are at least a
 * minute apart: at 45s two refreshes (6 calls) could land in one TDX minute,
 * get 429 and push the snapshot towards stale.
 */
export const CITYBUS_REFRESH_MS = 60_000;
/** Past this age a snapshot is not shown as live; the client falls back to the timetable. */
export const CITYBUS_STALE_MS = 150_000;
/** A bus whose GPS fix is older than this is parked or offline, not a live vehicle. */
export const CITYBUS_GPS_MAX_AGE_MS = 180_000;
const LEASE_MS = 20_000;
const BACKOFF_MS = 60_000;
const CITY_KEY = "city:Hsinchu";

export type CityBusRealtimeReason =
  | "ok"
  | "not_configured"
  | "unsupported"
  | "unavailable"
  | "stale";

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

export interface CityBusVehicle {
  plate: string;
  lat: number;
  lon: number;
  speed: number | null;
  azimuth: number | null;
  gpsAt: string;
  busStatus: number | null;
  /** The stop this bus most recently reported near, when known. */
  stopId: string | null;
}

export interface CityBusEtaResponse {
  routeId: string;
  directionId: string;
  stops: CityBusRealtimeStop[];
  buses: CityBusRealtimeBus[];
  vehicles: CityBusVehicle[];
  updatedAt: string | null;
  /** When the server last pulled this data from TDX. */
  fetchedAt: string | null;
  realtime: boolean;
  reason: CityBusRealtimeReason;
}

export interface CityBusSnapshot {
  eta: TdxEtaRecord[];
  nearStop: TdxNearStopRecord[];
  positions: TdxPositionRecord[];
  updatedAt: string | null;
  fetchedAt: number;
}

export interface CityBusBindings {
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
  DB?: D1Like;
}

export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

interface SnapshotRow {
  snapshot: CityBusSnapshot | undefined;
  leaseUntil: number;
}

interface SnapshotStore {
  read(): Promise<SnapshotRow | undefined>;
  acquire(now: number): Promise<boolean>;
  write(snapshot: CityBusSnapshot): Promise<void>;
  backoff(until: number): Promise<void>;
}

interface CacheLike {
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}

const TDX_BASE_URL = "https://tdx.transportdata.tw/api/basic/v2/Bus";
const TDX_TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";

// $select keeps the stored snapshot well under D1's 2 MB row limit.
const ETA_SELECT =
  "PlateNumb,StopUID,StopID,RouteUID,SubRouteUID,Direction,EstimateTime,StopCountDown,StopStatus,IsLastBus,NextBusTime,SrcUpdateTime,UpdateTime,DataTime";
const NEAR_STOP_SELECT =
  "PlateNumb,RouteUID,SubRouteUID,Direction,StopUID,StopID,StopSequence,A2EventType,BusStatus,GPSTime,UpdateTime";
const POSITION_SELECT =
  "PlateNumb,RouteUID,SubRouteUID,Direction,BusPosition,Speed,Azimuth,DutyStatus,BusStatus,GPSTime,UpdateTime";

const memoryStoreState: { row: SnapshotRow } = {
  row: { snapshot: undefined, leaseUntil: 0 },
};
let memoryToken: { accessToken: string; expiresAt: number } | undefined;
let tokenFlight: Promise<string | undefined> | undefined;
let refreshFlight: Promise<CityBusSnapshot | undefined> | undefined;

function getCache() {
  return (
    globalThis as typeof globalThis & {
      caches?: { default?: CacheLike };
    }
  ).caches?.default;
}

const tokenCacheKey = new Request(
  "https://nthumods.internal/citybus/tdx-token",
);

function memoryStore(): SnapshotStore {
  return {
    async read() {
      return memoryStoreState.row;
    },
    async acquire(now) {
      if (memoryStoreState.row.leaseUntil > now) return false;
      memoryStoreState.row.leaseUntil = now + LEASE_MS;
      return true;
    },
    async write(snapshot) {
      memoryStoreState.row = {
        snapshot,
        leaseUntil: snapshot.fetchedAt + CITYBUS_REFRESH_MS,
      };
    },
    async backoff(until) {
      memoryStoreState.row.leaseUntil = until;
    },
  };
}

function d1Store(db: D1Like): SnapshotStore {
  return {
    async read() {
      const row = await db
        .prepare(
          'SELECT "payload", "leaseUntil" FROM "CityBusSnapshot" WHERE "key" = ?',
        )
        .bind(CITY_KEY)
        .first<{ payload: string; leaseUntil: number }>();
      if (!row) return undefined;
      let snapshot: CityBusSnapshot | undefined;
      try {
        snapshot = row.payload
          ? (JSON.parse(row.payload) as CityBusSnapshot)
          : undefined;
      } catch {
        snapshot = undefined;
      }
      return { snapshot, leaseUntil: row.leaseUntil };
    },
    async acquire(now) {
      await db
        .prepare(
          'INSERT OR IGNORE INTO "CityBusSnapshot" ("key", "payload", "fetchedAt", "leaseUntil") VALUES (?, \'\', 0, 0)',
        )
        .bind(CITY_KEY)
        .run();
      // The WHERE clause makes this an atomic compare-and-set across isolates.
      const result = await db
        .prepare(
          'UPDATE "CityBusSnapshot" SET "leaseUntil" = ? WHERE "key" = ? AND "leaseUntil" <= ?',
        )
        .bind(now + LEASE_MS, CITY_KEY, now)
        .run();
      return (result.meta?.changes ?? 0) > 0;
    },
    async write(snapshot) {
      await db
        .prepare(
          'UPDATE "CityBusSnapshot" SET "payload" = ?, "fetchedAt" = ?, "leaseUntil" = ? WHERE "key" = ?',
        )
        .bind(
          JSON.stringify(snapshot),
          snapshot.fetchedAt,
          snapshot.fetchedAt + CITYBUS_REFRESH_MS,
          CITY_KEY,
        )
        .run();
    },
    async backoff(until) {
      await db
        .prepare(
          'UPDATE "CityBusSnapshot" SET "leaseUntil" = ? WHERE "key" = ?',
        )
        .bind(until, CITY_KEY)
        .run();
    },
  };
}

function storeFor(env: CityBusBindings) {
  return env.DB ? d1Store(env.DB) : memoryStore();
}

function timestampFor(
  record: TdxEtaRecord | TdxNearStopRecord | TdxPositionRecord,
) {
  const value = record as TdxEtaRecord & TdxPositionRecord;
  return value.SrcUpdateTime ?? value.UpdateTime ?? value.DataTime ?? undefined;
}

function latestTimestamp(
  records: Array<TdxEtaRecord | TdxNearStopRecord | TdxPositionRecord>,
) {
  return (
    records
      .map(timestampFor)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null
  );
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

const TOKEN_KEY = "tdx:token";

async function readStoredToken(env: CityBusBindings) {
  if (!env.DB) return undefined;
  const row = await env.DB.prepare(
    'SELECT "payload", "leaseUntil" FROM "CityBusSnapshot" WHERE "key" = ?',
  )
    .bind(TOKEN_KEY)
    .first<{ payload: string; leaseUntil: number }>();
  if (!row?.payload) return undefined;
  return { accessToken: row.payload, expiresAt: row.leaseUntil };
}

async function writeStoredToken(
  env: CityBusBindings,
  token: { accessToken: string; expiresAt: number },
) {
  if (!env.DB) return;
  await env.DB.prepare(
    'INSERT OR REPLACE INTO "CityBusSnapshot" ("key", "payload", "fetchedAt", "leaseUntil") VALUES (?, ?, ?, ?)',
  )
    .bind(TOKEN_KEY, token.accessToken, Date.now(), token.expiresAt)
    .run();
}

export async function getTdxAccessToken(env: CityBusBindings = {}) {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) return undefined;
  const usableBefore = Date.now() + 60_000;
  if (memoryToken && memoryToken.expiresAt > usableBefore)
    return memoryToken.accessToken;

  // The edge cache is per data centre and isolates come and go, so the token
  // is also kept in D1. Every isolate then shares one token for its whole
  // lifetime (TDX issues ~24h tokens) instead of each asking for its own,
  // which TDX's token endpoint answers with 429 on Cloudflare's shared IPs.
  for (const read of [readCachedToken, () => readStoredToken(env)]) {
    const cached = await read().catch(() => undefined);
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
      if (!response.ok) {
        console.warn(`TDX token request failed: ${response.status}`);
        return undefined;
      }
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
      await Promise.all([
        writeCachedToken(value),
        writeStoredToken(env, value).catch((error) =>
          console.warn("Storing TDX token failed", error),
        ),
      ]);
      return value.accessToken;
    })().finally(() => {
      tokenFlight = undefined;
    });
  }
  return tokenFlight;
}

async function fetchTdx<T>(resource: string, select: string, token: string) {
  const url = `${TDX_BASE_URL}/${resource}/City/Hsinchu?$select=${select}&$format=JSON`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    // 429 means the 5/min TDX quota is exhausted; the caller backs off.
    throw new Error(`TDX ${resource} failed: ${response.status}`);
  }
  return (await response.json()) as T[];
}

async function fetchCitySnapshot(
  env: CityBusBindings,
): Promise<CityBusSnapshot> {
  const token = await getTdxAccessToken(env);
  if (!token) throw new Error("TDX token unavailable");
  const [eta, nearStop, positions] = await Promise.all([
    fetchTdx<TdxEtaRecord>("EstimatedTimeOfArrival", ETA_SELECT, token),
    fetchTdx<TdxNearStopRecord>("RealTimeNearStop", NEAR_STOP_SELECT, token),
    fetchTdx<TdxPositionRecord>("RealTimeByFrequency", POSITION_SELECT, token),
  ]);
  return {
    eta,
    nearStop,
    positions,
    updatedAt: latestTimestamp([...eta, ...nearStop, ...positions]),
    fetchedAt: Date.now(),
  };
}

/**
 * Pulls a fresh city snapshot if (and only if) this caller wins the lease, so
 * no matter how many isolates or users ask, TDX sees one refresh per interval.
 */
async function refreshCitySnapshot(env: CityBusBindings, now: number) {
  const store = storeFor(env);
  try {
    if (!(await store.acquire(now))) return undefined;
  } catch (error) {
    console.warn("City bus snapshot lease failed", error);
    return undefined;
  }
  try {
    const snapshot = await fetchCitySnapshot(env);
    await store.write(snapshot);
    return snapshot;
  } catch (error) {
    console.warn("City bus refresh failed", error);
    await store.backoff(Date.now() + BACKOFF_MS).catch(() => undefined);
    return undefined;
  }
}

export interface CityBusRealtimeResult {
  snapshot: CityBusSnapshot | undefined;
  reason: CityBusRealtimeReason;
}

export async function getCityBusRealtimeSnapshot(
  env: CityBusBindings = {},
  ctx?: { waitUntil(promise: Promise<unknown>): void },
): Promise<CityBusRealtimeResult> {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET)
    return { snapshot: undefined, reason: "not_configured" };
  const now = Date.now();
  let row: SnapshotRow | undefined;
  try {
    row = await storeFor(env).read();
  } catch (error) {
    console.warn("City bus snapshot read failed", error);
  }
  const cached = row?.snapshot;
  const age = cached ? now - cached.fetchedAt : Number.POSITIVE_INFINITY;

  let current = cached;
  if (age >= CITYBUS_REFRESH_MS) {
    refreshFlight ??= refreshCitySnapshot(env, now).finally(() => {
      refreshFlight = undefined;
    });
    const flight = refreshFlight;
    if (cached && ctx && age < CITYBUS_STALE_MS) {
      // Serve what we have now; the next request sees the refreshed row.
      // A snapshot already too old to show is waited on instead, so the
      // first visitor after a quiet spell gets live data, not "stale".
      ctx.waitUntil(flight);
    } else {
      current = (await flight) ?? cached;
    }
  }
  if (!current) return { snapshot: undefined, reason: "unavailable" };
  if (Date.now() - current.fetchedAt > CITYBUS_STALE_MS)
    return { snapshot: undefined, reason: "stale" };
  return { snapshot: current, reason: "ok" };
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

function recordsForDirection<T extends { SubRouteUID?: string }>(
  records: T[],
  direction: CityBusStaticDirection,
) {
  // The snapshot covers the whole city and a route can have several variants
  // (e.g. 23 and 23 A1) that share RouteUID and Direction, so only an exact
  // SubRouteUID match is safe; looser matching shows another variant's buses.
  return records.filter((record) => record.SubRouteUID === direction.id);
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

// BusStatus 90, 98 and 99 are non-revenue states (not operating, off duty).
const HIDDEN_BUS_STATUS = new Set([90, 98, 99]);

function buildVehicles(
  positions: TdxPositionRecord[],
  nearStop: TdxNearStopRecord[],
  stops: CityBusStaticStop[],
  now: number,
): CityBusVehicle[] {
  const vehicles: CityBusVehicle[] = [];
  for (const record of positions) {
    const id = plate(record.PlateNumb);
    const lat = record.BusPosition?.PositionLat;
    const lon = record.BusPosition?.PositionLon;
    if (!id || typeof lat !== "number" || typeof lon !== "number") continue;
    if (!record.GPSTime) continue;
    const gpsAge = now - Date.parse(record.GPSTime);
    if (!Number.isFinite(gpsAge) || gpsAge > CITYBUS_GPS_MAX_AGE_MS) continue;
    if (record.DutyStatus === 2) continue;
    if (
      record.BusStatus !== undefined &&
      HIDDEN_BUS_STATUS.has(record.BusStatus)
    )
      continue;
    const near = nearStop.find((item) => plate(item.PlateNumb) === id);
    vehicles.push({
      plate: id,
      lat,
      lon,
      speed: record.Speed ?? null,
      azimuth: record.Azimuth ?? null,
      gpsAt: record.GPSTime,
      busStatus: record.BusStatus ?? null,
      stopId: near ? (stopIdForRecord(near, stops) ?? null) : null,
    });
  }
  return vehicles;
}

export function buildCityBusEtaResponse(
  route: CityBusStaticRoute,
  direction: CityBusStaticDirection,
  snapshot: CityBusSnapshot,
  now = Date.now(),
): CityBusEtaResponse {
  const etaRecords = recordsForDirection(snapshot.eta, direction);
  const nearStopRecords = recordsForDirection(snapshot.nearStop, direction);
  const positionRecords = recordsForDirection(
    snapshot.positions ?? [],
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
    vehicles: buildVehicles(
      positionRecords,
      nearStopRecords,
      direction.stops,
      now,
    ),
    updatedAt: snapshot.updatedAt,
    fetchedAt: new Date(snapshot.fetchedAt).toISOString(),
    realtime: true,
    reason: "ok",
  };
}

export function resetCityBusRealtimeCacheForTests() {
  memoryStoreState.row = { snapshot: undefined, leaseUntil: 0 };
  memoryToken = undefined;
  tokenFlight = undefined;
  refreshFlight = undefined;
}
