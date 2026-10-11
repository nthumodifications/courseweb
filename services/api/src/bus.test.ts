import { afterEach, describe, expect, test } from "bun:test";
import app from "./bus";

const campusHtml = `
  <script>
    const towardTSMCBuildingInfo = { direction: "往台積館", duration: "約15分鐘", route: "紅線、綠線", routeEN: "Red Line, Green Line" };
    const weekdayBusScheduleTowardTSMCBuilding = [
      { time: "08:10", depStop: "台積館", line: "red", description: "紅線" },
      { time: "08:05", depStop: "北校門", line: "green", description: "綠線" }
    ];
    const weekdayBusScheduleTowardMainGate = [
      { time: "09:10", depStop: "台積館", line: "red", description: "紅線" }
    ];
  </script>`;

const intercampusHtml = `
  <script>
    const towardNandaInfo = { direction: "往南大校區", duration: "約20分鐘", route: "南大區間車", routeEN: "Nanda Shuttle" };
    const weekdayBusScheduleTowardNanda = [
      { time: "07:40", line: "route1", description: "路線一" },
      { time: "08:20", line: "route2", description: "路線二" }
    ];
    const weekdayBusScheduleTowardMainCampus = [
      { time: "10:20", line: "route1", description: "Route I" }
    ];
  </script>`;

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("campus bus schedule parsing and selection", () => {
  test("parses fixture-shaped upstream scripts and filters by line", async () => {
    globalThis.fetch = async (input) =>
      new Response(
        String(input).includes("20978") ? campusHtml : intercampusHtml,
      );

    const response = await app.request("/schedules?bus_type=red&day=weekday");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        time: "08:10",
        description: "紅線",
        route: "校園公車",
        dep_stop: "台積館",
        line: "red",
      },
    ]);
  });

  test.each([
    ["route1", ["路線一"]],
    ["route2", ["路線二"]],
    ["nanda", ["路線一", "路線二"]],
  ])("selects inter-campus bus type %s", async (busType, descriptions) => {
    globalThis.fetch = async (input) =>
      new Response(
        String(input).includes("20978") ? campusHtml : intercampusHtml,
      );
    const response = await app.request(
      `/schedules?bus_type=${busType}&direction=up&day=weekday`,
    );
    const body = (await response.json()) as Array<{
      description: string;
      type?: string;
    }>;
    expect(body.map((item) => item.description)).toEqual(descriptions);
  });

  test("returns a validation error for unknown schedule selectors", async () => {
    const response = await app.request("/schedules?bus_type=unknown");
    expect(response.status).toBe(400);
  });
});
