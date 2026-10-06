import type {
  D1Database,
  D1PreparedStatement,
} from "@cloudflare/workers-types";
import type { Bindings } from "../index";
import {
  addLocalDays,
  buildProfile,
  buildSeriesForecast,
  emptyUsageProfile,
  type ForecastMeta,
  type HistoryObservation,
  type StoredAnomalyState,
  type TodayObservation,
  taipeiSlotAt,
} from "./model";
import type {
  UsageForecastResponse,
  UsageKind,
  UsageSeries,
  UsageSource,
} from "./types";

export const PEO_OCCUPANCY_URL =
  "https://peo178.et.nthu.edu.tw/api/verify/count/report";
export const LIBRARY_STATUS_URL =
  "https://libsms.lib.nthu.edu.tw/RWDAPI_New/GetDevUseStatus.aspx";
export const USAGE_USER_AGENT = "NTHUMods-usage-history/1.0 (+https://nthumods.com)";
export const MAX_PROFILE_REBUILDS_PER_TICK = 2;
export const SNAPSHOT_CACHE_KEY = (source: UsageSource) => `usage-snapshot:${source}`;
export const PROFILE_CACHE_KEY = (source: UsageSource, seriesId: string) =>
  `usage-profile:${source}:${seriesId}`;
export const RETENTION_CACHE_KEY = "usage-retention";

export interface UsageSample {
  id: string;
  name: string;
  value: number;
}

export interface UpstreamResult {
  samples: UsageSample[] | null;
  error?: unknown;
}

type PEOItem = {
  project_id: unknown;
  project_name: unknown;
  entry_count_now: unknown;
};

type LibraryItem = {
  zoneid: unknown;
  zonename: unknown;
  count: unknown;
};

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function parsePeoPayload(payload: unknown): UsageSample[] | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { status?: unknown; data?: unknown };
  if (value.status !== 200 || !Array.isArray(value.data)) return null;
  const items: UsageSample[] = [];
  for (const raw of value.data as PEOItem[]) {
    if (
      !raw ||
      typeof raw.project_id !== "string" ||
      !raw.project_id ||
      typeof raw.project_name !== "string" ||
      !raw.project_name ||
      !isFiniteNonNegative(raw.entry_count_now)
    ) {
      return null;
    }
    items.push({
      id: raw.project_id,
      name: raw.project_name,
      value: raw.entry_count_now,
    });
  }
  return items.length > 0 ? items : null;
}

export function parseLibraryPayload(payload: unknown): UsageSample[] | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { rescode?: unknown; rows?: unknown };
  if (value.rescode !== 1 || !Array.isArray(value.rows)) return null;
  const items: UsageSample[] = [];
  for (const raw of value.rows as LibraryItem[]) {
    if (
      !raw ||
      (typeof raw.zoneid !== "string" && typeof raw.zoneid !== "number") ||
      !String(raw.zoneid) ||
      typeof raw.zonename !== "string" ||
      !raw.zonename ||
      !isFiniteNonNegative(raw.count)
    ) {
      return null;
    }
    items.push({ id: String(raw.zoneid), name: raw.zonename, value: raw.count });
  }
  return items.length > 0 ? items : null;
}

async function fetchJson(
  url: string,
  parse: (value: unknown) => UsageSample[] | null,
  fetcher: typeof fetch,
  timeoutMs = 8_000,
): Promise<UsageSample[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": USAGE_USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    const parsed = parse(await response.json());
    if (!parsed) throw new Error(`${url} returned a malformed payload`);
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchUsageUpstreams(
  fetcher: typeof fetch = fetch,
): Promise<{ gym: UpstreamResult; library: UpstreamResult }> {
  const [gym, library] = await Promise.all([
    fetchJson(PEO_OCCUPANCY_URL, parsePeoPayload, fetcher)
      .then((samples) => ({ samples } satisfies UpstreamResult))
      .catch((error: unknown) => ({ samples: null, error } satisfies UpstreamResult)),
    fetchJson(LIBRARY_STATUS_URL, parseLibraryPayload, fetcher)
      .then((samples) => ({ samples } satisfies UpstreamResult))
      .catch((error: unknown) => ({ samples: null, error } satisfies UpstreamResult)),
  ]);
  return { gym, library };
}

function sourceKind(source: UsageSource): UsageKind {
  return source === "gym" ? "occupancy" : "vacancy";
}

async function upsertSource(
  db: D1Database,
  source: UsageSource,
  samples: UsageSample[],
  now: Date,
): Promise<void> {
  const local = taipeiSlotAt(now);
  const statements: D1PreparedStatement[] = [];
  for (const sample of samples) {
    const id = `${source}:${sample.id}`;
    statements.push(
      db
        .prepare(
          `INSERT INTO "UsageSlot"
             ("source", "seriesId", "date", "slot", "dow", "sum", "n", "min", "max", "lastValue", "lastSampleAt")
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
           ON CONFLICT ("source", "seriesId", "date", "slot") DO UPDATE SET
             "sum" = "UsageSlot"."sum" + excluded."sum",
             "n" = "UsageSlot"."n" + 1,
             "min" = MIN("UsageSlot"."min", excluded."min"),
             "max" = MAX("UsageSlot"."max", excluded."max"),
             "lastValue" = excluded."lastValue",
             "lastSampleAt" = excluded."lastSampleAt"`,
        )
        .bind(
          source,
          sample.id,
          local.date,
          local.slot,
          local.dow,
          sample.value,
          sample.value,
          sample.value,
          sample.value,
          now.toISOString(),
        ),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO "UsageSeriesMeta"
             ("id", "source", "seriesId", "name", "firstSeen", "lastSeen", "lastValue", "lastSampleAt", "lastValueChangedAt", "lastSuccessfulAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT ("source", "seriesId") DO UPDATE SET
             "name" = excluded."name",
             "lastSeen" = excluded."lastSeen",
             "lastValueChangedAt" = CASE
               WHEN "UsageSeriesMeta"."lastValue" IS NULL OR "UsageSeriesMeta"."lastValue" != excluded."lastValue"
               THEN excluded."lastValueChangedAt"
               ELSE "UsageSeriesMeta"."lastValueChangedAt"
             END,
             "lastValue" = excluded."lastValue",
             "lastSampleAt" = excluded."lastSampleAt",
             "lastSuccessfulAt" = excluded."lastSuccessfulAt"`,
        )
        .bind(
          id,
          source,
          sample.id,
          sample.name,
          local.date,
          local.date,
          sample.value,
          now.toISOString(),
          now.toISOString(),
          now.toISOString(),
        ),
    );
  }
  if (statements.length > 0) await db.batch(statements);
}

export interface UsageSnapshotRow extends ForecastMeta {
  profileData: string | null;
  profileUpdatedAt: string | null;
  anomalyType: string | null;
  anomalySince: string | null;
  anomalySamples: number | null;
  anomalyLastObservedAt: string | null;
}

export interface UsageSnapshotStateUpdate {
  row: UsageSnapshotRow;
  previous: StoredAnomalyState | null;
  next: StoredAnomalyState;
}

export interface UsageSnapshotAssembly {
  response: UsageForecastResponse;
  stateUpdates: UsageSnapshotStateUpdate[];
}

interface SlotRow {
  seriesId: string;
  slot: number;
  value: number;
}

function parseProfile(data: string | null): ReturnType<typeof buildProfile> | null {
  if (!data) return null;
  try {
    const profile = JSON.parse(data) as ReturnType<typeof buildProfile>;
    if (
      profile.v !== 1 ||
      !Array.isArray(profile.b) ||
      !Array.isArray(profile.s) ||
      !Array.isArray(profile.n) ||
      profile.b.length !== 336 ||
      profile.s.length !== 336 ||
      profile.n.length !== 336
    ) {
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

function parseState(row: UsageSnapshotRow): StoredAnomalyState | null {
  if (!row.anomalyType && !row.anomalySince && !row.anomalySamples) return null;
  return {
    type: (row.anomalyType as StoredAnomalyState["type"]) ?? null,
    since: row.anomalySince,
    samples: row.anomalySamples ?? 0,
    lastObservedAt: row.anomalyLastObservedAt,
  };
}

export function assembleUsageSnapshot(
  source: UsageSource,
  rows: readonly UsageSnapshotRow[],
  profiles: ReadonlyMap<string, ReturnType<typeof buildProfile>>,
  today: ReadonlyMap<string, TodayObservation[]>,
  now: Date,
  local: ReturnType<typeof taipeiSlotAt>,
): UsageSnapshotAssembly {
  const series: UsageSeries[] = [];
  const stateUpdates: UsageSnapshotStateUpdate[] = [];
  for (const row of rows) {
    if (row.source !== source) continue;
    const previous = parseState(row);
    const profile = profiles.get(`${row.source}:${row.seriesId}`) ??
      emptyUsageProfile(sourceKind(source));
    const result = buildSeriesForecast({
      meta: row,
      profile,
      today: today.get(row.seriesId) ?? [],
      state: previous,
      now,
      local,
    });
    series.push(result.series);
    if (!sameStoredState(previous, result.state)) {
      stateUpdates.push({ row, previous, next: result.state });
    }
  }

  const response: UsageForecastResponse = {
    source,
    kind: sourceKind(source),
    generatedAt: now.toISOString(),
    date: local.date,
    slotMinutes: 30,
    timezone: "Asia/Taipei",
    series,
  };
  if (source === "library" &&
    new TextEncoder().encode(JSON.stringify(response)).byteLength > 150 * 1024) {
    response.series = response.series.map((item) => ({
      ...item,
      week: item.week.map((day) => day.map((value) => value === null ? null : Math.round(value))),
    }));
  }
  return { response, stateUpdates };
}

async function refreshSnapshots(db: D1Database, now: Date): Promise<void> {
  const local = taipeiSlotAt(now);
  const cutoff = addLocalDays(local.date, -56);
  const profileRows = await db
    .prepare(
      `SELECT m."source", m."seriesId", m."name", m."lastValue" AS "current",
              m."lastSampleAt", m."lastValueChangedAt", m."lastSuccessfulAt",
              c."data" AS "profileData", c."updatedAt" AS "profileUpdatedAt",
              a."type" AS "anomalyType", a."since" AS "anomalySince",
              a."samples" AS "anomalySamples", a."lastObservedAt" AS "anomalyLastObservedAt"
       FROM "UsageSeriesMeta" m
       LEFT JOIN "Cache" c ON c."key" = 'usage-profile:' || m."source" || ':' || m."seriesId"
       LEFT JOIN "UsageAnomalyState" a
         ON a."source" = m."source" AND a."seriesId" = m."seriesId"
       ORDER BY c."updatedAt" IS NOT NULL, c."updatedAt" ASC`,
    )
    .all<UsageSnapshotRow>();
  const rows = profileRows.results ?? [];
  const due = rows
    .filter((row) => {
      if (!parseProfile(row.profileData)) return true;
      if (!row.profileUpdatedAt) return true;
      const updated = Date.parse(row.profileUpdatedAt.replace(" ", "T") + (row.profileUpdatedAt.includes("Z") ? "" : "Z"));
      return !Number.isFinite(updated) || now.getTime() - updated >= 24 * 60 * 60 * 1000;
    })
    .slice(0, MAX_PROFILE_REBUILDS_PER_TICK);
  const profiles = new Map<string, ReturnType<typeof buildProfile>>();
  for (const row of rows) {
    const profile = parseProfile(row.profileData);
    if (profile) profiles.set(`${row.source}:${row.seriesId}`, profile);
  }

  for (const row of due) {
    const history = await db
      .prepare(
        `SELECT "date", "dow", "slot", "sum" / "n" AS "value"
         FROM "UsageSlot"
         WHERE "source" = ? AND "seriesId" = ? AND "date" >= ? AND "date" < ?
         ORDER BY "date", "slot"`,
      )
      .bind(row.source, row.seriesId, cutoff, local.date)
      .all<HistoryObservation>();
    const profile = buildProfile(history.results ?? [], sourceKind(row.source as UsageSource));
    profiles.set(`${row.source}:${row.seriesId}`, profile);
  }

  const profileWrites: D1PreparedStatement[] = due.map((row) => {
    const profile = profiles.get(`${row.source}:${row.seriesId}`);
    return db
      .prepare(
        `INSERT INTO "Cache" ("key", "data", "updatedAt") VALUES (?, ?, ?)
         ON CONFLICT ("key") DO UPDATE SET "data" = excluded."data", "updatedAt" = excluded."updatedAt"`,
      )
      .bind(PROFILE_CACHE_KEY(row.source as UsageSource, row.seriesId), JSON.stringify(profile), now.toISOString());
  });
  if (profileWrites.length > 0) await db.batch(profileWrites);

  const todayBySource = new Map<UsageSource, Map<string, TodayObservation[]>>();
  for (const source of ["gym", "library"] as const) {
    const todayRows = await db
      .prepare(
        `SELECT "seriesId", "slot", "sum" / "n" AS "value"
         FROM "UsageSlot" WHERE "source" = ? AND "date" = ?`,
      )
      .bind(source, local.date)
      .all<SlotRow>();
    const bySeries = new Map<string, TodayObservation[]>();
    for (const item of todayRows.results ?? []) {
      bySeries.set(item.seriesId, [...(bySeries.get(item.seriesId) ?? []), { slot: item.slot, value: item.value }]);
    }
    todayBySource.set(source, bySeries);
  }

  const responses = new Map<UsageSource, UsageForecastResponse>();
  const stateWrites: D1PreparedStatement[] = [];
  for (const source of ["gym", "library"] as const) {
    const assembled = assembleUsageSnapshot(
      source,
      rows,
      profiles,
      todayBySource.get(source) ?? new Map(),
      now,
      local,
    );
    responses.set(source, assembled.response);
    for (const update of assembled.stateUpdates) {
      const row = update.row;
      const result = update.next;
      stateWrites.push(
        db
          .prepare(
            `INSERT INTO "UsageAnomalyState"
               ("id", "source", "seriesId", "type", "since", "samples", "lastObservedAt", "updatedAt")
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT ("source", "seriesId") DO UPDATE SET
               "type" = excluded."type", "since" = excluded."since", "samples" = excluded."samples",
               "lastObservedAt" = excluded."lastObservedAt", "updatedAt" = excluded."updatedAt"`,
          )
          .bind(
            `${source}:${row.seriesId}`,
            source,
            row.seriesId,
            result.type,
            result.since,
            result.samples,
            result.lastObservedAt,
            now.toISOString(),
          ),
      );
    }
  }

  const retention = await db
    .prepare(`SELECT "updatedAt" FROM "Cache" WHERE "key" = ?`)
    .bind(RETENTION_CACHE_KEY)
    .first<{ updatedAt: string }>();
  const retentionDue = !retention?.updatedAt ||
    now.getTime() - Date.parse(String(retention.updatedAt).replace(" ", "T") + (String(retention.updatedAt).includes("Z") ? "" : "Z")) >= 24 * 60 * 60 * 1000;
  const writes = [...stateWrites];
  for (const source of ["gym", "library"] as const) {
    writes.push(
      db
        .prepare(
          `INSERT INTO "Cache" ("key", "data", "updatedAt") VALUES (?, ?, ?)
           ON CONFLICT ("key") DO UPDATE SET "data" = excluded."data", "updatedAt" = excluded."updatedAt"`,
        )
        .bind(SNAPSHOT_CACHE_KEY(source), JSON.stringify(responses.get(source)), now.toISOString()),
    );
  }
  if (retentionDue) {
    writes.push(db.prepare(`DELETE FROM "UsageSlot" WHERE "date" < ?`).bind(addLocalDays(local.date, -400)));
    writes.push(
      db
        .prepare(
          `INSERT INTO "Cache" ("key", "data", "updatedAt") VALUES (?, ?, ?)
           ON CONFLICT ("key") DO UPDATE SET "data" = excluded."data", "updatedAt" = excluded."updatedAt"`,
        )
        .bind(RETENTION_CACHE_KEY, JSON.stringify({ date: local.date }), now.toISOString()),
    );
  }
  if (writes.length > 0) await db.batch(writes);
}

function sameStoredState(a: StoredAnomalyState | null, b: StoredAnomalyState): boolean {
  return Boolean(
    ((a === null && b.type === null && b.since === null && b.samples === 0) ||
      (a &&
        a.type === b.type &&
        a.since === b.since &&
        a.samples === b.samples &&
        a.lastObservedAt === b.lastObservedAt)),
  );
}

export async function syncUsageTick(env: Bindings, now = new Date()): Promise<void> {
  try {
    const upstreams = await fetchUsageUpstreams();
    await Promise.all(
      (["gym", "library"] as const).map(async (source) => {
        const result = upstreams[source];
        if (!result.samples) {
          console.error(`Usage ${source} collector failed`, result.error);
          return;
        }
        try {
          await upsertSource(env.DB, source, result.samples, now);
        } catch (error) {
          console.error(`Usage ${source} D1 upsert failed`, error);
        }
      }),
    );
    try {
      await refreshSnapshots(env.DB, now);
    } catch (error) {
      console.error("Usage snapshot refresh failed", error);
    }
  } catch (error) {
    console.error("Usage collector tick failed", error);
  }
}
