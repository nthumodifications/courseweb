import { fromZonedTime } from "date-fns-tz";
import type { CompleteBusData, NandaBusDepartureDetails } from "@/libs/bus";
import type { CampusClass } from "./campusBusSuggestion";

export const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, "Asia/Taipei");

export const bus = (
  time: string,
  type: "route1" | "route2",
  description = "",
): NandaBusDepartureDetails => ({
  time,
  description,
  route: "南大區間車",
  type,
});

const routeInfo = (direction: string, duration: string, route: string) => ({
  direction,
  duration,
  route,
  routeEN: route,
});

export const busData = (
  towardSouthCampus: NandaBusDepartureDetails[] = [],
  towardMainCampus: NandaBusDepartureDetails[] = [],
  weekendTowardSouthCampus: NandaBusDepartureDetails[] = [],
  weekendTowardMainCampus: NandaBusDepartureDetails[] = [],
): CompleteBusData => ({
  main: {
    toward_TSMC_building_info: routeInfo(
      "toward TSMC",
      "15 minutes",
      "campus bus",
    ),
    toward_main_gate_info: routeInfo("toward gate", "15 minutes", "campus bus"),
    weekday: { toward_TSMC_building: [], toward_main_gate: [] },
    weekend: { toward_TSMC_building: [], toward_main_gate: [] },
  },
  nanda: {
    toward_south_campus_info: routeInfo(
      "toward Nanda",
      "20 minutes",
      "shuttle",
    ),
    toward_main_campus_info: routeInfo(
      "toward main campus",
      "20 minutes",
      "shuttle",
    ),
    weekday: {
      toward_south_campus: towardSouthCampus,
      toward_main_campus: towardMainCampus,
    },
    weekend: {
      toward_south_campus: weekendTowardSouthCampus,
      toward_main_campus: weekendTowardMainCampus,
    },
  },
});

export const classAt = (
  venue: string,
  start = "2026-10-08T09:00",
  end?: string,
  id = "class-1",
): CampusClass => {
  const startDate = taipeiDate(start);
  return {
    id,
    title: id,
    start: startDate,
    end: end ? taipeiDate(end) : new Date(startDate.getTime() + 50 * 60 * 1000),
    venue,
  };
};
