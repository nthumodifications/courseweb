import { describe, expect, test } from "bun:test";
import etaFixture from "./citybus/fixtures/eta.json";
import citybus from "./citybus";
import {
  getNextScheduledDepartures,
  getScheduleStatus,
  normalizeTdxEtas,
} from "./citybus/logic";
import data from "./citybus/data.json";
import type { CityBusStaticData } from "./citybus/types";

const overnightRoute: CityBusStaticData["routes"][number] = {
  id: "overnight",
  source: "city",
  category: "city",
  nameZh: "夜間測試線",
  nameEn: "Overnight test",
  tdxRouteUid: "test",
  tdxRouteName: "test",
  generatedAt: "2026-10-06",
  sourceInfo: {
    name: "TDX",
    url: "https://tdx.transportdata.tw",
    license: "test",
    attribution: "test",
  },
  directions: [
    {
      id: "overnight-up",
      labelZh: "起點→終點",
      labelEn: "Origin to destination",
      originZh: "起點",
      originEn: "Origin",
      destinationZh: "終點",
      destinationEn: "Destination",
      stops: [
        {
          id: "overnight-stop",
          nameZh: "終點",
          nameEn: "Destination",
          sequence: 1,
          nearCampus: false,
        },
      ],
      schedules: [
        {
          kind: "timetable",
          serviceDays: {
            Sunday: false,
            Monday: false,
            Tuesday: true,
            Wednesday: true,
            Thursday: false,
            Friday: false,
            Saturday: false,
          },
          timesByStop: { "overnight-stop": ["24:10"] },
          timeBasis: "stop",
          specialDays: [],
        },
      ],
    },
  ],
};

const staticData = data as CityBusStaticData;
const tuesday = new Date("2026-10-06T08:00:00+08:00");

describe("city bus data", () => {
  test("normalizes TDX ETA fixture and drops records without an ETA", () => {
    expect(normalizeTdxEtas(etaFixture, tuesday)).toMatchObject([
      {
        departureTime: "08:00",
        minutes: 1,
        realtime: true,
        status: "approaching",
      },
      { departureTime: "08:07", minutes: 7, realtime: true },
    ]);
  });

  test("returns the next weekday departures in chronological order", () => {
    const route = staticData.routes.find((item) => item.id === "83")!;
    expect(
      getNextScheduledDepartures(route, "HSZ000801", "HSZ303610", tuesday, 3),
    ).toMatchObject([
      { departureTime: "08:12", minutes: 12, realtime: false },
      { departureTime: "08:57", minutes: 57, realtime: false },
      { departureTime: "09:13", minutes: 73, realtime: false },
    ]);
  });

  test("rolls a weekend lookup forward to the next published weekday", () => {
    const route = staticData.routes.find((item) => item.id === "83")!;
    expect(
      getNextScheduledDepartures(
        route,
        "HSZ000801",
        "HSZ303610",
        new Date("2026-10-10T08:00:00+08:00"),
      )[0],
    ).toMatchObject({ departureTime: "06:52", dayOffset: 2 });
    expect(
      getScheduleStatus(
        route,
        "HSZ000801",
        "HSZ303610",
        new Date("2026-10-10T08:00:00+08:00"),
      ),
    ).toBe("scheduled");
  });

  test("selects the next service across midnight and into the next day", () => {
    expect(
      getNextScheduledDepartures(
        overnightRoute,
        "overnight-up",
        "overnight-stop",
        new Date("2026-10-06T23:55:00+08:00"),
        1,
      ),
    ).toMatchObject([{ departureTime: "00:10", minutes: 15 }]);

    expect(
      getNextScheduledDepartures(
        overnightRoute,
        "overnight-up",
        "overnight-stop",
        new Date("2026-10-07T00:05:00+08:00"),
        1,
      ),
    ).toMatchObject([{ departureTime: "00:10", minutes: 5 }]);
  });

  test("reports no timetable when no future day has published service", () => {
    const route = {
      ...overnightRoute,
      directions: overnightRoute.directions.map((direction) => ({
        ...direction,
        schedules: direction.schedules.map((schedule) => ({
          ...schedule,
          serviceDays: {
            Sunday: false,
            Monday: false,
            Tuesday: false,
            Wednesday: false,
            Thursday: false,
            Friday: false,
            Saturday: false,
          },
        })),
      })),
    };
    expect(
      getScheduleStatus(
        route,
        "overnight-up",
        "overnight-stop",
        new Date("2026-10-11T08:00:00+08:00"),
      ),
    ).toBe("no_timetable");
  });

  test("serves the route list without requiring TDX credentials", async () => {
    const response = await citybus.request("/routes");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.routes).toHaveLength(39);
    expect(body.routes.map((route) => route.id)).toContain("83");
    expect(body.routes.map((route) => route.nameZh)).toContain("先導公車");
    expect(body.routes.map((route) => route.id)).toContain("intercity-thb1728");
    expect(body.routes.map((route) => route.id)).not.toContain(
      "intercity-thb7312",
    );
  });

  test("serves scheduled departures without TDX credentials", async () => {
    const response = await citybus.request(
      "/departures?route_id=83&stop_id=HSZ303610&limit=2",
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.realtime).toBe(false);
    expect(body.source.attribution).toContain("TDX");
  });
});
