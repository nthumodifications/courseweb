import { describe, expect, test } from "bun:test";
import { fromZonedTime } from "date-fns-tz";
import type { CompleteBusData, NandaBusDepartureDetails } from "@/libs/bus";
import {
  findNextCampusBus,
  getVenueCampus,
  type CampusClass,
} from "./campusBusSuggestion";

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

describe("campus bus suggestions", () => {
  test.each([
    {
      venue: "Nanda南大N404",
      line: "route1" as const,
      direction: "up" as const,
      south: [bus("08:20", "route1"), bus("08:30", "route1")],
      main: [bus("08:20", "route2")],
    },
    {
      venue: "GEN II綜二101",
      line: "route2" as const,
      direction: "down" as const,
      south: [bus("08:20", "route1")],
      main: [bus("08:20", "route2"), bus("08:30", "route2")],
    },
  ])(
    "selects the first route that arrives before a $venue class",
    ({ venue, line, direction, south, main }) => {
      const result = findNextCampusBus(
        [classAt(venue)],
        busData(south, main),
        taipeiDate("2026-10-08T08:00"),
      );

      expect(result).toMatchObject({
        line,
        direction,
        departureTime: "08:20",
        arrivalTime: "08:40",
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
});
