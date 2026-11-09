import { getBuildingDefinition } from "@courseweb/shared";
import { formatInTimeZone } from "date-fns-tz";
import type { CompleteBusData, NandaBusDepartureDetails } from "@/libs/bus";

export const CAMPUS_BUS_TIME_ZONE = "Asia/Taipei";

export type Campus = "main" | "nanda";

export type CampusClass = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  venue?: string;
};

export type CampusBusSuggestion = {
  class: CampusClass;
  campus: Campus;
  fromCampus: Campus;
  line: "route1" | "route2";
  direction: "up" | "down";
  departureTime: string;
  arrivalTime: string;
};

export type NextCampusBusPlan =
  | (CampusBusSuggestion & { status: "scheduled" })
  | {
      status: "no_bus";
      class: CampusClass;
      fromCampus: Campus;
      campus: Campus;
    };

export type CampusTransferSuggestion = {
  from: CampusClass;
  to: CampusClass;
  fromCampus: Campus;
  toCampus: Campus;
  status: "scheduled" | "too_short" | "no_bus";
  line?: "route1" | "route2";
  direction?: "up" | "down";
  departureTime?: string;
  arrivalTime?: string;
};

const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})$/;
const HOLIDAY_TITLE_PATTERN =
  /國慶|國定假日|放假|休假|假日|補假|停課|holiday|no[\s-]?class|day off/i;

// The API's Nanda fallback documents about 20 minutes in both directions;
// RouteInfo.duration is only the service-validity date range.
const CAMPUS_BUS_TRAVEL_MINUTES = {
  down: 20,
  up: 20,
} as const;
const ARRIVAL_BUFFER_MINUTES = 5;

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

const getTaipeiCurrentMinute = (date: Date) => {
  const clockMinutes = getTaipeiClockMinutes(date);
  if (clockMinutes === null) return null;
  return date.getSeconds() > 0 || date.getMilliseconds() > 0
    ? clockMinutes + 1
    : clockMinutes;
};

const getTaipeiDate = (date: Date) =>
  formatInTimeZone(date, CAMPUS_BUS_TIME_ZONE, "yyyy-MM-dd");

const getTaipeiDay = (date: Date) =>
  Number.parseInt(formatInTimeZone(date, CAMPUS_BUS_TIME_ZONE, "i"), 10);

const formatClockMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const getVenueCampus = (venue?: string): Campus | null => {
  if (!venue) return null;
  const building = getBuildingDefinition(venue);
  if (!building || building.code.english === "VC") return null;
  return building.code.english === "Nanda" ? "nanda" : "main";
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

export const planNextCampusBus = (
  classes: readonly CampusClass[],
  data: CompleteBusData,
  now: Date,
  homeCampus: Campus | null = null,
): NextCampusBusPlan | null => {
  const todayClasses = classes
    .filter(
      (courseClass) => getTaipeiDate(courseClass.start) === getTaipeiDate(now),
    )
    .sort((left, right) => left.start.getTime() - right.start.getTime());
  const nextClass = getNextClass(todayClasses, now);
  if (!nextClass) return null;

  const campus = getVenueCampus(nextClass.venue);
  if (!campus) return null;

  const previousClass = todayClasses
    .filter((courseClass) => courseClass.start < nextClass.start)
    .at(-1);
  const fromCampus = previousClass
    ? getVenueCampus(previousClass.venue)
    : homeCampus;
  if (!fromCampus || fromCampus === campus) return null;

  const classStart = getTaipeiClockMinutes(nextClass.start);
  const currentTime = getTaipeiCurrentMinute(now);
  if (classStart === null || currentTime === null) return null;

  const { direction, schedule, travelMinutes } = getEligibleSchedule(
    campus,
    data,
    getTaipeiDay(now),
  );

  const earliestDeparture = previousClass?.end
    ? Math.max(
        currentTime,
        getTaipeiClockMinutes(previousClass.end) ?? currentTime,
      )
    : currentTime;
  const latestArrival = classStart - ARRIVAL_BUFFER_MINUTES;
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
        candidate.minutes >= earliestDeparture &&
        candidate.minutes + travelMinutes <= latestArrival,
    )
    .sort((left, right) => right.minutes - left.minutes)[0];

  if (!departure) {
    return { status: "no_bus", class: nextClass, fromCampus, campus };
  }

  const departureTime = formatClockMinutes(departure.minutes);
  const arrivalMinutes = departure.minutes + travelMinutes;
  const arrivalTime = formatClockMinutes(arrivalMinutes);

  return {
    status: "scheduled",
    class: nextClass,
    campus,
    fromCampus,
    line: departure.bus.type,
    direction,
    departureTime,
    arrivalTime,
  };
};

export const findNextCampusBus = (
  classes: readonly CampusClass[],
  data: CompleteBusData,
  now: Date,
  homeCampus: Campus | null = null,
): CampusBusSuggestion | null => {
  const plan = planNextCampusBus(classes, data, now, homeCampus);
  return plan?.status === "scheduled" ? plan : null;
};

const getTodayClasses = (classes: readonly CampusClass[], now: Date) => {
  const today = getTaipeiDate(now);
  return classes
    .filter((courseClass) => getTaipeiDate(courseClass.start) === today)
    .sort((left, right) => left.start.getTime() - right.start.getTime());
};

export const findCampusTransfers = (
  classes: readonly CampusClass[],
  data: CompleteBusData,
  now: Date,
): CampusTransferSuggestion[] => {
  const currentTime = getTaipeiCurrentMinute(now);
  if (currentTime === null) return [];

  const todayClasses = getTodayClasses(classes, now);
  const transfers: CampusTransferSuggestion[] = [];

  for (let index = 0; index < todayClasses.length - 1; index += 1) {
    const from = todayClasses[index]!;
    const to = todayClasses[index + 1]!;
    if (!from.end || to.start <= now || (to.end && to.end <= now)) continue;

    const fromCampus = getVenueCampus(from.venue);
    const toCampus = getVenueCampus(to.venue);
    if (!fromCampus || !toCampus || fromCampus === toCampus) continue;

    const fromEnd = getTaipeiClockMinutes(from.end);
    const nextStart = getTaipeiClockMinutes(to.start);
    if (fromEnd === null || nextStart === null) continue;

    const { direction, schedule, travelMinutes } = getEligibleSchedule(
      toCampus,
      data,
      getTaipeiDay(now),
    );
    const earliestDeparture = Math.max(fromEnd, currentTime);
    const departures = schedule
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
          candidate.minutes !== null && candidate.minutes >= earliestDeparture,
      );
    const departure = departures
      .filter(
        (candidate) =>
          candidate.minutes + travelMinutes <=
          nextStart - ARRIVAL_BUFFER_MINUTES,
      )
      .sort((left, right) => right.minutes - left.minutes)[0];

    if (departure) {
      transfers.push({
        from,
        to,
        fromCampus,
        toCampus,
        status: "scheduled",
        line: departure.bus.type,
        direction,
        departureTime: formatClockMinutes(departure.minutes),
        arrivalTime: formatClockMinutes(departure.minutes + travelMinutes),
      });
      continue;
    }

    transfers.push({
      from,
      to,
      fromCampus,
      toCampus,
      status: departures.length > 0 ? "too_short" : "no_bus",
    });
  }

  return transfers;
};
