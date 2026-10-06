import { describe, expect, it } from "bun:test";
import {
  addLocalDays,
  buildProfile,
  buildSeriesForecast,
  emptyUsageProfile,
  SLOT_COUNT,
  taipeiSlotAt,
  type HistoryObservation,
  type SeriesForecastInput,
  type UsageProfile,
} from "./model";
import type { UsageQuality } from "./types";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function dateDow(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function syntheticHistory(
  days: number,
  kind: "occupancy" | "vacancy" = "occupancy",
  noiseSeed = 7,
): HistoryObservation[] {
  const random = seeded(noiseSeed);
  const start = "2026-01-05";
  const history: HistoryObservation[] = [];
  for (let day = 0; day < days; day += 1) {
    const date = addLocalDays(start, day);
    const dow = dateDow(date);
    for (let slot = 0; slot < 48; slot += 1) {
      const inUse = slot >= 12 && slot <= 36;
      const base = kind === "occupancy"
        ? inUse ? 18 + (slot % 6) * 2 + (dow % 3) : 0
        : inUse ? 28 - (slot % 6) * 2 - (dow % 3) : 50;
      const noise = inUse ? Math.floor(random() * 3) - 1 : 0;
      history.push({ date, dow, slot, value: Math.max(0, base + noise) });
    }
  }
  return history;
}

function currentDateAtSlot(date: string, slot: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, slot * 30) - 8 * 60 * 60 * 1000);
}

function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function referenceBacktest(
  observations: HistoryObservation[],
  weeks: number,
): UsageQuality | null {
  if (weeks < 3) return null;
  const sums = new Map<string, { sum: number; n: number }>();
  for (const observation of observations) {
    const key = `${observation.date}:${observation.slot}`;
    const previous = sums.get(key) ?? { sum: 0, n: 0 };
    previous.sum += observation.value;
    previous.n += 1;
    sums.set(key, previous);
  }
  const values = new Map([...sums].map(([key, value]) => [key, value.sum / value.n]));
  const dates = [...new Set(observations.map((observation) => observation.date))].sort();
  let modelError = 0;
  let naiveError = 0;
  let samples = 0;
  for (const date of dates) {
    const dow = observations.find((observation) => observation.date === date)?.dow;
    if (dow === undefined) continue;
    for (let slot = 0; slot < 48; slot += 1) {
      const actual = values.get(`${date}:${slot}`);
      const naive = values.get(`${addLocalDays(date, -7)}:${slot}`);
      const prior = observations.filter((observation) => observation.date < date);
      const sameDow = prior
        .filter((observation) => observation.dow === dow && observation.slot === slot)
        .map((observation) => observation.value);
      const pooled = prior
        .filter(
          (observation) =>
            observation.slot === slot &&
            (observation.dow === 0 || observation.dow === 6) === (dow === 0 || dow === 6),
        )
        .map((observation) => observation.value);
      const baseline = sameDow.length >= 3
        ? sameDow.sort((a, b) => a - b)
        : pooled.length >= 3
          ? pooled.sort((a, b) => a - b)
          : [];
      if (actual === undefined || naive === undefined || baseline.length === 0) continue;
      const middle = Math.floor(baseline.length / 2);
      const expected = baseline.length % 2 === 0
        ? (baseline[middle - 1] + baseline[middle]) / 2
        : baseline[middle];
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

function readyInput(
  kind: "occupancy" | "vacancy",
  current: number,
  now = currentDateAtSlot("2026-03-02", 20),
  state: SeriesForecastInput["state"] = null,
): SeriesForecastInput {
  const profile = buildProfile(syntheticHistory(56, kind), kind);
  const local = taipeiSlotAt(now);
  const iso = now.toISOString();
  return {
    meta: {
      source: kind === "occupancy" ? "gym" : "library",
      seriesId: "series-1",
      name: "測試",
      current,
      lastSampleAt: iso,
      lastValueChangedAt: iso,
      lastSuccessfulAt: iso,
    },
    profile,
    today: [{ slot: local.slot, value: current }],
    state,
    now,
    local,
  };
}

function scheduledProfile(kind: "occupancy" | "vacancy"): UsageProfile {
  const capacity = 50;
  const profile = emptyUsageProfile(kind);
  profile.c = capacity;
  profile.l = [10, 30];
  profile.weeks = 8;
  for (let dow = 0; dow < 7; dow += 1) {
    for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
      const index = dow * SLOT_COUNT + slot;
      const open = slot >= 12 && slot < 36;
      profile.b[index] = open
        ? kind === "occupancy" ? 12 + (slot - 12) * 2 : 35 - (slot - 12)
        : kind === "occupancy" ? 0 : capacity;
      profile.s[index] = 1;
      profile.n[index] = 8;
      profile.closed[index] = open ? 0 : 1;
    }
  }
  return profile;
}

function currentDateAtMinute(date: string, minute: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, minute) - 8 * 60 * 60 * 1000);
}

function scheduledInput(
  profile: UsageProfile,
  now: Date,
  current: number,
  lastValueChangedAt: Date,
  state: SeriesForecastInput["state"] = null,
): SeriesForecastInput {
  const local = taipeiSlotAt(now);
  return {
    meta: {
      source: profile.kind === "occupancy" ? "gym" : "library",
      seriesId: "scheduled-series",
      name: "排程測試",
      current,
      lastSampleAt: now.toISOString(),
      lastValueChangedAt: lastValueChangedAt.toISOString(),
      lastSuccessfulAt: now.toISOString(),
    },
    profile,
    today: [{ slot: local.slot, value: current }],
    state,
    now,
    local,
  };
}

describe("usage model time bucketing", () => {
  it("uses fixed UTC+8 arithmetic across the Taipei and week boundaries", () => {
    const before = taipeiSlotAt(Date.UTC(2026, 0, 4, 15, 59));
    const after = taipeiSlotAt(Date.UTC(2026, 0, 4, 16, 0));
    expect(before).toEqual({ date: "2026-01-04", slot: 47, dow: 0 });
    expect(after).toEqual({ date: "2026-01-05", slot: 0, dow: 1 });
  });
});

describe("usage profile cold start and robustness", () => {
  it("does not move the seasonal median for one extreme day", () => {
    const history = syntheticHistory(56);
    const clean = buildProfile(history, "occupancy");
    const extreme = history.find((item) => item.date === "2026-02-02" && item.slot === 20);
    if (!extreme) throw new Error("synthetic extreme target missing");
    extreme.value = 999;
    const profile = buildProfile(history, "occupancy");
    expect(profile.b[1 * 48 + 20]).toBe(clean.b[1 * 48 + 20]);
  });

  it("transitions from learning to pooled fallback to ready without fabricating a forecast", () => {
    const early = buildProfile(syntheticHistory(2), "occupancy");
    expect(early.b[1 * 48 + 20]).toBeNull();
    expect(early.b[1 * 48 + 20]).toBeNull();

    const pooled = buildProfile(syntheticHistory(3), "occupancy");
    expect(pooled.b[1 * 48 + 20]).not.toBeNull();
    expect(pooled.n[1 * 48 + 20]).toBe(3);

    const input = readyInput("occupancy", 24);
    const partial = {
      ...input,
      profile: pooled,
      local: taipeiSlotAt(currentDateAtSlot("2026-01-08", 20)),
      now: currentDateAtSlot("2026-01-08", 20),
    };
    const learning = buildSeriesForecast(partial);
    expect(learning.series.status).toBe("learning");
    expect(learning.series.today).toEqual([]);
    expect(learning.series.next).toEqual([]);
    expect(learning.series.peaks).toEqual([]);
    expect(learning.series.bestTime).toBeNull();
    expect(learning.series.quality).toBeNull();
    expect(learning.series.week).toEqual([]);

    const ready = buildSeriesForecast({
      ...input,
      profile: buildProfile(syntheticHistory(14), "occupancy"),
    });
    expect(ready.series.status).toBe("ready");
    expect(ready.series.today).toHaveLength(48);
    expect(ready.series.next.length).toBeGreaterThan(0);
    expect(ready.series.week).toHaveLength(7);
    expect(ready.series.week[1]).toHaveLength(48);
    expect(ready.series.week[1][0]).toBeNull();
    expect(ready.series.today[0].expected).toBe(0);
  });

  it("scores a robust model with a level shift against same-slot-last-week", () => {
    const random = seeded(42);
    const history = syntheticHistory(56).map((item) => {
      const week = Math.floor(
        (new Date(`${item.date}T00:00:00Z`).getTime() - new Date("2026-01-05T00:00:00Z").getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      const shiftedLevel = week >= 6 ? 10 : 0;
      const oneNoisyShiftedWeek = week === 6 ? 30 : shiftedLevel;
      return {
        ...item,
        value: item.value + (item.value > 0 ? oneNoisyShiftedWeek + Math.floor(random() * 5) - 2 : 0),
      };
    });
    const profile = buildProfile(history, "occupancy");
    expect(profile.q).not.toBeNull();
    expect(profile.q?.samples).toBeGreaterThan(0);
    expect(profile.q?.skill).toBeGreaterThan(0);
  });

  it("keeps optimized backtest metrics identical to the straightforward reference", () => {
    const history = syntheticHistory(56, "occupancy", 91);
    const profile = buildProfile(history, "occupancy");
    expect(profile.q).toEqual(referenceBacktest(history, profile.weeks));
  });

  it("builds a 56-day x 48-slot profile well under the CPU budget", () => {
    const history = syntheticHistory(56, "occupancy", 1234);
    buildProfile(history, "occupancy");
    const timings: number[] = [];
    for (let run = 0; run < 7; run += 1) {
      const started = performance.now();
      buildProfile(history, "occupancy");
      timings.push(performance.now() - started);
    }
    timings.sort((a, b) => a - b);
    expect(timings[Math.floor(timings.length / 2)]).toBeLessThan(25);
  });
});

describe("usage anomalies and direction correction", () => {
  it("debounces spikes, records since, and labels occupancy dips quieter", () => {
    const now = currentDateAtSlot("2026-03-02", 20);
    const first = buildSeriesForecast(readyInput("occupancy", 45, now));
    expect(first.series.anomaly).toBeNull();
    expect(first.state.type).toBe("busier");
    const second = buildSeriesForecast(
      readyInput("occupancy", 45, new Date(now.getTime() + 10 * 60 * 1000), first.state),
    );
    expect(second.series.anomaly?.type).toBe("busier");
    expect(second.series.anomaly?.since).toBe(now.toISOString());

    const quietFirst = buildSeriesForecast(readyInput("occupancy", 5, now));
    expect(quietFirst.series.anomaly).toBeNull();
    const quietSecond = buildSeriesForecast(
      readyInput("occupancy", 5, new Date(now.getTime() + 10 * 60 * 1000), quietFirst.state),
    );
    expect(quietSecond.series.anomaly?.type).toBe("quieter");
  });

  it("keeps ordinary noise below an explicit false-positive bound", () => {
    const random = seeded(123);
    const base = readyInput("occupancy", 20);
    let falsePositives = 0;
    let samples = 0;
    for (let day = 0; day < 28; day += 1) {
      for (let reading = 0; reading < 4; reading += 1) {
        const now = new Date(base.now.getTime() + day * 24 * 60 * 60 * 1000 + reading * 10 * 60 * 1000);
        const local = taipeiSlotAt(now);
        const expected = base.profile.b[local.dow * 48 + local.slot] ?? 0;
        const value = Math.max(0, expected + Math.floor(random() * 5) - 2);
        samples += 1;
        const result = buildSeriesForecast({
          ...base,
          meta: {
            ...base.meta,
            current: value,
            lastSampleAt: now.toISOString(),
            lastValueChangedAt: now.toISOString(),
            lastSuccessfulAt: now.toISOString(),
          },
          today: [{ slot: local.slot, value }],
          now,
          local,
        });
        if (result.series.anomaly) falsePositives += 1;
      }
    }
    expect(falsePositives / samples).toBeLessThanOrEqual(0.02);
  });

  it("flags vacancy crowding when free seats dip, and stale wins precedence", () => {
    const now = currentDateAtSlot("2026-03-02", 20);
    const first = buildSeriesForecast(readyInput("vacancy", 2, now));
    expect(first.series.level).toBe("high");
    const second = buildSeriesForecast(
      readyInput("vacancy", 2, new Date(now.getTime() + 10 * 60 * 1000), first.state),
    );
    expect(second.series.anomaly?.type).toBe("busier");

    const stale = buildSeriesForecast({
      ...readyInput("occupancy", 0, now),
      meta: {
        ...readyInput("occupancy", 0, now).meta,
        lastSuccessfulAt: new Date(now.getTime() - 31 * 60 * 1000).toISOString(),
      },
    });
    expect(stale.series.anomaly?.type).toBe("stale");
  });

  it("requires an hour for unexpected closed and detects a two-hour unmoved value", () => {
    const now = currentDateAtSlot("2026-03-02", 20);
    const closedFirst = buildSeriesForecast(readyInput("occupancy", 0, now));
    expect(closedFirst.series.anomaly).toBeNull();
    const closedSecond = buildSeriesForecast(
      readyInput("occupancy", 0, new Date(now.getTime() + 61 * 60 * 1000), closedFirst.state),
    );
    expect(closedSecond.series.anomaly?.type).toBe("unexpected_closed");

    const unchanged = readyInput("occupancy", 24, now);
    unchanged.meta.lastValueChangedAt = new Date(now.getTime() - 121 * 60 * 1000).toISOString();
    const result = buildSeriesForecast(unchanged);
    expect(result.series.anomaly?.type).toBe("stale");
  });

  it("keeps a closed gym holiday as one continuous unexpected-closed run", () => {
    const profile = scheduledProfile("occupancy");
    const lastChangedAt = currentDateAtMinute("2026-03-01", 23 * 60 + 50);
    let state: SeriesForecastInput["state"] = null;
    const observations: Array<{ at: Date; anomaly: string | null; since: string | null }> = [];
    for (let minute = 0; minute < 24 * 60; minute += 10) {
      const now = currentDateAtMinute("2026-03-02", minute);
      const result = buildSeriesForecast(scheduledInput(profile, now, 0, lastChangedAt, state));
      observations.push({
        at: now,
        anomaly: result.series.anomaly?.type ?? null,
        since: result.series.anomaly?.since ?? null,
      });
      state = result.state;
    }

    const anomalous = observations.filter((item) => item.anomaly !== null);
    const runs = anomalous.filter(
      (item, index) => index === 0 || anomalous[index - 1].at.getTime() + 10 * 60 * 1000 !== item.at.getTime(),
    );
    expect(runs).toHaveLength(1);
    expect(new Set(anomalous.map((item) => item.anomaly))).toEqual(new Set(["unexpected_closed"]));
    expect(new Set(anomalous.map((item) => item.since))).toHaveLength(1);
    expect(anomalous[0].at).toEqual(currentDateAtMinute("2026-03-02", 7 * 60));
    expect(anomalous[0].since).toBe(currentDateAtMinute("2026-03-02", 6 * 60).toISOString());
    expect(anomalous.at(-1)?.at).toEqual(currentDateAtMinute("2026-03-02", 17 * 60 + 50));
    expect(observations.find((item) => item.at.getTime() === currentDateAtMinute("2026-03-02", 18 * 60).getTime())?.anomaly)
      .toBeNull();
    expect(observations.every((item) => item.anomaly !== "stale")).toBe(true);
  });

  it("keeps a genuinely stuck open sensor stale until its value changes", () => {
    const profile = scheduledProfile("occupancy");
    const freezeAt = currentDateAtMinute("2026-03-02", 10 * 60);
    const frozenValue = profile.b[1 * SLOT_COUNT + 20] ?? 0;
    let state: SeriesForecastInput["state"] = null;
    const observations: Array<{ at: Date; anomaly: string | null }> = [];
    for (let minute = 10 * 60; minute <= 14 * 60; minute += 10) {
      const now = currentDateAtMinute("2026-03-02", minute);
      const result = buildSeriesForecast(scheduledInput(profile, now, frozenValue, freezeAt, state));
      observations.push({ at: now, anomaly: result.series.anomaly?.type ?? null });
      state = result.state;
    }

    const firstStale = observations.find((item) => item.anomaly === "stale");
    expect(firstStale?.at).toEqual(currentDateAtMinute("2026-03-02", 12 * 60));
    expect(observations.filter((item) => item.at >= firstStale!.at).every((item) => item.anomaly === "stale")).toBe(true);

    const changedAt = currentDateAtMinute("2026-03-02", 14 * 60 + 10);
    const changedValue = profile.b[1 * SLOT_COUNT + 28] ?? 0;
    const cleared = buildSeriesForecast(scheduledInput(profile, changedAt, changedValue, changedAt, state));
    expect(cleared.series.anomaly).toBeNull();
    expect(cleared.state.type).toBeNull();
  });

  it("does not flag a small overnight occupancy value while the baseline is closed", () => {
    const profile = scheduledProfile("occupancy");
    const changedAt = currentDateAtMinute("2026-03-02", 0);
    let state: SeriesForecastInput["state"] = null;
    for (let minute = 0; minute < 6 * 60; minute += 10) {
      const now = currentDateAtMinute("2026-03-02", minute);
      const result = buildSeriesForecast(scheduledInput(profile, now, 1, changedAt, state));
      expect(result.series.anomaly).toBeNull();
      state = result.state;
    }
  });

  it("keeps a fully vacant library zone as one continuous unexpected-closed run", () => {
    const profile = scheduledProfile("vacancy");
    const lastChangedAt = currentDateAtMinute("2026-03-01", 23 * 60 + 50);
    let state: SeriesForecastInput["state"] = null;
    const anomalies: Array<{ at: Date; since: string }> = [];
    for (let minute = 0; minute < 24 * 60; minute += 10) {
      const now = currentDateAtMinute("2026-03-02", minute);
      const result = buildSeriesForecast(scheduledInput(profile, now, 50, lastChangedAt, state));
      if (result.series.anomaly) {
        expect(result.series.anomaly.type).toBe("unexpected_closed");
        anomalies.push({ at: now, since: result.series.anomaly.since });
      }
      state = result.state;
    }

    expect(anomalies[0]?.at).toEqual(currentDateAtMinute("2026-03-02", 7 * 60));
    expect(anomalies.at(-1)?.at).toEqual(currentDateAtMinute("2026-03-02", 17 * 60 + 50));
    expect(new Set(anomalies.map((item) => item.since))).toHaveLength(1);
  });
});
