import { describe, expect, test } from "bun:test";
import {
  formatDepartureCountdown,
  formatDepartureTime,
  getCityBusTimetable,
  getDistinctCityBusDirections,
  hasDistinctCityBusDayTypes,
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
