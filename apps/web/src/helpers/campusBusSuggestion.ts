import { getBuildingDefinition } from "@courseweb/shared";
import { formatInTimeZone } from "date-fns-tz";
import type { CompleteBusData, NandaBusDepartureDetails } from "@/libs/bus";

export const CAMPUS_BUS_TIME_ZONE = "Asia/Taipei";

export type Campus = "main" | "nanda";

export type CampusClass = {
  id: string;
  title: string;
  start: Date;
  venue?: string;
};

export type CampusBusSuggestion = {
  class: CampusClass;
  campus: Campus;
  line: "route1" | "route2";
  direction: "up" | "down";
  departureTime: string;
  arrivalTime: string;
};

const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})$/;
const NANDA_VENUE_PATTERN = /南大|nanda/i;
const HOLIDAY_TITLE_PATTERN =
  /國慶|國定假日|放假|休假|假日|補假|停課|holiday|no[\s-]?class|day off/i;

// The API's Nanda fallback documents about 20 minutes in both directions;
// RouteInfo.duration is only the service-validity date range.
const CAMPUS_BUS_TRAVEL_MINUTES = {
  down: 20,
  up: 20,
} as const;

const parseClockMinutes = (value: string): number | null => {
  const match = CLOCK_PATTERN.exec(value.trim());
  if (!match) return null;

  const hours = Number.parseInt(match[1]!, 10);
  const minutes = Number.parseInt(match[2]!, 10);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const getTaipeiClockMinutes = (date: Date) =>
  parseClockMinutes(formatInTimeZone(date, CAMPUS_BUS_TIME_ZONE, "HH:mm"));

const getTaipeiDate = (date: Date) =>
  formatInTimeZone(date, CAMPUS_BUS_TIME_ZONE, "yyyy-MM-dd");

const getTaipeiDay = (date: Date) =>
  Number.parseInt(formatInTimeZone(date, CAMPUS_BUS_TIME_ZONE, "i"), 10);

const formatClockMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const getVenueCampus = (venue?: string): Campus | null => {
  if (!venue) return null;
  if (NANDA_VENUE_PATTERN.exec(venue)) return "nanda";
  return getBuildingDefinition(venue) ? "main" : null;
};

type CampusCalendarEvent = {
  source: string;
  title: string;
  start: Date;
  allDay: boolean;
  courseDate?: { type?: string };
};

export const hasNoClassToday = (
  events: readonly CampusCalendarEvent[],
  now: Date,
) => {
  const today = getTaipeiDate(now);
  return events.some(
    (event) =>
      getTaipeiDate(event.start) === today &&
      ((event.source === "academic" &&
        event.allDay &&
        HOLIDAY_TITLE_PATTERN.test(event.title)) ||
        (event.source === "course-date" &&
          event.courseDate?.type === "no_class")),
  );
};

const getNextClass = (
  classes: readonly CampusClass[],
  now: Date,
): CampusClass | null => {
  const today = formatInTimeZone(now, CAMPUS_BUS_TIME_ZONE, "yyyy-MM-dd");
  return (
    classes
      .filter(
        (courseClass) =>
          courseClass.start > now &&
          formatInTimeZone(
            courseClass.start,
            CAMPUS_BUS_TIME_ZONE,
            "yyyy-MM-dd",
          ) === today,
      )
      .sort((left, right) => left.start.getTime() - right.start.getTime())[0] ??
    null
  );
};

const routeForCampus = (campus: Campus, data: CompleteBusData) =>
  campus === "nanda"
    ? {
        direction: "down" as const,
        schedule: data.nanda.weekday.toward_south_campus,
        weekendSchedule: data.nanda.weekend.toward_south_campus,
      }
    : {
        direction: "up" as const,
        schedule: data.nanda.weekday.toward_main_campus,
        weekendSchedule: data.nanda.weekend.toward_main_campus,
      };

const getEligibleSchedule = (
  campus: Campus,
  data: CompleteBusData,
  day: number,
): {
  direction: "up" | "down";
  schedule: NandaBusDepartureDetails[];
  travelMinutes: number;
} => {
  const route = routeForCampus(campus, data);
  return {
    direction: route.direction,
    schedule: day >= 6 ? route.weekendSchedule : route.schedule,
    travelMinutes: CAMPUS_BUS_TRAVEL_MINUTES[route.direction],
  };
};

export const findNextCampusBus = (
  classes: readonly CampusClass[],
  data: CompleteBusData,
  now: Date,
): CampusBusSuggestion | null => {
  const nextClass = getNextClass(classes, now);
  if (!nextClass) return null;

  const campus = getVenueCampus(nextClass.venue);
  if (!campus) return null;

  const classStart = getTaipeiClockMinutes(nextClass.start);
  const currentTime = getTaipeiClockMinutes(now);
  if (classStart === null || currentTime === null) return null;

  const { direction, schedule, travelMinutes } = getEligibleSchedule(
    campus,
    data,
    getTaipeiDay(now),
  );

  const departure = schedule
    .filter(
      (bus) =>
        (bus.type === "route1" || bus.type === "route2") &&
        !(getTaipeiDay(now) === 5 && bus.description.includes("週五停駛")),
    )
    .map((bus) => ({ bus, minutes: parseClockMinutes(bus.time) }))
    .filter(
      (
        candidate,
      ): candidate is {
        bus: NandaBusDepartureDetails & { type: "route1" | "route2" };
        minutes: number;
      } =>
        candidate.minutes !== null &&
        candidate.minutes >= currentTime &&
        candidate.minutes + travelMinutes <= classStart,
    )
    .sort((left, right) => left.minutes - right.minutes)[0];

  if (!departure) return null;

  const departureTime = formatClockMinutes(departure.minutes);
  const arrivalMinutes = departure.minutes + travelMinutes;
  const arrivalTime = formatClockMinutes(arrivalMinutes);

  return {
    class: nextClass,
    campus,
    line: departure.bus.type,
    direction,
    departureTime,
    arrivalTime,
  };
};
