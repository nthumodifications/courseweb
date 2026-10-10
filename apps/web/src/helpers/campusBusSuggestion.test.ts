import { describe, expect, test } from "bun:test";
import { fromZonedTime } from "date-fns-tz";
import type { CompleteBusData, NandaBusDepartureDetails } from "@/libs/bus";
import {
  findNextCampusBus,
  hasNoClassToday,
  getVenueCampus,
  type CampusClass,
} from "./campusBusSuggestion";

const fallbackNanda = (await Bun.file(
  `${import.meta.dir}/../../public/fallback_data/bus/nanda.json`,
).json()) as {
  toward_south_campus_info: CompleteBusData["nanda"]["toward_south_campus_info"];
  toward_main_campus_info: CompleteBusData["nanda"]["toward_main_campus_info"];
  weekday_bus_schedule_toward_south_campus: Omit<
    NandaBusDepartureDetails,
    "type"
  >[];
  weekday_bus_schedule_toward_main_campus: Omit<
    NandaBusDepartureDetails,
    "type"
  >[];
  weekend_bus_schedule_toward_south_campus: Omit<
    NandaBusDepartureDetails,
    "type"
  >[];
  weekend_bus_schedule_toward_main_campus: Omit<
    NandaBusDepartureDetails,
    "type"
  >[];
};

const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, "Asia/Taipei");

const bus = (
  time: string,
  type: "route1" | "route2",
  description = "",
): NandaBusDepartureDetails => ({
  time,
  description,
  route: "南大區間車",
  type,
});

const busData = (
  towardSouthCampus: NandaBusDepartureDetails[] = [],
  towardMainCampus: NandaBusDepartureDetails[] = [],
): CompleteBusData => ({
  main: {
    toward_TSMC_building_info: {
      direction: "toward TSMC",
      duration: "15 minutes",
      route: "campus bus",
      routeEN: "campus bus",
    },
    toward_main_gate_info: {
      direction: "toward gate",
      duration: "15 minutes",
      route: "campus bus",
      routeEN: "campus bus",
    },
    weekday: { toward_TSMC_building: [], toward_main_gate: [] },
    weekend: { toward_TSMC_building: [], toward_main_gate: [] },
  },
  nanda: {
    toward_south_campus_info: {
      direction: "toward Nanda",
      duration: "20 minutes",
      route: "shuttle",
      routeEN: "shuttle",
    },
    toward_main_campus_info: {
      direction: "toward main campus",
      duration: "20 minutes",
      route: "shuttle",
      routeEN: "shuttle",
    },
    weekday: {
      toward_south_campus: towardSouthCampus,
      toward_main_campus: towardMainCampus,
    },
    weekend: { toward_south_campus: [], toward_main_campus: [] },
  },
});

const classAt = (venue: string, start = "2026-10-08T09:00"): CampusClass => ({
  id: "class-1",
  title: "Next class",
  start: taipeiDate(start),
  venue,
});

const fallbackBusData = (): CompleteBusData => {
  const base = busData();
  return {
    ...base,
    nanda: {
      ...base.nanda,
      toward_south_campus_info: fallbackNanda.toward_south_campus_info,
      toward_main_campus_info: fallbackNanda.toward_main_campus_info,
      weekday: {
        toward_south_campus:
          fallbackNanda.weekday_bus_schedule_toward_south_campus.map((bus) =>
            Object.assign(bus, { type: "route1" as const }),
          ),
        toward_main_campus:
          fallbackNanda.weekday_bus_schedule_toward_main_campus.map((bus) =>
            Object.assign(bus, { type: "route2" as const }),
          ),
      },
      weekend: {
        toward_south_campus:
          fallbackNanda.weekend_bus_schedule_toward_south_campus.map((bus) =>
            Object.assign(bus, { type: "route1" as const }),
          ),
        toward_main_campus:
          fallbackNanda.weekend_bus_schedule_toward_main_campus.map((bus) =>
            Object.assign(bus, { type: "route2" as const }),
          ),
      },
    },
  };
};

describe("campus bus suggestions", () => {
  test.each([
    {
      venue: "Nanda南大N404",
      line: "route1" as const,
      direction: "down" as const,
      departureTime: "08:20",
      arrivalTime: "08:40",
    },
    {
      venue: "GEN II綜二101",
      line: "route2" as const,
      direction: "up" as const,
      departureTime: "08:00",
      arrivalTime: "08:20",
    },
  ])(
    "uses the fallback date-range data without parsing duration for a $venue class",
    ({ venue, line, direction, departureTime, arrivalTime }) => {
      const result = findNextCampusBus(
        [classAt(venue)],
        fallbackBusData(),
        taipeiDate("2026-10-08T08:00"),
      );

      expect(result).toMatchObject({
        line,
        direction,
        departureTime,
        arrivalTime,
      });
    },
  );

  test.each([
    {
      name: "no class",
      classes: [] as CampusClass[],
      data: busData(),
      now: "2026-10-08T08:00",
    },
    {
      name: "unknown venue",
      classes: [classAt("Online")],
      data: busData([bus("08:20", "route1")]),
      now: "2026-10-08T08:00",
    },
    {
      name: "class on another day",
      classes: [classAt("Nanda南大N404", "2026-10-09T09:00")],
      data: busData([bus("08:20", "route1")]),
      now: "2026-10-08T08:00",
    },
    {
      name: "no bus arrives in time",
      classes: [classAt("Nanda南大N404")],
      data: busData([bus("08:50", "route1")]),
      now: "2026-10-08T08:00",
    },
    {
      name: "Friday-suspended bus",
      classes: [classAt("Nanda南大N404", "2026-10-09T09:00")],
      data: busData([bus("08:20", "route1", "週五停駛")]),
      now: "2026-10-09T08:00",
    },
  ])("returns nothing for $name", ({ classes, data, now }) => {
    const result = findNextCampusBus(classes, data, taipeiDate(now));

    expect(result).toBeNull();
  });

  test("uses the existing venue definitions for campus classification", () => {
    expect(getVenueCampus("Nanda南大N404")).toBe("nanda");
    expect(getVenueCampus("GEN II綜二101")).toBe("main");
    expect(getVenueCampus("Online")).toBeNull();
  });

  test("suppresses holidays and no-class events from the existing calendar", () => {
    const now = taipeiDate("2026-10-10T08:00");
    expect(
      hasNoClassToday(
        [
          {
            source: "academic",
            title: "國慶日",
            start: taipeiDate("2026-10-10T00:00"),
            allDay: true,
          },
        ],
        now,
      ),
    ).toBe(true);
    expect(
      hasNoClassToday(
        [
          {
            source: "course-date",
            title: "No class",
            start: taipeiDate("2026-10-10T00:00"),
            allDay: true,
            courseDate: { type: "no_class" },
          },
        ],
        now,
      ),
    ).toBe(true);
    expect(
      hasNoClassToday(
        [
          {
            source: "academic",
            title: "國慶日",
            start: taipeiDate("2026-10-11T00:00"),
            allDay: true,
          },
        ],
        now,
      ),
    ).toBe(false);
  });
});
