import {
  addLocalDays,
  buildProfile,
  buildSeriesForecast,
  SLOT_COUNT,
  taipeiSlotAt,
  type HistoryObservation,
  type SeriesForecastInput,
  type UsageProfile,
} from "../src/usage/model";
import type { UsageForecastResponse, UsageKind } from "../src/usage/types";

type Scenario = "mixed" | "learning" | "empty";

interface DemoSeries {
  id: string;
  name: string;
  capacity: number;
}

const GYM_SERIES: DemoSeries[] = [
  { id: "a3a3fd1f-45cb-11f0-99cb-0a0527672341", name: "體能訓練室", capacity: 50 },
  { id: "897d1772-45cb-11f0-99cb-0a0527672341", name: "游泳池", capacity: 80 },
  { id: "5bdafcc0-45cb-11f0-99cb-0a0527672341", name: "校友館羽球場", capacity: 42 },
  { id: "17e86df6-4667-11f0-99cb-0a0527672341", name: "網球場", capacity: 36 },
  { id: "c4ff46db-69ea-11f0-832d-00155d32d802", name: "桌球館", capacity: 53 },
];

const LIBRARY_SERIES: DemoSeries[] = [
  { id: "8_4A", name: "4F-夜讀區A", capacity: 45 },
  { id: "8_4B", name: "4F-夜讀區B", capacity: 35 },
  { id: "8_4C", name: "4F-夜讀區C", capacity: 55 },
  { id: "8_4D", name: "4F-夜讀區D", capacity: 50 },
  { id: "8_4E", name: "4F-夜讀區E", capacity: 65 },
  { id: "3_3A", name: "3F-單人聆賞席", capacity: 50 },
  { id: "3_3B", name: "3F-雙人聆賞席", capacity: 20 },
  { id: "2_2A", name: "2F-討論室", capacity: 8 },
  { id: "1_5A", name: "5F-研究小間A", capacity: 15 },
];

const anomalyTypes = ["busier", "quieter", "unexpected_closed", "stale"] as const;
type DemoAnomaly = (typeof anomalyTypes)[number];

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function usage(): never {
  throw new Error(
    "Usage: bun scripts/usage-demo-snapshot.ts --source gym|library --at ISO [--scenario mixed|learning|empty]",
  );
}

const source = argumentValue("--source");
const at = argumentValue("--at");
const scenario = (argumentValue("--scenario") ?? "mixed") as Scenario;
if (source !== "gym" && source !== "library") usage();
if (!at) usage();
if (!Number.isFinite(Date.parse(at))) throw new Error(`Invalid --at: ${at}`);
if (!(["mixed", "learning", "empty"] as Scenario[]).includes(scenario)) {
  throw new Error(`Invalid --scenario: ${scenario}`);
}

const kind: UsageKind = source === "gym" ? "occupancy" : "vacancy";
const now = new Date(at);
const local = taipeiSlotAt(now);
const series = source === "gym" ? GYM_SERIES : LIBRARY_SERIES;

function hash(seed: number, day: number, slot: number): number {
  let value = (seed * 2654435761 + day * 1013904223 + slot * 1664525) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 2246822519) >>> 0;
  return value >>> 0;
}

function noise(seed: number, day: number, slot: number): number {
  return (hash(seed, day, slot) % 5) - 2;
}

function gymValue(item: DemoSeries, dow: number, slot: number, seed: number, day: number): number {
  if (slot < 12 || slot > 44) return 0;
  const lunch = slot >= 22 && slot <= 27 ? 10 : 0;
  const evening = slot >= 36 && slot <= 42 ? 8 : 0;
  const weekendFactor = dow === 0 || dow === 6 ? 0.58 : 1;
  const value = (17 + (slot % 7) * 2 + lunch + evening + item.capacity * 0.04) * weekendFactor;
  return Math.max(0, Math.min(item.capacity, Math.round(value + noise(seed, day, slot))));
}

function libraryValue(item: DemoSeries, dow: number, slot: number, seed: number, day: number): number {
  if (slot < 16 || slot > 46) return item.capacity;
  const afternoon = Math.max(0, slot - 24) * 0.025;
  const evening = slot >= 36 && slot <= 43 ? 0.2 : 0;
  const weekendFactor = dow === 0 || dow === 6 ? 0.72 : 1;
  const occupiedFraction = Math.min(0.9, (0.16 + afternoon + evening) * weekendFactor);
  const occupied = Math.round(item.capacity * occupiedFraction) + noise(seed, day, slot);
  return Math.max(0, Math.min(item.capacity, item.capacity - occupied));
}

function syntheticHistory(item: DemoSeries, index: number, date: string, days: number): HistoryObservation[] {
  const history: HistoryObservation[] = [];
  for (let day = 0; day < days; day += 1) {
    const dayDate = addLocalDays(date, day);
    const dow = new Date(`${dayDate}T00:00:00Z`).getUTCDay();
    for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
      const value = kind === "occupancy"
        ? gymValue(item, dow, slot, index + 11, day)
        : libraryValue(item, dow, slot, index + 11, day);
      history.push({ date: dayDate, dow, slot, value });
    }
  }
  return history;
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function bounded(value: number, capacity: number): number {
  return Math.max(0, Math.min(capacity, value));
}

function todayValues(item: DemoSeries, index: number, profile: UsageProfile): Map<number, number> {
  const actuals = new Map<number, number>();
  for (let slot = 0; slot <= local.slot; slot += 1) {
    const baseline = profile.b[local.dow * SLOT_COUNT + slot];
    actuals.set(
      slot,
      baseline === null
        ? kind === "occupancy" ? 0 : item.capacity
        : bounded(rounded(baseline + noise(index + 37, 0, slot)), item.capacity),
    );
  }
  return actuals;
}

function anomalyValue(type: DemoAnomaly, item: DemoSeries, expected: number): number {
  if (type === "stale") return bounded(Math.round(expected), item.capacity);
  if (type === "unexpected_closed") return kind === "occupancy" ? 0 : item.capacity;
  if (type === "busier") {
    return bounded(kind === "occupancy"
      ? Math.round(expected + Math.max(20, item.capacity * 0.45))
      : Math.round(expected - Math.max(8, item.capacity * 0.45)), item.capacity);
  }
  return bounded(kind === "occupancy"
    ? Math.max(1, Math.round(expected - Math.max(28, item.capacity * 0.6)))
    : Math.min(item.capacity - 1, Math.round(expected + Math.max(8, item.capacity * 0.45))), item.capacity);
}

function forecastInput(
  item: DemoSeries,
  profile: UsageProfile,
  actuals: Map<number, number>,
  atTime: Date,
  current: number,
  state: SeriesForecastInput["state"],
  lastSuccessfulAt = atTime,
): SeriesForecastInput {
  return {
    meta: {
      source,
      seriesId: item.id,
      name: item.name,
      current,
      lastSampleAt: atTime.toISOString(),
      lastValueChangedAt: atTime.toISOString(),
      lastSuccessfulAt: lastSuccessfulAt.toISOString(),
    },
    profile,
    today: [...actuals].map(([slot, value]) => ({ slot, value })),
    state,
    now: atTime,
    local: taipeiSlotAt(atTime),
  };
}

function previousSameSlot(now: Date): Date {
  const previous = new Date(now.getTime() - 10 * 60 * 1000);
  const currentLocal = taipeiSlotAt(now);
  const previousLocal = taipeiSlotAt(previous);
  return currentLocal.date === previousLocal.date && currentLocal.slot === previousLocal.slot
    ? previous
    : now;
}

function emptyResponse(): UsageForecastResponse {
  return {
    source,
    kind,
    generatedAt: now.toISOString(),
    date: local.date,
    slotMinutes: 30,
    timezone: "Asia/Taipei",
    series: [],
  };
}

if (scenario === "empty") {
  console.log(JSON.stringify(emptyResponse(), null, 2));
  process.exit(0);
}

const historyStart = addLocalDays(local.date, -56);
const responseSeries = [];
for (const [index, item] of series.entries()) {
  const history = syntheticHistory(item, index, historyStart, scenario === "learning" ? 2 : 56);
  const profile = buildProfile(history, kind);
  const actuals = todayValues(item, index, profile);
  let current = actuals.get(local.slot) ?? (kind === "occupancy" ? 0 : item.capacity);
  let state: SeriesForecastInput["state"] = null;
  let finalLastSuccessfulAt = now;

  if (scenario === "mixed" && index < anomalyTypes.length) {
    const anomaly = anomalyTypes[index];
    const expected = profile.b[local.dow * SLOT_COUNT + local.slot] ?? current;
    current = anomalyValue(anomaly, item, expected);
    actuals.set(local.slot, current);
    const firstAt = anomaly === "unexpected_closed"
      ? new Date(now.getTime() - 61 * 60 * 1000)
      : previousSameSlot(now);
    const first = buildSeriesForecast(
      forecastInput(item, profile, actuals, firstAt, current, null),
    );
    state = first.state;
    if (anomaly === "stale") {
      finalLastSuccessfulAt = new Date(now.getTime() - 31 * 60 * 1000);
      state = buildSeriesForecast(
        forecastInput(
          item,
          profile,
          actuals,
          now,
          current,
          state,
          new Date(now.getTime() - 31 * 60 * 1000),
        ),
      ).state;
    }
  }

  const result = buildSeriesForecast(
    forecastInput(item, profile, actuals, now, current, state, finalLastSuccessfulAt),
  );
  responseSeries.push(result.series);
}

const response: UsageForecastResponse = {
  source,
  kind,
  generatedAt: now.toISOString(),
  date: local.date,
  slotMinutes: 30,
  timezone: "Asia/Taipei",
  series: responseSeries,
};
console.log(JSON.stringify(response, null, 2));
