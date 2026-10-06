/**
 * Wire contract for GET /usage/:source/forecast.
 *
 * This file is the single source of truth for the response shape. The web app
 * keeps a types-only copy in apps/web/src/lib/usage-forecast.ts; change both
 * together.
 */

export type UsageSource = "gym" | "library";

/**
 * What a series' numbers count.
 * - "occupancy": people currently inside. Higher = busier. (PEO venues)
 * - "vacancy": free seats / rooms. Lower = busier. (library zones)
 */
export type UsageKind = "occupancy" | "vacancy";

/** Busyness, already direction-corrected: "high" always means crowded. */
export type UsageLevel = "low" | "moderate" | "high";

export type UsageTrend = "rising" | "falling" | "steady";

export type UsageAnomalyType =
  /** Significantly more crowded than this weekday/time normally is. */
  | "busier"
  /** Significantly emptier than this weekday/time normally is. */
  | "quieter"
  /** Reads empty/closed at a time it is normally in use (holiday, closure). */
  | "unexpected_closed"
  /** The upstream value has not moved for long enough to distrust it. */
  | "stale";

export interface UsageSlot {
  /** Slot start, Asia/Taipei wall clock, "HH:MM". 48 slots: 00:00 … 23:30. */
  t: string;
  /** Typical raw value for this weekday + slot. null while still learning. */
  expected: number | null;
  /** Lower / upper edge of the normal band, in raw value units. */
  low: number | null;
  high: number | null;
  /** Mean of today's samples in this slot. null if not observed (yet). */
  actual: number | null;
  /** Busyness of `expected`, direction-corrected. */
  level: UsageLevel | null;
}

export interface UsageWindow {
  /** "HH:MM" Asia/Taipei, start inclusive, end exclusive. */
  start: string;
  end: string;
}

export interface UsageAnomaly {
  type: UsageAnomalyType;
  /** Robust z-score of the raw value against the slot baseline. 0 for stale. */
  z: number;
  expected: number | null;
  actual: number;
  /** ISO timestamp of the first sample of the current anomalous run. */
  since: string;
}

export interface UsageQuality {
  /** Backtest mean absolute error of this model, raw value units. */
  mae: number;
  /** Same backtest for "same slot last week" (seasonal naive). */
  naiveMae: number;
  /** 1 - mae / naiveMae. Above 0 means the model beats seasonal naive. */
  skill: number;
  /** Slot observations scored. */
  samples: number;
}

export interface UsageSeries {
  /** Stable id: PEO project_id, or library zoneid. */
  id: string;
  /** Upstream display name (zh). Clients map/translate as they already do. */
  name: string;
  /** Latest raw sample. null if the collector has never seen this series. */
  current: number | null;
  /** ISO timestamp of the latest sample. */
  currentAt: string | null;
  /** Observed ceiling of the raw value; null until enough history. */
  capacity: number | null;
  /** "learning" until there is enough history to forecast honestly. */
  status: "learning" | "ready";
  /** Distinct ISO weeks with data for this series. */
  weeksOfData: number;
  /** Busyness right now, direction-corrected. */
  level: UsageLevel | null;
  trend: UsageTrend | null;
  /** Today, all 48 slots. Empty array while learning. */
  today: UsageSlot[];
  /**
   * Typical raw value per weekday (index 0 = Sunday), 48 half-hour slots
   * each. Slots where the place is normally closed/unused are null.
   * Empty array while learning.
   */
  week: (number | null)[][];
  /**
   * Short-horizon forecast for the upcoming slots (up to 6 = 3 hours), raw
   * value units, adjusted for how today is running against the baseline.
   */
  next: { t: string; expected: number }[];
  /** Busiest windows remaining today. */
  peaks: UsageWindow[];
  /** Quietest window of at least one hour remaining today. */
  bestTime: UsageWindow | null;
  anomaly: UsageAnomaly | null;
  quality: UsageQuality | null;
}

export interface UsageForecastResponse {
  source: UsageSource;
  kind: UsageKind;
  /** ISO timestamp the snapshot was computed. */
  generatedAt: string;
  /** Local date the `today` arrays describe, "YYYY-MM-DD" Asia/Taipei. */
  date: string;
  slotMinutes: 30;
  timezone: "Asia/Taipei";
  series: UsageSeries[];
}
