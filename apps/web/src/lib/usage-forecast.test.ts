import { describe, expect, test } from "bun:test";
import {
  aggregateHourlyValues,
  deriveUsageWindows,
  formatUsageWindow,
  getUsageAnomalyMessageKey,
  getUsageForecastState,
  getUsageSeries,
  getUsageVerdict,
  isUsageSnapshotFresh,
  pickLibraryForecastSeries,
  pickUsageSentence,
  shouldShowUsageLearningNotice,
  toBusyness,
  toBusynessSlot,
  trimHoursInUse,
  type UsageForecastResponse,
  type UsageSeries,
} from "./usage-forecast";

const readyOccupancy: UsageSeries = {
  id: "gym-1",
  name: "游泳池",
  current: 24,
  currentAt: "2026-10-06T10:00:00Z",
  capacity: 120,
  status: "ready",
  weeksOfData: 8,
  level: "moderate",
  trend: "rising",
  today: [
    {
      t: "10:00",
      expected: 20,
      low: 10,
      high: 35,
      actual: 24,
      level: "moderate",
    },
  ],
  week: Array.from({ length: 7 }, () => Array<number | null>(48).fill(null)),
  next: [{ t: "10:30", expected: 28 }],
  peaks: [{ start: "18:00", end: "20:00" }],
  bestTime: { start: "14:00", end: "15:30" },
  anomaly: null,
  quality: { mae: 3.4, naiveMae: 5.2, skill: 0.35, samples: 120 },
};

const readyVacancy: UsageSeries = {
  ...readyOccupancy,
  id: "zone-1",
  name: "4F-夜讀區A",
  current: 30,
  capacity: 45,
  level: "high",
  trend: "falling",
  today: [
    {
      t: "10:00",
      expected: 35,
      low: 25,
      high: 42,
      actual: 30,
      level: "high",
    },
  ],
  next: [{ t: "10:30", expected: 28 }],
};

const learningSeries: UsageSeries = {
  ...readyOccupancy,
  id: "gym-learning",
  status: "learning",
  weeksOfData: 2,
  today: [],
  week: [],
  next: [],
  peaks: [],
  bestTime: null,
  quality: null,
};

const anomalySeries = ["busier", "quieter", "unexpected_closed", "stale"].map(
  (type) => ({
    ...readyOccupancy,
    id: `gym-${type}`,
    anomaly: {
      type: type as "busier" | "quieter" | "unexpected_closed" | "stale",
      z: 3,
      expected: 10,
      actual: 24,
      since: "2026-10-06T09:00:00Z",
    },
  }),
);

const emptyResponse: UsageForecastResponse = {
  source: "gym",
  kind: "occupancy",
  generatedAt: "2026-10-06T10:00:00Z",
  date: "2026-10-06",
  slotMinutes: 30,
  timezone: "Asia/Taipei",
  series: [],
};

describe("usage forecast helpers", () => {
  test("joins a forecast series to a page row by stable id", () => {
    const response = { ...emptyResponse, series: [readyOccupancy] };
    expect(getUsageSeries(response, "gym-1")).toBe(readyOccupancy);
    expect(getUsageSeries(response, "missing")).toBeUndefined();
    expect(getUsageSeries(emptyResponse, "gym-1")).toBeUndefined();
  });

  test("converts vacancy into direction-corrected busyness", () => {
    expect(toBusyness(30, "vacancy", 45)).toBe(15);
    expect(toBusyness(24, "occupancy", 120)).toBe(24);
    expect(toBusyness(-4, "occupancy", 120)).toBe(0);
    expect(toBusyness(null, "vacancy", 45)).toBeNull();
    expect(toBusyness(30, "vacancy", null)).toBeNull();

    const converted = toBusynessSlot(readyVacancy.today[0], "vacancy", 45);
    expect(converted).toEqual({
      t: "10:00",
      expected: 10,
      low: 3,
      high: 20,
      actual: 15,
    });
  });

  test("formats forecast windows for compact guidance", () => {
    expect(formatUsageWindow({ start: "18:00", end: "20:00" })).toBe(
      "18:00–20:00",
    );
    expect(formatUsageWindow(null)).toBeNull();
  });

  test("keeps meaningful library zones and excludes small rooms", () => {
    const capacities = new Map<string, number | null>([
      ["zone-1", 45],
      ["small-room", 8],
      ["unknown", null],
    ]);
    const selected = pickLibraryForecastSeries(
      [
        readyVacancy,
        { ...readyVacancy, id: "small-room" },
        { ...readyVacancy, id: "unknown" },
      ],
      capacities,
    );
    expect(selected.map((series) => series.id)).toEqual(["zone-1"]);
    expect(
      pickLibraryForecastSeries(
        [{ ...readyVacancy, id: "api-capacity" }],
        new Map(),
      ),
    ).toEqual([{ ...readyVacancy, id: "api-capacity" }]);
  });

  test("handles learning and empty responses without inventing data", () => {
    expect(getUsageForecastState(undefined)).toBe("empty");
    expect(getUsageForecastState(learningSeries)).toBe("learning");
    expect(learningSeries.today).toEqual([]);
    expect(getUsageForecastState(readyOccupancy)).toBe("ready");
  });

  test("keeps every anomaly type information-mapped", () => {
    expect(
      anomalySeries.map((series) => getUsageAnomalyMessageKey(series.anomaly)),
    ).toEqual(["busier", "quieter", "unexpected_closed", "stale"]);
    expect(getUsageAnomalyMessageKey(null)).toBeNull();
  });

  test("compares the live value with the current normal band", () => {
    expect(getUsageVerdict(readyOccupancy, "occupancy", 120, "10:00")).toBe(
      "usual",
    );
    expect(
      getUsageVerdict(
        { ...readyOccupancy, current: 40 },
        "occupancy",
        120,
        "10:00",
      ),
    ).toBe("busier");
    expect(
      getUsageVerdict(
        { ...readyOccupancy, current: 5 },
        "occupancy",
        120,
        "10:00",
      ),
    ).toBe("quieter");
    expect(
      getUsageVerdict(
        { ...readyOccupancy, current: 5 },
        "occupancy",
        120,
        "10:00",
        24,
      ),
    ).toBe("usual");

    expect(getUsageVerdict(readyVacancy, "vacancy", 45, "10:00")).toBe("usual");
    expect(
      getUsageVerdict({ ...readyVacancy, current: 20 }, "vacancy", 45, "10:00"),
    ).toBe("busier");
    expect(
      getUsageVerdict({ ...readyVacancy, current: 43 }, "vacancy", 45, "10:00"),
    ).toBe("quieter");
    expect(
      getUsageVerdict(
        {
          ...readyOccupancy,
          anomaly: {
            ...readyOccupancy.anomaly,
            type: "stale",
            z: 0,
            expected: 24,
            actual: 24,
            since: "",
          },
        },
        "occupancy",
        120,
        "10:00",
      ),
    ).toBe("stale");
    expect(
      getUsageVerdict(
        { ...readyOccupancy, anomaly: anomalySeries[2].anomaly },
        "occupancy",
        120,
        "10:00",
      ),
    ).toBe("unexpected_closed");
    const closed = {
      ...readyOccupancy,
      today: [{ ...readyOccupancy.today[0], expected: 20, level: null }],
      anomaly: null,
    };
    expect(getUsageVerdict(closed, "occupancy", 120, "10:00", 24)).toBeNull();
    expect(
      getUsageVerdict(
        { ...closed, anomaly: anomalySeries[2].anomaly },
        "occupancy",
        120,
        "10:00",
        24,
      ),
    ).toBe("unexpected_closed");
  });

  test("picks the sentence from the current time and today's windows", () => {
    expect(
      pickUsageSentence({
        currentTime: "18:30",
        verdict: "usual",
        next: [],
        peaks: [{ start: "18:00", end: "20:00" }],
        bestTime: { start: "14:00", end: "15:30" },
      }),
    ).toEqual({ key: "busy_until", time: "20:00" });
    expect(
      pickUsageSentence({
        currentTime: "15:00",
        verdict: "usual",
        next: [],
        peaks: [{ start: "18:00", end: "20:00" }],
        bestTime: null,
      }),
    ).toEqual({ key: "gets_busy_around", time: "18:00" });
    expect(
      pickUsageSentence({
        currentTime: "21:00",
        verdict: "stale",
        next: [],
        peaks: [{ start: "18:00", end: "20:00" }],
        bestTime: { start: "14:00", end: "15:30" },
      }),
    ).toEqual({ key: "usually_quietest", window: "14:00–15:30" });
    expect(
      pickUsageSentence({
        currentTime: "21:00",
        verdict: "usual",
        next: [],
        peaks: [],
        bestTime: { start: "14:00", end: "15:30" },
      }),
    ).toEqual({ key: "usually_quietest", window: "14:00–15:30" });
    expect(
      pickUsageSentence({
        currentTime: "21:00",
        verdict: "usual",
        next: [],
        peaks: [],
        bestTime: null,
      }),
    ).toBeNull();
  });

  test("prefers the next point closest to an hour for an anomaly", () => {
    expect(
      pickUsageSentence({
        currentTime: "18:30",
        verdict: "busier",
        kind: "occupancy",
        next: [
          { t: "19:00", expected: 31 },
          { t: "19:30", expected: 47 },
          { t: "20:00", expected: 52 },
        ],
        peaks: [{ start: "18:00", end: "20:00" }],
        bestTime: null,
      }),
    ).toEqual({ key: "forecast", value: 47, unit: "people" });
    expect(
      pickUsageSentence({
        currentTime: "18:30",
        verdict: "quieter",
        kind: "vacancy",
        next: [{ t: "19:30", expected: 28 }],
        peaks: [],
        bestTime: null,
      }),
    ).toEqual({ key: "forecast", value: 28, unit: "free_seats" });
  });

  test("aggregates half-hour values and trims unused hours", () => {
    expect(aggregateHourlyValues([1, 3, 5, 7, null, null])).toEqual([
      2,
      6,
      null,
    ]);
    expect(
      trimHoursInUse([
        { hour: 0, value: null },
        { hour: 1, value: 2 },
        { hour: 2, value: null },
        { hour: 3, value: 4 },
        { hour: 4, value: null },
      ]),
    ).toEqual([
      { hour: 1, value: 2 },
      { hour: 2, value: null },
      { hour: 3, value: 4 },
    ]);
    const today = [
      { expected: 9, level: null },
      { expected: 9, level: null },
      { expected: 4, level: "low" as const },
      { expected: 6, level: "low" as const },
      { expected: 8, level: null },
      { expected: 8, level: null },
    ];
    expect(
      trimHoursInUse(
        aggregateHourlyValues(
          today.map((slot) => (slot.level === null ? null : slot.expected)),
        ).map((value, hour) => ({ hour, value })),
      ),
    ).toEqual([{ hour: 1, value: 5 }]);
    expect(
      trimHoursInUse(
        Array.from({ length: 24 }, (_, hour) => ({ hour, value: 2 })),
      ),
    ).toHaveLength(24);
  });

  test("trusts snapshots younger than 45 minutes only", () => {
    const now = new Date("2026-10-06T10:00:00.000Z");
    expect(isUsageSnapshotFresh("2026-10-06T09:30:01.000Z", now)).toBe(true);
    expect(isUsageSnapshotFresh("2026-10-06T09:15:00.000Z", now)).toBe(false);
    expect(isUsageSnapshotFresh("not-a-date", now)).toBe(false);
  });

  test("derives weekday peak and quiet windows from half-hour values", () => {
    const day = Array<number | null>(48).fill(null);
    for (let hour = 9; hour <= 14; hour += 1) {
      const value =
        hour === 14 ? 2 : hour === 9 ? 4 : hour === 10 || hour === 13 ? 8 : 10;
      day[hour * 2] = value;
      day[hour * 2 + 1] = value;
    }
    expect(deriveUsageWindows(day)).toEqual({
      peaks: [{ start: "10:00", end: "14:00" }],
      bestTime: { start: "14:00", end: "15:00" },
    });
  });

  test("shows the learning notice only for a non-empty all-learning response", () => {
    expect(shouldShowUsageLearningNotice(undefined)).toBe(false);
    expect(shouldShowUsageLearningNotice(emptyResponse)).toBe(false);
    expect(
      shouldShowUsageLearningNotice({
        ...emptyResponse,
        series: [learningSeries],
      }),
    ).toBe(true);
    expect(
      shouldShowUsageLearningNotice({
        ...emptyResponse,
        series: [learningSeries, readyOccupancy],
      }),
    ).toBe(false);
  });
});
