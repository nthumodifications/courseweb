import { describe, expect, test } from "bun:test";
import {
  formatDepartureCountdown,
  formatDepartureTime,
  formatCityBusRealtimeDisplay,
  getCityBusRealtimeDisplay,
  getCityBusTrips,
  getCityBusTimetable,
  getDistinctCityBusDirections,
  getNextCityBusTripIndex,
  hasDistinctCityBusDayTypes,
  mergeCityBusEtaIntoTimeline,
  stepCityBusTrip,
  type CityBusRoute,
  type CityBusSchedule,
} from "./citybus";

const zhLabels = {
  underHour: "分鐘",
  minute: "分",
  hour: "小時",
};
const enLabels = {
  underHour: "min",
  minute: "min",
  hour: "h",
};

describe("city bus departure display", () => {
  test("uses minutes below an hour and readable hours above it", () => {
    expect(formatDepartureCountdown(46, "zh", zhLabels)).toBe("46 分鐘");
    expect(formatDepartureCountdown(286, "zh", zhLabels)).toBe("4 小時 46 分");
    expect(formatDepartureCountdown(286, "en", enLabels)).toBe("4 h 46 min");
  });

  test("labels the next service day without hiding its departure time", () => {
    expect(
      formatDepartureTime({ departureTime: "06:40", dayOffset: 1 }, "zh", {
        tomorrow: "明天",
        daysAfter: "{days} 天後 {time}",
      }),
    ).toBe("明天 06:40");
  });

  test("turns TDX ETA seconds and statuses into display labels", () => {
    expect(
      getCityBusRealtimeDisplay({
        etaSeconds: 180,
        status: 0,
        nextBusTime: null,
      }),
    ).toEqual({
      labelKey: "countdown",
      minutes: 3,
    });
    expect(
      getCityBusRealtimeDisplay({
        etaSeconds: 0,
        status: 0,
        nextBusTime: null,
      }),
    ).toEqual({
      labelKey: "arriving",
      minutes: 0,
    });
    expect(
      getCityBusRealtimeDisplay({
        etaSeconds: null,
        status: 3,
        nextBusTime: null,
      }),
    ).toEqual({
      labelKey: "last_bus",
    });
    expect(
      getCityBusRealtimeDisplay({
        etaSeconds: null,
        status: 4,
        nextBusTime: null,
      }),
    ).toEqual({
      labelKey: "not_operating",
    });
    expect(
      formatCityBusRealtimeDisplay(
        { labelKey: "countdown", minutes: 3 },
        "zh",
        {
          arriving: "進站中",
          lastBus: "末班車已過",
          notOperating: "今日未營運",
          minutes: "分鐘",
        },
      ),
    ).toBe("3 分鐘");
  });

  test("merges live ETA and near-stop vehicles without changing stop order", () => {
    expect(
      mergeCityBusEtaIntoTimeline(["first", "second"], {
        routeId: "83",
        directionId: "HSZ000801",
        stops: [
          {
            stopId: "first",
            etaSeconds: 45,
            status: 0,
            nextBusTime: null,
            isLastBus: false,
            plate: "ABC-1234",
          },
          {
            stopId: "second",
            etaSeconds: null,
            status: 1,
            nextBusTime: "2026-10-08T03:00:00+08:00",
            isLastBus: false,
            plate: null,
          },
        ],
        buses: [{ plate: "ABC-1234", stopId: "first", event: "at_station" }],
        updatedAt: "2026-10-08T02:35:35+08:00",
        realtime: true,
      }),
    ).toEqual([
      {
        stopId: "first",
        display: { labelKey: "arriving", minutes: 0 },
        state: "at_station",
      },
      {
        stopId: "second",
        display: {
          labelKey: "next_bus",
          nextBusTime: "2026-10-08T03:00:00+08:00",
        },
        state: undefined,
      },
    ]);
  });
});

const source = {
  name: "TDX",
  url: "https://example.com",
  license: "Open",
  attribution: "TDX",
};

function schedule(
  serviceDays: Partial<CityBusSchedule["serviceDays"]>,
  times: string[],
): CityBusSchedule {
  return {
    kind: "timetable",
    serviceDays: {
      Sunday: false,
      Monday: false,
      Tuesday: false,
      Wednesday: false,
      Thursday: false,
      Friday: false,
      Saturday: false,
      ...serviceDays,
    },
    timesByStop: { stop: times },
    timeBasis: "stop",
    specialDays: [],
  };
}

function frequencySchedule(
  serviceDays: Partial<CityBusSchedule["serviceDays"]>,
  startTime: string,
  endTime: string,
): CityBusSchedule {
  return {
    kind: "frequency",
    serviceDays: {
      Sunday: false,
      Monday: false,
      Tuesday: false,
      Wednesday: false,
      Thursday: false,
      Friday: false,
      Saturday: false,
      ...serviceDays,
    },
    timesByStop: {},
    timeBasis: "stop",
    originStopId: "stop",
    specialDays: [],
    frequency: { startTime, endTime, headwayMinutes: 15 },
  };
}

function makeRoute(schedules: CityBusSchedule[]): CityBusRoute {
  const makeDirection = (id: string, label: string) => ({
    id,
    labelZh: label,
    labelEn: label,
    destinationZh: "北校門",
    destinationEn: "North Campus",
    campusStops: [],
    stops: [
      {
        id: "stop",
        nameZh: "清華大學",
        nameEn: "National Tsing Hua University",
        sequence: 1,
        nearCampus: true,
      },
    ],
    schedules,
  });

  return {
    id: "test",
    source: "city",
    category: "city",
    nameZh: "測試",
    nameEn: "Test",
    tdxRouteUid: "test",
    tdxRouteName: "test",
    generatedAt: "2026-01-01",
    sourceInfo: source,
    stopNamesZh: ["清華大學"],
    stopNamesEn: ["National Tsing Hua University"],
    directions: [
      makeDirection("one", "路線 A"),
      makeDirection("duplicate", "路線 B"),
    ],
  };
}

describe("city bus route variants and full-day timetable", () => {
  test("merges variants with the same destination and boarding times", () => {
    const route = makeRoute([
      schedule({ Monday: true, Tuesday: true }, ["08:00", "13:00"]),
    ]);
    expect(getDistinctCityBusDirections(route).map((item) => item.id)).toEqual([
      "one",
    ]);
  });

  test("returns all departures and dims past weekday times", () => {
    const weekday = schedule(
      {
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
        Friday: true,
      },
      ["08:00", "13:00"],
    );
    const weekend = schedule({ Saturday: true, Sunday: true }, ["09:00"]);
    const route = makeRoute([weekday, weekend]);
    const now = new Date("2026-10-06T12:00:00+08:00");
    const timetable = getCityBusTimetable(route, "one", "stop", now, "weekday");

    expect(timetable.map((item) => [item.departureTime, item.past])).toEqual([
      ["08:00", true],
      ["13:00", false],
    ]);
    expect(hasDistinctCityBusDayTypes(route, "one", "stop")).toBe(true);
    expect(
      getCityBusTimetable(route, "one", "stop", now, "weekend").map(
        (item) => item.departureTime,
      ),
    ).toEqual(["09:00"]);
  });
});

describe("city bus trip selection", () => {
  test("keeps a cross-midnight trip after the same-day departure", () => {
    const route = makeRoute([schedule({ Monday: true }, ["23:50", "25:10"])]);
    const now = new Date("2026-10-05T23:40:00+08:00");
    const trips = getCityBusTrips(route, "one", "stop", now);
    const nextIndex = getNextCityBusTripIndex(trips, now);

    expect(trips[nextIndex]?.departureTime).toBe("23:50");
    expect(trips[nextIndex + 1]?.departureTime).toBe("01:10");
    expect(trips[nextIndex + 1]?.dayOffset).toBe(1);
  });

  test("steps to the previous and next trip without leaving the list", () => {
    const route = makeRoute([schedule({ Monday: true }, ["08:00", "13:00"])]);
    const now = new Date("2026-10-05T09:00:00+08:00");
    const trips = getCityBusTrips(route, "one", "stop", now);
    const currentIndex = getNextCityBusTripIndex(trips, now);

    expect(trips[currentIndex]?.departureTime).toBe("13:00");
    expect(stepCityBusTrip(trips, currentIndex, -1)).toBe(currentIndex - 1);
    expect(stepCityBusTrip(trips, currentIndex, 1)).toBe(currentIndex + 1);
    expect(stepCityBusTrip(trips, 0, -1)).toBe(-1);
    expect(stepCityBusTrip(trips, trips.length - 1, 1)).toBe(-1);
  });

  test("keeps frequency routes as one window without inventing stop times", () => {
    const route = makeRoute([
      frequencySchedule({ Monday: true }, "06:00", "22:00"),
    ]);
    const now = new Date("2026-10-05T12:00:00+08:00");
    const trips = getCityBusTrips(route, "one", "stop", now);

    expect(getNextCityBusTripIndex(trips, now)).toBeGreaterThanOrEqual(0);
    const trip = trips[getNextCityBusTripIndex(trips, now)];
    expect(trip?.kind).toBe("frequency");
    expect(trip?.departureTime).toBe("06:00–22:00");
    expect(trip?.timesByStop).toEqual({});
  });
});
