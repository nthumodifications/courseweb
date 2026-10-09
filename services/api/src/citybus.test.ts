import { afterEach, describe, expect, test } from "bun:test";
import eta83Fixture from "./citybus/fixtures/eta-83.json";
import etaFixture from "./citybus/fixtures/eta.json";
import etaStatusesFixture from "./citybus/fixtures/eta-statuses.json";
import nearStopFixture from "./citybus/fixtures/nearstop-83.json";
import citybus from "./citybus";
import {
  getNextScheduledDepartures,
  getScheduleStatus,
  normalizeTdxEtas,
} from "./citybus/logic";
import {
  buildCityBusEtaResponse,
  getCityBusRealtimeSnapshot,
  getTdxAccessToken,
  resetCityBusRealtimeCacheForTests,
} from "./citybus/realtime";
import data from "./citybus/data.json";
import type {
  CityBusStaticData,
  TdxEtaRecord,
  TdxNearStopRecord,
} from "./citybus/types";

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

class FakeCache {
  private readonly values = new Map<string, Response>();

  async match(request: RequestInfo | URL) {
    const url = request instanceof Request ? request.url : String(request);
    return this.values.get(url)?.clone();
  }

  async put(request: RequestInfo | URL, response: Response) {
    const url = request instanceof Request ? request.url : String(request);
    this.values.set(url, response.clone());
  }
}

const originalFetch = globalThis.fetch;
const originalCaches = (globalThis as typeof globalThis & { caches?: unknown })
  .caches;

function installCache() {
  const cache = new FakeCache();
  (globalThis as typeof globalThis & { caches?: unknown }).caches = {
    default: cache,
  };
  return cache;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as typeof globalThis & { caches?: unknown }).caches =
    originalCaches;
  resetCityBusRealtimeCacheForTests();
});

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

  test("joins every static stop and selects 83 subroutes by SubRouteUID", () => {
    const route = staticData.routes.find((item) => item.id === "83")!;
    const direction = route.directions.find((item) => item.id === "HSZ0008A1")!;
    const response = buildCityBusEtaResponse(route, direction, {
      eta: eta83Fixture as TdxEtaRecord[],
      nearStop: nearStopFixture as TdxNearStopRecord[],
      updatedAt: "2026-10-08T02:35:35+08:00",
      fetchedAt: Date.now(),
    });

    expect(response.stops).toHaveLength(direction.stops.length);
    expect(response.stops.map((item) => item.stopId)).toEqual(
      direction.stops.map((item) => item.id),
    );
    expect(
      response.stops.find((item) => item.stopId === "HSZ303577"),
    ).toMatchObject({
      status: 1,
      etaSeconds: null,
    });
    expect(response.directionId).toBe("HSZ0008A1");
  });

  test.each([0, 1, 2, 3, 4])("preserves TDX StopStatus %s", (status) => {
    const route = staticData.routes.find((item) => item.id === "83")!;
    const direction = route.directions[0];
    const response = buildCityBusEtaResponse(route, direction, {
      eta: etaStatusesFixture as TdxEtaRecord[],
      nearStop: [],
      updatedAt: "2026-10-08T02:35:35+08:00",
      fetchedAt: Date.now(),
    });
    expect(response.stops.find((item) => item.status === status)?.status).toBe(
      status,
    );
  });

  test("maps a near-stop vehicle to its static stop", () => {
    const route = staticData.routes.find((item) => item.id === "83")!;
    const response = buildCityBusEtaResponse(route, route.directions[0], {
      eta: [],
      nearStop: [
        {
          StopUID: "HSZ303577",
          StopID: "303577",
          SubRouteUID: "HSZ000801",
          PlateNumb: "ABC-1234",
          EventType: "arriving",
        },
      ],
      updatedAt: null,
      fetchedAt: Date.now(),
    });
    expect(response.buses).toEqual([
      { plate: "ABC-1234", stopId: "HSZ303577", event: "arriving" },
    ]);
  });

  test("uses one token, ETA call, and near-stop call for cached route requests", async () => {
    installCache();
    const calls: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/token"))
        return Response.json({
          access_token: "fixture-token",
          expires_in: 1800,
        });
      if (url.includes("EstimatedTimeOfArrival"))
        return Response.json(eta83Fixture);
      if (url.includes("RealTimeNearStop"))
        return Response.json(nearStopFixture);
      return new Response(null, { status: 404 });
    };

    const env = { TDX_CLIENT_ID: "client", TDX_CLIENT_SECRET: "secret" };
    const first = await citybus.fetch(
      new Request("https://api.test/eta?route_id=83&direction_id=HSZ000801"),
      env,
    );
    const second = await citybus.fetch(
      new Request("https://api.test/eta?route_id=83&direction_id=HSZ000802"),
      env,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      calls.filter((url) => url.includes("tdx.transportdata")).length,
    ).toBe(3);
    expect((await first.json()).stops).toHaveLength(20);
    expect((await second.json()).directionId).toBe("HSZ000802");
  });

  test("reuses a cached route snapshot when upstream fails while it is fresh enough", async () => {
    installCache();
    const route = staticData.routes.find((item) => item.id === "83")!;
    const env = { TDX_CLIENT_ID: "client", TDX_CLIENT_SECRET: "secret" };
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("/token"))
        return Response.json({
          access_token: "fixture-token",
          expires_in: 1800,
        });
      if (url.includes("EstimatedTimeOfArrival"))
        return Response.json(eta83Fixture);
      return Response.json(nearStopFixture);
    };
    const first = await getCityBusRealtimeSnapshot(route, env);
    expect(first).toBeDefined();

    const originalNow = Date.now;
    const fetchedAt = first!.fetchedAt;
    Date.now = () => fetchedAt + 21_000;
    globalThis.fetch = async () => new Response(null, { status: 429 });
    const stale = await getCityBusRealtimeSnapshot(route, env);
    expect(stale?.fetchedAt).toBe(fetchedAt);
    Date.now = () => fetchedAt + 121_000;
    expect(await getCityBusRealtimeSnapshot(route, env)).toBeUndefined();
    Date.now = originalNow;
  });

  test("caches the TDX token until shortly before expiry", async () => {
    installCache();
    let tokenCalls = 0;
    globalThis.fetch = async () => {
      tokenCalls += 1;
      return Response.json({ access_token: "fixture-token", expires_in: 1800 });
    };
    const env = { TDX_CLIENT_ID: "client", TDX_CLIENT_SECRET: "secret" };
    expect(await getTdxAccessToken(env)).toBe("fixture-token");
    expect(await getTdxAccessToken(env)).toBe("fixture-token");
    expect(tokenCalls).toBe(1);
  });
});
