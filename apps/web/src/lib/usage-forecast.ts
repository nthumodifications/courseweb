import { useQuery } from "@tanstack/react-query";

/**
 * Types mirror services/api/src/usage/types.ts. Keep this copy in sync with
 * the API contract; the web request intentionally does not use the generated
 * Hono client because that client may not contain this route yet.
 */

export type UsageSource = "gym" | "library";

export type UsageKind = "occupancy" | "vacancy";

export type UsageLevel = "low" | "moderate" | "high";

export type UsageTrend = "rising" | "falling" | "steady";

export type UsageAnomalyType =
  | "busier"
  | "quieter"
  | "unexpected_closed"
  | "stale";

export interface UsageSlot {
  t: string;
  expected: number | null;
  low: number | null;
  high: number | null;
  actual: number | null;
  level: UsageLevel | null;
}

export interface UsageWindow {
  start: string;
  end: string;
}

export interface UsageAnomaly {
  type: UsageAnomalyType;
  z: number;
  expected: number | null;
  actual: number;
  since: string;
}

export interface UsageQuality {
  mae: number;
  naiveMae: number;
  skill: number;
  samples: number;
}

export interface UsageSeries {
  id: string;
  name: string;
  current: number | null;
  currentAt: string | null;
  capacity: number | null;
  status: "learning" | "ready";
  weeksOfData: number;
  level: UsageLevel | null;
  trend: UsageTrend | null;
  today: UsageSlot[];
  /** Typical raw value per weekday (index 0 = Sunday), 48 half-hour slots each. */
  week: (number | null)[][];
  next: { t: string; expected: number }[];
  peaks: UsageWindow[];
  bestTime: UsageWindow | null;
  anomaly: UsageAnomaly | null;
  quality: UsageQuality | null;
}

export interface UsageForecastResponse {
  source: UsageSource;
  kind: UsageKind;
  generatedAt: string;
  date: string;
  slotMinutes: 30;
  timezone: "Asia/Taipei";
  series: UsageSeries[];
}

const FORECAST_STALE_TIME = 4 * 60 * 1000;
const FORECAST_REFETCH_INTERVAL = 5 * 60 * 1000;

export async function fetchUsageForecast(
  source: UsageSource,
  signal?: AbortSignal,
): Promise<UsageForecastResponse> {
  const apiBase = (import.meta.env.VITE_COURSEWEB_API_URL ?? "").replace(
    /\/$/,
    "",
  );
  const response = await fetch(`${apiBase}/usage/${source}/forecast`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${source} usage forecast (${response.status})`,
    );
  }

  const data = (await response.json()) as UsageForecastResponse;
  if (!data || !Array.isArray(data.series)) {
    throw new Error("Invalid usage forecast response");
  }
  return data;
}

export function useUsageForecast(source: UsageSource) {
  return useQuery<UsageForecastResponse, Error>({
    queryKey: ["usage-forecast", source],
    queryFn: ({ signal }) => fetchUsageForecast(source, signal),
    staleTime: FORECAST_STALE_TIME,
    refetchInterval: FORECAST_REFETCH_INTERVAL,
    retry: 1,
  });
}

/** Find the API series that belongs to a row already rendered by a page. */
export function getUsageSeries(
  response: UsageForecastResponse | undefined,
  id: string,
): UsageSeries | undefined {
  return response?.series.find((series) => series.id === id);
}

export type UsageForecastState = "empty" | "learning" | "ready";

export function getUsageForecastState(
  series: UsageSeries | undefined,
): UsageForecastState {
  if (!series) return "empty";
  return series.status;
}

/** Convert a raw value to a direction-corrected busyness value. */
export function toBusyness(
  value: number | null,
  kind: UsageKind,
  capacity: number | null,
): number | null {
  if (value === null) return null;
  if (kind === "vacancy") {
    return capacity === null
      ? null
      : Math.max(0, capacity - Math.max(0, value));
  }
  return Math.max(0, value);
}

export interface BusynessSlot {
  t: string;
  expected: number | null;
  low: number | null;
  high: number | null;
  actual: number | null;
}

/** Convert a slot and reverse the normal-band edges for vacancy data. */
export function toBusynessSlot(
  slot: UsageSlot,
  kind: UsageKind,
  capacity: number | null,
): BusynessSlot {
  const expected = toBusyness(slot.expected, kind, capacity);
  const actual = toBusyness(slot.actual, kind, capacity);
  const low = toBusyness(slot.low, kind, capacity);
  const high = toBusyness(slot.high, kind, capacity);

  return {
    t: slot.t,
    expected,
    low: kind === "vacancy" ? high : low,
    high: kind === "vacancy" ? low : high,
    actual,
  };
}

export function toBusynessNextPoint(
  point: { t: string; expected: number },
  kind: UsageKind,
  capacity: number | null,
): { t: string; expected: number | null } {
  return {
    t: point.t,
    expected: toBusyness(point.expected, kind, capacity),
  };
}

export function formatUsageWindow(
  window: UsageWindow | null | undefined,
): string | null {
  return window ? `${window.start}–${window.end}` : null;
}

/** Library forecasts are useful for zones, not one-seat/one-room records. */
export function pickLibraryForecastSeries(
  series: UsageSeries[],
  capacities: ReadonlyMap<string, number | null> = new Map(),
): UsageSeries[] {
  return series.filter((item) => {
    const capacity = capacities.has(item.id)
      ? capacities.get(item.id)
      : item.capacity;
    return capacity !== null && capacity !== undefined && capacity >= 10;
  });
}

export function getUsageAnomalyMessageKey(
  anomaly: UsageAnomaly | null,
): UsageAnomalyType | null {
  return anomaly?.type ?? null;
}

export type UsageVerdict =
  | "quieter"
  | "usual"
  | "busier"
  | "unexpected_closed"
  | "stale";

/** Decide how much trust to put in the live number against its normal band. */
export function getUsageVerdict(
  series: Pick<UsageSeries, "current" | "today" | "anomaly">,
  kind: UsageKind,
  capacity: number | null,
  currentTime?: string,
  liveValue: number | null = series.current,
): UsageVerdict | null {
  if (series.anomaly?.type === "unexpected_closed") return "unexpected_closed";
  if (series.anomaly?.type === "stale") return "stale";
  if (series.anomaly?.type === "busier") return "busier";
  if (series.anomaly?.type === "quieter") return "quieter";

  const current = toBusyness(liveValue, kind, capacity);
  if (current === null) return null;

  const slot = findUsageSlot(series.today, currentTime);
  if (!slot) return null;
  if (slot.level === null) return null;
  const converted = toBusynessSlot(slot, kind, capacity);
  if (converted.low === null || converted.high === null) return null;
  if (current < converted.low) return "quieter";
  if (current > converted.high) return "busier";
  return "usual";
}

export type UsageSentenceKey =
  | "busy_until"
  | "gets_busy_around"
  | "usually_quietest"
  | "forecast";

export interface UsageSentence {
  key: UsageSentenceKey;
  time?: string;
  window?: string;
  value?: number;
  unit?: "people" | "free_seats";
}

export interface UsageSentenceInput {
  currentTime: string;
  verdict: UsageVerdict | null;
  kind?: UsageKind;
  next: readonly { t: string; expected: number }[];
  peaks: readonly UsageWindow[];
  bestTime: UsageWindow | null;
}

/** Pick the one most useful next action for the compact row. */
export function pickUsageSentence(
  input: UsageSentenceInput,
): UsageSentence | null {
  if (input.verdict === "busier" || input.verdict === "quieter") {
    const currentMinutes = timeToMinutes(input.currentTime);
    const next = input.next.reduce<
      { point: { t: string; expected: number }; distance: number } | undefined
    >((closest, point) => {
      const pointMinutes = timeToMinutes(point.t);
      let distance = pointMinutes - currentMinutes;
      if (distance < 0) distance += 24 * 60;
      const candidate = { point, distance: Math.abs(distance - 60) };
      return !closest || candidate.distance < closest.distance
        ? candidate
        : closest;
    }, undefined);

    if (next) {
      return {
        key: "forecast",
        value: Math.max(0, Math.round(next.point.expected)),
        unit: input.kind === "vacancy" ? "free_seats" : "people",
      };
    }
  }

  const currentMinutes = timeToMinutes(input.currentTime);
  const activePeak = input.peaks.find((peak) => {
    const start = timeToMinutes(peak.start);
    const end = timeToMinutes(peak.end);
    return currentMinutes >= start && currentMinutes < end;
  });
  if (activePeak) {
    return {
      key: "busy_until",
      time: activePeak.end,
    };
  }

  const laterPeak = input.peaks.find(
    (peak) => timeToMinutes(peak.start) > currentMinutes,
  );
  if (laterPeak) {
    return { key: "gets_busy_around", time: laterPeak.start };
  }

  if (input.bestTime) {
    return {
      key: "usually_quietest",
      window: formatUsageWindow(input.bestTime) ?? undefined,
    };
  }

  return null;
}

/** A forecast snapshot is trusted for UI comparisons for less than 45 minutes. */
export function isUsageSnapshotFresh(generatedAt: string, now: Date): boolean {
  const generatedTime = Date.parse(generatedAt);
  const nowTime = now.getTime();
  if (!Number.isFinite(generatedTime) || !Number.isFinite(nowTime))
    return false;
  const age = nowTime - generatedTime;
  return age >= 0 && age < 45 * 60 * 1000;
}

/** Average half-hour values into hourly values, ignoring missing slots. */
export function aggregateHourlyValues(
  values: readonly (number | null)[],
  slotMinutes = 30,
): (number | null)[] {
  if (slotMinutes <= 0) return [];
  const hours = Math.ceil((values.length * slotMinutes) / 60);
  return Array.from({ length: hours }, (_, hour) => {
    const start = Math.floor((hour * 60) / slotMinutes);
    const end = Math.min(
      values.length,
      Math.ceil(((hour + 1) * 60) / slotMinutes),
    );
    const present = values
      .slice(start, end)
      .filter((value): value is number => value !== null);
    return present.length > 0
      ? present.reduce((sum, value) => sum + value, 0) / present.length
      : null;
  });
}

export interface HourValue {
  hour: number;
  value: number | null;
}

/** Remove leading/trailing hours outside the place's normal usage range. */
export function trimHoursInUse<T extends HourValue>(hours: readonly T[]): T[] {
  const first = hours.findIndex((hour) => hour.value !== null);
  if (first < 0) return [];
  let last = hours.length - 1;
  while (last >= first && hours[last].value === null) last -= 1;
  return hours.slice(first, last + 1);
}

function usageWindow(startHour: number, endHour: number): UsageWindow {
  const format = (hour: number) => `${String(hour % 24).padStart(2, "0")}:00`;
  return { start: format(startHour), end: format(endHour) };
}

export interface DerivedUsageWindows {
  peaks: UsageWindow[];
  bestTime: UsageWindow | null;
}

/** Derive peak and quiet windows from a weekday's 48 half-hour busyness values. */
export function deriveUsageWindows(
  halfHourValues: readonly (number | null)[],
): DerivedUsageWindows {
  const hourly = aggregateHourlyValues(halfHourValues).map((value, hour) => ({
    hour,
    value,
  }));
  const inUse = trimHoursInUse(hourly);
  const present = inUse.filter(
    (hour): hour is HourValue & { value: number } => hour.value !== null,
  );
  if (present.length === 0) return { peaks: [], bestTime: null };

  const max = Math.max(...present.map((hour) => hour.value));
  const peakThreshold = max * 0.75;
  const peaks: UsageWindow[] = [];
  let peakStart: number | null = null;
  let previousPeakHour: number | null = null;
  const finishPeak = () => {
    if (peakStart !== null && previousPeakHour !== null) {
      peaks.push(usageWindow(peakStart, previousPeakHour + 1));
    }
    peakStart = null;
    previousPeakHour = null;
  };

  for (const hour of inUse) {
    const isPeak = hour.value !== null && hour.value >= peakThreshold;
    const isAdjacent =
      previousPeakHour !== null && hour.hour === previousPeakHour + 1;
    if (isPeak && (peakStart === null || isAdjacent)) {
      peakStart ??= hour.hour;
      previousPeakHour = hour.hour;
    } else if (isPeak) {
      finishPeak();
      peakStart = hour.hour;
      previousPeakHour = hour.hour;
    } else {
      finishPeak();
    }
  }
  finishPeak();

  let quietest = present[0];
  for (const hour of present.slice(1)) {
    if (hour.value < quietest.value) quietest = hour;
  }

  return {
    peaks,
    bestTime: usageWindow(quietest.hour, quietest.hour + 1),
  };
}

/** A page-level notice is useful only for a non-empty all-learning response. */
export function shouldShowUsageLearningNotice(
  response: UsageForecastResponse | undefined,
): boolean {
  return Boolean(
    response &&
      response.series.length > 0 &&
      !response.series.some((series) => series.status === "ready"),
  );
}

function findUsageSlot(
  slots: readonly UsageSlot[],
  currentTime?: string,
): UsageSlot | undefined {
  if (slots.length === 0) return undefined;
  if (!currentTime) {
    return (
      [...slots].reverse().find((slot) => slot.actual !== null) ?? slots[0]
    );
  }

  const target = timeToMinutes(currentTime);
  const candidates = slots
    .filter((slot) => timeToMinutes(slot.t) <= target)
    .sort((a, b) => timeToMinutes(b.t) - timeToMinutes(a.t));
  return candidates[0] ?? slots[0];
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (
    (Number.isFinite(hours) ? hours : 0) * 60 +
    (Number.isFinite(minutes) ? minutes : 0)
  );
}
