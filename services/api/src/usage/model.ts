import type {
  UsageAnomaly,
  UsageAnomalyType,
  UsageLevel,
  UsageQuality,
  UsageSeries,
  UsageSource,
  UsageTrend,
} from "./types";
import type { UsageKind } from "./types";

export const SLOT_MINUTES = 30;
export const SLOT_COUNT = 48;
export const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOT_MS = 30 * 60 * 1000;

export interface TaipeiSlot {
  date: string;
  slot: number;
  dow: number;
}

export interface HistoryObservation {
  date: string;
  dow: number;
  slot: number;
  value: number;
}

export interface UsageProfile {
  v: 1;
  kind: UsageKind;
  /** 7 * 48 arrays, rounded to one decimal when persisted. */
  b: Array<number | null>;
  s: Array<number | null>;
  n: number[];
  c: number | null;
  /** Busyness terciles, direction-corrected. */
  l: [number, number] | null;
  /** 1 means a closed-state baseline. */
  closed: number[];
  weeks: number;
  q: UsageQuality | null;
}

export interface ForecastMeta {
  source: UsageSource;
  seriesId: string;
  name: string;
  current: number | null;
  lastSampleAt: string | null;
  lastValueChangedAt: string | null;
  lastSuccessfulAt: string | null;
}

export interface TodayObservation {
  slot: number;
  value: number;
}

export interface StoredAnomalyState {
  type: UsageAnomalyType | null;
  since: string | null;
  samples: number;
  lastObservedAt: string | null;
}

export interface SeriesForecastInput {
  meta: ForecastMeta;
  profile: UsageProfile;
  today: TodayObservation[];
  state: StoredAnomalyState | null;
  now: Date;
  local: TaipeiSlot;
}

export interface SeriesForecastResult {
  series: UsageSeries;
  state: StoredAnomalyState;
}

function localDayNumber(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return Number.NaN;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

export function addLocalDays(date: string, days: number): string {
  const day = localDayNumber(date);
  if (!Number.isFinite(day)) return date;
  return new Date((day + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Convert a UTC instant to an Asia/Taipei slot by fixed UTC+8 arithmetic. */
export function taipeiSlotAt(input: Date | number): TaipeiSlot {
  const timestamp = input instanceof Date ? input.getTime() : input;
  const shifted = timestamp + TAIPEI_OFFSET_MS;
  const day = Math.floor(shifted / DAY_MS);
  const inDay = shifted - day * DAY_MS;
  return {
    date: new Date(day * DAY_MS).toISOString().slice(0, 10),
    slot: Math.min(SLOT_COUNT - 1, Math.floor(inDay / SLOT_MS)),
    dow: new Date(day * DAY_MS).getUTCDay(),
  };
}

export function dayType(dow: number): "weekday" | "weekend" {
  return dow === 0 || dow === 6 ? "weekend" : "weekday";
}

function profileIndex(dow: number, slot: number): number {
  return dow * SLOT_COUNT + slot;
}

function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function quantile(values: number[], probability: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function mad(values: number[], center: number): number {
  return median(values.map((value) => Math.abs(value - center))) ?? 0;
}

function isoWeekKey(date: string): string {
  const day = localDayNumber(date);
  if (!Number.isFinite(day)) return date;
  const weekday = new Date(day * DAY_MS).getUTCDay() || 7;
  const thursday = day + (4 - weekday);
  const year = new Date(thursday * DAY_MS).getUTCFullYear();
  const firstThursday = Math.floor(Date.UTC(year, 0, 4) / DAY_MS);
  const firstWeekday = new Date(firstThursday * DAY_MS).getUTCDay() || 7;
  const firstWeek = firstThursday + (4 - firstWeekday);
  return `${year}-${String(1 + Math.floor((thursday - firstWeek) / 7)).padStart(2, "0")}`;
}

function dateValueMap(observations: HistoryObservation[]): Map<string, number> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const observation of observations) {
    const key = `${observation.date}:${observation.slot}`;
    const previous = sums.get(key) ?? { sum: 0, n: 0 };
    previous.sum += observation.value;
    previous.n += 1;
    sums.set(key, previous);
  }
  return new Map([...sums].map(([key, value]) => [key, value.sum / value.n]));
}

interface IndexedObservation {
  date: string;
  value: number;
}

function appendIndexed(
  index: Map<string, IndexedObservation[]>,
  key: string,
  observation: IndexedObservation,
): void {
  const values = index.get(key);
  if (values) values.push(observation);
  else index.set(key, [observation]);
}

function backtest(
  observations: HistoryObservation[],
  weeks: number,
): UsageQuality | null {
  if (weeks < 3) return null;
  const values = dateValueMap(observations);
  const dates = [...new Set(observations.map((observation) => observation.date))].sort();
  const dateDows = new Map<string, number>();
  const byDowSlot = new Map<string, IndexedObservation[]>();
  const byTypeSlot = new Map<string, IndexedObservation[]>();
  for (const observation of observations) {
    if (!dateDows.has(observation.date)) dateDows.set(observation.date, observation.dow);
    const indexed = { date: observation.date, value: observation.value };
    appendIndexed(byDowSlot, `${observation.dow}:${observation.slot}`, indexed);
    appendIndexed(byTypeSlot, `${dayType(observation.dow)}:${observation.slot}`, indexed);
  }
  for (const list of byDowSlot.values()) list.sort((a, b) => a.date.localeCompare(b.date));
  for (const list of byTypeSlot.values()) list.sort((a, b) => a.date.localeCompare(b.date));

  const priorByDowSlot = new Map<string, number[]>();
  const priorByTypeSlot = new Map<string, number[]>();
  const dowCursors = new Map<string, number>();
  const typeCursors = new Map<string, number>();
  let modelError = 0;
  let naiveError = 0;
  let samples = 0;

  for (const date of dates) {
    for (const [key, list] of byDowSlot) {
      let cursor = dowCursors.get(key) ?? 0;
      const prior = priorByDowSlot.get(key) ?? [];
      while (cursor < list.length && list[cursor].date < date) {
        prior.push(list[cursor].value);
        cursor += 1;
      }
      dowCursors.set(key, cursor);
      if (prior.length > 0) priorByDowSlot.set(key, prior);
    }
    for (const [key, list] of byTypeSlot) {
      let cursor = typeCursors.get(key) ?? 0;
      const prior = priorByTypeSlot.get(key) ?? [];
      while (cursor < list.length && list[cursor].date < date) {
        prior.push(list[cursor].value);
        cursor += 1;
      }
      typeCursors.set(key, cursor);
      if (prior.length > 0) priorByTypeSlot.set(key, prior);
    }

    const dow = dateDows.get(date);
    if (dow === undefined) continue;
    const lastWeek = addLocalDays(date, -7);
    for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
      const actual = values.get(`${date}:${slot}`);
      const naive = values.get(`${lastWeek}:${slot}`);
      const exact = priorByDowSlot.get(`${dow}:${slot}`) ?? [];
      const pooled = priorByTypeSlot.get(`${dayType(dow)}:${slot}`) ?? [];
      const expected = exact.length >= 3
        ? median(exact)
        : pooled.length >= 3
          ? median(pooled)
          : null;
      if (actual === undefined || naive === undefined || expected === null) continue;
      modelError += Math.abs(actual - expected);
      naiveError += Math.abs(actual - naive);
      samples += 1;
    }
  }
  if (samples === 0) return null;
  const mae = modelError / samples;
  const naiveMae = naiveError / samples;
  return {
    mae: round1(mae),
    naiveMae: round1(naiveMae),
    skill: round1(naiveMae > 0 ? 1 - mae / naiveMae : 0),
    samples,
  };
}

export function emptyUsageProfile(kind: UsageKind): UsageProfile {
  return {
    v: 1,
    kind,
    b: Array(SLOT_COUNT * 7).fill(null),
    s: Array(SLOT_COUNT * 7).fill(null),
    n: Array(SLOT_COUNT * 7).fill(0),
    c: null,
    l: null,
    closed: Array(SLOT_COUNT * 7).fill(1),
    weeks: 0,
    q: null,
  };
}

function openScore(kind: UsageKind, value: number, capacity: number | null): number {
  return kind === "occupancy" ? value : (capacity ?? 0) - value;
}

function isClosedBaseline(
  kind: UsageKind,
  value: number,
  capacity: number | null,
): boolean {
  if (kind === "occupancy") return value <= 0.5;
  const ceiling = capacity ?? value;
  return value >= ceiling - Math.max(1, ceiling * 0.05);
}

function buildLevels(
  kind: UsageKind,
  baseline: Array<number | null>,
  capacity: number | null,
): { thresholds: [number, number] | null; closed: number[] } {
  const closed = baseline.map((value) =>
    value === null || isClosedBaseline(kind, value, capacity) ? 1 : 0,
  );
  const scores = baseline.flatMap((value, index) =>
    value !== null && closed[index] === 0 ? [openScore(kind, value, capacity)] : [],
  );
  if (scores.length === 0) return { thresholds: null, closed };
  return {
    thresholds: [quantile(scores, 1 / 3) ?? 0, quantile(scores, 2 / 3) ?? 0],
    closed,
  };
}

export function buildProfile(
  observations: HistoryObservation[],
  kind: UsageKind,
): UsageProfile {
  const valid = observations.filter(
    (observation) =>
      Number.isFinite(observation.value) &&
      observation.slot >= 0 &&
      observation.slot < SLOT_COUNT &&
      observation.dow >= 0 &&
      observation.dow < 7,
  );
  const latestDay = Math.max(...valid.map((observation) => localDayNumber(observation.date)));
  const recent = Number.isFinite(latestDay)
    ? valid.filter((observation) => localDayNumber(observation.date) >= latestDay - 55)
    : valid;
  const byDowSlot: number[][] = Array.from({ length: SLOT_COUNT * 7 }, () => []);
  const byTypeSlot: number[][] = Array.from({ length: SLOT_COUNT * 2 }, () => []);
  const rawValues = recent.map((observation) => observation.value);
  const days = new Set(recent.map((observation) => observation.date));
  const weeks = new Set(recent.map((observation) => isoWeekKey(observation.date))).size;

  for (const observation of recent) {
    byDowSlot[profileIndex(observation.dow, observation.slot)].push(observation.value);
    const typeOffset = dayType(observation.dow) === "weekend" ? SLOT_COUNT : 0;
    byTypeSlot[typeOffset + observation.slot].push(observation.value);
  }

  const provisionalCapacity = quantile(rawValues, 0.99);
  const baseline: Array<number | null> = Array(SLOT_COUNT * 7).fill(null);
  const spread: Array<number | null> = Array(SLOT_COUNT * 7).fill(null);
  const counts = Array(SLOT_COUNT * 7).fill(0);
  for (let dow = 0; dow < 7; dow += 1) {
    for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
      const exact = byDowSlot[profileIndex(dow, slot)];
      const typeOffset = dayType(dow) === "weekend" ? SLOT_COUNT : 0;
      const pooled = byTypeSlot[typeOffset + slot];
      const values = exact.length >= 3 ? exact : pooled.length >= 3 ? pooled : [];
      const center = median(values);
      if (center === null) continue;
      const index = profileIndex(dow, slot);
      baseline[index] = round1(center);
      counts[index] = values.length;
      spread[index] = round1(
        Math.max(1.4826 * mad(values, center), Math.sqrt(Math.max(center, 1)), 1),
      );
    }
  }

  const weekdayCovered = Array.from({ length: SLOT_COUNT }, (_, slot) =>
    byTypeSlot[slot].length >= 3,
  ).every(Boolean);
  const weekendCovered = Array.from({ length: SLOT_COUNT }, (_, slot) =>
    byTypeSlot[SLOT_COUNT + slot].length >= 3,
  ).every(Boolean);
  const ready = days.size >= 7 && weekdayCovered && weekendCovered;
  const capacity = ready && provisionalCapacity !== null ? round1(provisionalCapacity) : null;
  const levels = buildLevels(kind, baseline, capacity ?? provisionalCapacity);
  const quality = ready ? backtest(recent, weeks) : null;

  return {
    v: 1,
    kind,
    b: baseline,
    s: spread,
    n: counts,
    c: capacity,
    l: levels.thresholds
      ? [round1(levels.thresholds[0]), round1(levels.thresholds[1])]
      : null,
    closed: levels.closed,
    weeks,
    q: quality,
  };
}

function formatSlot(slot: number): string {
  if (slot === SLOT_COUNT) return "24:00";
  const minutes = (slot % SLOT_COUNT) * SLOT_MINUTES;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function baselineAt(profile: UsageProfile, dow: number, slot: number): number | null {
  return profile.b[profileIndex(dow, slot)] ?? null;
}

function spreadAt(profile: UsageProfile, dow: number, slot: number): number | null {
  return profile.s[profileIndex(dow, slot)] ?? null;
}

function closedAt(profile: UsageProfile, dow: number, slot: number): boolean {
  return profile.closed[profileIndex(dow, slot)] === 1;
}

function typicalWeek(profile: UsageProfile, ready: boolean): (number | null)[][] {
  if (!ready) return [];
  return Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: SLOT_COUNT }, (_, slot) => {
      const index = profileIndex(dow, slot);
      return profile.closed[index] === 1 ? null : profile.b[index] ?? null;
    }),
  );
}

function levelForValue(
  profile: UsageProfile,
  kind: UsageKind,
  value: number,
  dow: number,
  slot: number,
): UsageLevel | null {
  const expected = baselineAt(profile, dow, slot);
  if (expected === null || closedAt(profile, dow, slot)) return null;
  const score = openScore(kind, value, profile.c);
  const thresholds = profile.l;
  if (!thresholds) return "moderate";
  if (score < thresholds[0]) return "low";
  if (score >= thresholds[1]) return "high";
  return "moderate";
}

function busyness(
  profile: UsageProfile,
  kind: UsageKind,
  value: number | null,
): number | null {
  return value === null ? null : openScore(kind, value, profile.c);
}

function materialBaselineMoveOverWindow(
  profile: UsageProfile,
  dow: number,
  startSlot: number,
  endSlot: number,
): boolean {
  const threshold = Math.max(1, (profile.c ?? 0) * 0.05);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let slot = startSlot; slot <= endSlot; slot += 1) {
    const value = baselineAt(profile, dow, slot);
    if (value === null) continue;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return Number.isFinite(minimum) && maximum - minimum >= threshold;
}

function closedValue(kind: UsageKind, value: number, capacity: number | null): boolean {
  return kind === "occupancy"
    ? value <= 0.5
    : value >= (capacity ?? value) - Math.max(1, (capacity ?? value) * 0.05);
}

interface AnomalyCandidate {
  type: UsageAnomalyType;
  z: number;
  since: string;
  immediate: boolean;
}

function anomalyDecision(
  input: SeriesForecastInput,
  currentValue: number | null,
  expected: number | null,
  spread: number | null,
  state: StoredAnomalyState | null,
): { anomaly: UsageAnomaly | null; state: StoredAnomalyState } {
  const nowMs = input.now.getTime();
  const nowIso = input.now.toISOString();
  if (currentValue === null) {
    return {
      anomaly: null,
      state: { type: null, since: null, samples: 0, lastObservedAt: null },
    };
  }

  const lastSuccess = input.meta.lastSuccessfulAt
    ? Date.parse(input.meta.lastSuccessfulAt)
    : Number.NaN;
  const lastChanged = input.meta.lastValueChangedAt
    ? Date.parse(input.meta.lastValueChangedAt)
    : Number.NaN;
  const noSampleSince = Number.isFinite(lastSuccess) && lastSuccess + 30 * 60 * 1000 <= nowMs
    ? new Date(lastSuccess + 30 * 60 * 1000).toISOString()
    : null;
  const lastChangedLocal = Number.isFinite(lastChanged) ? taipeiSlotAt(lastChanged) : null;
  const unchangedStartSlot = lastChangedLocal?.date === input.local.date &&
      lastChangedLocal.slot <= input.local.slot
    ? lastChangedLocal.slot
    : 0;
  const noChangeSince =
    Number.isFinite(lastChanged) &&
    lastChanged + 2 * 60 * 60 * 1000 <= nowMs &&
    !closedValue(input.profile.kind, currentValue, input.profile.c) &&
    materialBaselineMoveOverWindow(
      input.profile,
      input.local.dow,
      unchangedStartSlot,
      input.local.slot,
    )
      ? new Date(lastChanged + 2 * 60 * 60 * 1000).toISOString()
      : null;

  let candidate: AnomalyCandidate | null = null;
  if (noSampleSince || noChangeSince) {
    candidate = {
      type: "stale",
      z: 0,
      since: noSampleSince && noChangeSince
        ? new Date(Math.min(Date.parse(noSampleSince), Date.parse(noChangeSince))).toISOString()
        : (noSampleSince ?? noChangeSince)!,
      immediate: true,
    };
  } else if (
    expected !== null &&
    closedValue(input.profile.kind, currentValue, input.profile.c) &&
    !closedAt(input.profile, input.local.dow, input.local.slot)
  ) {
    candidate = {
      type: "unexpected_closed",
      z: spread && spread > 0 ? (currentValue - expected) / spread : 0,
      since: nowIso,
      immediate: false,
    };
  } else if (expected !== null && spread !== null && spread > 0) {
    const z = (currentValue - expected) / spread;
    const gap = Math.abs(currentValue - expected);
    const material = gap >= Math.max(5, (input.profile.c ?? 0) * 0.15);
    if (Math.abs(z) >= 3.5 && material) {
      const busier = input.profile.kind === "occupancy" ? z >= 0 : z < 0;
      candidate = {
        type: busier ? "busier" : "quieter",
        z,
        since: nowIso,
        immediate: false,
      };
    }
  }

  if (!candidate) {
    return {
      anomaly: null,
      state: { type: null, since: null, samples: 0, lastObservedAt: nowIso },
    };
  }

  const sameRun = state?.type === candidate.type && state.since;
  const nextState: StoredAnomalyState = {
    type: candidate.type,
    since: sameRun ? state!.since : candidate.since,
    samples: sameRun ? state!.samples + 1 : 1,
    lastObservedAt: nowIso,
  };
  const ageMs = nowMs - Date.parse(nextState.since!);
  const active = candidate.immediate ||
    (candidate.type === "unexpected_closed" ? ageMs >= 60 * 60 * 1000 : nextState.samples >= 2);
  if (!active) return { anomaly: null, state: nextState };
  return {
    anomaly: {
      type: candidate.type,
      z: round1(candidate.z),
      expected: expected === null ? null : round1(expected),
      actual: round1(currentValue),
      since: nextState.since!,
    },
    state: nextState,
  };
}

function sameState(a: StoredAnomalyState | null, b: StoredAnomalyState): boolean {
  return Boolean(
    a &&
      a.type === b.type &&
      a.since === b.since &&
      a.samples === b.samples &&
      a.lastObservedAt === b.lastObservedAt,
  );
}

export function buildSeriesForecast(input: SeriesForecastInput): SeriesForecastResult {
  const { profile, local, meta } = input;
  const actuals = new Map(input.today.map((item) => [item.slot, item.value]));
  const currentValue = meta.current ?? actuals.get(local.slot) ?? null;
  const currentIndex = profileIndex(local.dow, local.slot);
  const expectedCurrent = profile.b[currentIndex] ?? null;
  const ready = profile.c !== null && profile.b.every((value) => value !== null);
  const emptySeries: UsageSeries = {
    id: meta.seriesId,
    name: meta.name,
    current: currentValue === null ? null : round1(currentValue),
    currentAt: meta.lastSampleAt,
    capacity: profile.c,
    status: ready ? "ready" : "learning",
    weeksOfData: profile.weeks,
    level: null,
    trend: null,
    today: [],
    next: [],
    peaks: [],
    bestTime: null,
    anomaly: null,
    quality: ready ? profile.q : null,
    week: typicalWeek(profile, ready),
  };
  if (!ready) {
    return {
      series: emptySeries,
      state: { type: null, since: null, samples: 0, lastObservedAt: null },
    };
  }

  const today = Array.from({ length: SLOT_COUNT }, (_, slot) => {
    const expected = baselineAt(profile, local.dow, slot);
    const spread = spreadAt(profile, local.dow, slot);
    const actual = actuals.get(slot) ?? null;
    return {
      t: formatSlot(slot),
      expected,
      low: expected === null || spread === null ? null : round1(Math.max(0, expected - 2 * spread)),
      high:
        expected === null || spread === null
          ? null
          : round1(Math.min(profile.c ?? Number.POSITIVE_INFINITY, expected + 2 * spread)),
      actual: actual === null ? null : round1(actual),
      level: expected === null ? null : levelForValue(profile, profile.kind, expected, local.dow, slot),
    };
  });

  const nonZeroBaselines = profile.b.filter((value): value is number => value !== null && value > 0);
  const k = 2 * (median(nonZeroBaselines) ?? 1);
  let actualSum = 0;
  let baselineSum = 0;
  for (let slot = Math.max(0, local.slot - 2); slot <= local.slot; slot += 1) {
    const baseline = baselineAt(profile, local.dow, slot);
    const actual = actuals.get(slot) ?? (slot === local.slot ? currentValue : null);
    if (baseline !== null && actual !== null) {
      baselineSum += baseline;
      actualSum += actual;
    }
  }
  const ratio = baselineSum > 0 ? Math.min(3, Math.max(0.33, (actualSum + k) / (baselineSum + k))) : 1;
  const next: { t: string; expected: number }[] = [];
  for (let h = 1; h <= 6; h += 1) {
    const absoluteSlot = local.slot + h;
    const slot = absoluteSlot % SLOT_COUNT;
    const dow = (local.dow + Math.floor(absoluteSlot / SLOT_COUNT)) % 7;
    const baseline = baselineAt(profile, dow, slot);
    if (baseline === null) continue;
    const forecast = baseline * (1 + (ratio - 1) * Math.pow(0.85, h));
    next.push({
      t: formatSlot(slot),
      expected: round1(Math.max(0, Math.min(profile.c ?? Number.POSITIVE_INFINITY, forecast))),
    });
  }

  const first = next[0] ? busyness(profile, profile.kind, next[0].expected) : null;
  const second = next[1] ? busyness(profile, profile.kind, next[1].expected) : null;
  const deadBand = Math.max(1, (profile.c ?? 0) * 0.05);
  let trend: UsageTrend = "steady";
  if (first !== null && second !== null) {
    if (second - first > deadBand) trend = "rising";
    else if (first - second > deadBand) trend = "falling";
  }

  const remaining = Array.from({ length: SLOT_COUNT - local.slot }, (_, offset) => local.slot + offset)
    .filter((slot) => !closedAt(profile, local.dow, slot) && baselineAt(profile, local.dow, slot) !== null);
  const remainingScores = remaining.map((slot) => ({
    slot,
    score: busyness(profile, profile.kind, baselineAt(profile, local.dow, slot)) ?? 0,
  }));
  const peak = Math.max(...remainingScores.map((item) => item.score), 0);
  const peakSlots = remainingScores.filter((item) => item.score >= peak * 0.75 && peak > 0).map((item) => item.slot);
  const peakRuns: number[][] = [];
  for (const slot of peakSlots) {
    const previous = peakRuns[peakRuns.length - 1];
    if (previous && previous[previous.length - 1] === slot - 1) previous.push(slot);
    else peakRuns.push([slot]);
  }
  const peaks = peakRuns.slice(0, 3).map((run) => ({
    start: formatSlot(run[0]),
    end: formatSlot(Math.min(SLOT_COUNT, run[run.length - 1] + 1)),
  }));

  let bestTime: { start: string; end: string } | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let start = local.slot; start < SLOT_COUNT - 1; start += 1) {
    const firstBaseline = baselineAt(profile, local.dow, start);
    const secondBaseline = baselineAt(profile, local.dow, start + 1);
    if (
      firstBaseline === null ||
      secondBaseline === null ||
      closedAt(profile, local.dow, start) ||
      closedAt(profile, local.dow, start + 1)
    ) continue;
    const score =
      ((busyness(profile, profile.kind, firstBaseline) ?? 0) +
        (busyness(profile, profile.kind, secondBaseline) ?? 0)) /
      2;
    if (score < bestScore) {
      bestScore = score;
      bestTime = { start: formatSlot(start), end: formatSlot(start + 2) };
    }
  }

  const decision = anomalyDecision(
    input,
    currentValue,
    expectedCurrent,
    spreadAt(profile, local.dow, local.slot),
    input.state,
  );
  return {
    series: {
      ...emptySeries,
      level:
        currentValue === null
          ? null
          : levelForValue(profile, profile.kind, currentValue, local.dow, local.slot),
      trend,
      today,
      next,
      peaks,
      bestTime,
      anomaly: decision.anomaly,
    },
    state: sameState(input.state, decision.state) ? input.state! : decision.state,
  };
}
