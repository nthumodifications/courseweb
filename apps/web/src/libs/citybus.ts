import { useQuery } from "@tanstack/react-query";

export const SERVICE_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Preserve the existing deterministic code-unit order used by Array#sort. */
export const compareCityBusStrings = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

export type ServiceDay = (typeof SERVICE_DAYS)[number];
export type CityBusCategory = "pilot" | "city" | "intercity";
export type CityBusDayType = "weekday" | "weekend";

export interface CityBusSource {
  name: string;
  url: string;
  license: string;
  attribution: string;
}

export interface CityBusSchedule {
  kind: "timetable" | "frequency";
  serviceDays: Record<ServiceDay, boolean>;
  timesByStop: Record<string, string[]>;
  timeBasis: "stop" | "origin";
  originStopId?: string;
  originStopNameZh?: string;
  originStopNameEn?: string;
  frequency?: {
    startTime: string;
    endTime: string;
    headwayMinutes: number;
  };
  specialDays: Array<{
    dates?: string[];
    startDate?: string;
    endDate?: string;
    serviceStatus: number;
    descriptionZh?: string;
  }>;
}

export interface CityBusStop {
  id: string;
  nameZh: string;
  nameEn: string;
  sequence: number;
  nearCampus: boolean;
  position?: { lat: number; lon: number };
}

export interface CityBusDirectionSummary {
  id: string;
  labelZh: string;
  labelEn: string;
  destinationZh: string;
  destinationEn: string;
  campusStops: Array<{ id: string; nameZh: string; nameEn: string }>;
}

export interface CityBusDirection extends CityBusDirectionSummary {
  stops: CityBusStop[];
  schedules: CityBusSchedule[];
}

export interface CityBusRouteSummary {
  id: string;
  source: "city" | "intercity";
  category: CityBusCategory;
  nameZh: string;
  nameEn: string;
  operatorZh?: string;
  operatorEn?: string;
  timesUrl?: string;
  directions: CityBusDirectionSummary[];
  stopNamesZh: string[];
  stopNamesEn: string[];
}

export interface CityBusRoute
  extends Omit<CityBusRouteSummary, "file" | "directions"> {
  tdxRouteUid: string;
  tdxRouteName: string;
  generatedAt: string;
  sourceInfo: CityBusSource;
  directions: CityBusDirection[];
}

export interface CityBusRoutesResponse {
  routes: CityBusRouteSummary[];
}

export interface CityBusDeparture {
  departureTime: string;
  minutes?: number;
  dayOffset?: number;
  realtime: boolean;
  kind?: "timetable" | "frequency";
  timeBasis?: "stop" | "origin";
  originStopNameZh?: string;
  originStopNameEn?: string;
  frequency?: {
    startTime: string;
    endTime: string;
    headwayMinutes: number;
  };
  arrivalAt?: string;
  status?: "approaching";
  updatedAt?: string;
}

export type CityBusTimetableEntry = CityBusDeparture & { past: boolean };

export interface CityBusTrip {
  id: string;
  kind: CityBusSchedule["kind"];
  departureTime: string;
  dayOffset: number;
  absoluteMinutes: number;
  timesByStop: Record<string, string | undefined>;
  timeBasis: CityBusSchedule["timeBasis"];
  frequency?: CityBusSchedule["frequency"];
}

export type CityBusScheduleStatus = "scheduled" | "no_timetable" | "no_service";

export interface CityBusDeparturesResponse {
  source: CityBusSource;
  routeId: string;
  directionId: string;
  stopId: string;
  realtime: boolean;
  status: CityBusScheduleStatus;
  departures: CityBusDeparture[];
  eta?: CityBusEtaResponse;
}

export interface CityBusRealtimeStop {
  stopId: string;
  etaSeconds: number | null;
  status: number | null;
  nextBusTime: string | null;
  isLastBus: boolean;
  plate: string | null;
}

export interface CityBusRealtimeBus {
  plate: string | null;
  stopId: string;
  event: string | number | null;
}

export interface CityBusEtaResponse {
  routeId: string;
  directionId: string;
  stops: CityBusRealtimeStop[];
  buses: CityBusRealtimeBus[];
  updatedAt: string | null;
  realtime: boolean;
}

export type CityBusRealtimeLabelKey =
  | "countdown"
  | "arriving"
  | "last_bus"
  | "not_operating"
  | "next_bus";

export interface CityBusRealtimeDisplay {
  labelKey: CityBusRealtimeLabelKey;
  minutes?: number;
  nextBusTime?: string;
}

export function formatDepartureCountdown(
  minutes: number | undefined,
  language: "zh" | "en",
  labels: { underHour: string; minute: string; hour: string },
) {
  if (minutes === undefined) return undefined;
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded} ${labels.underHour}`;
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (language === "zh")
    return `${hours} ${labels.hour}${remainder ? ` ${remainder} ${labels.minute}` : ""}`;
  return `${hours} ${labels.hour}${remainder ? ` ${remainder} ${labels.minute}` : ""}`;
}

export function formatDepartureTime(
  departure: Pick<CityBusDeparture, "departureTime" | "dayOffset">,
  language: "zh" | "en",
  labels: { tomorrow: string; daysAfter: string },
) {
  const dayOffset = departure.dayOffset ?? 0;
  if (dayOffset === 1) return `${labels.tomorrow} ${departure.departureTime}`;
  if (dayOffset > 1)
    return labels.daysAfter
      .replace("{days}", String(dayOffset))
      .replace("{time}", departure.departureTime);
  return departure.departureTime;
}

export function getCityBusRealtimeDisplay(
  stop: Pick<CityBusRealtimeStop, "etaSeconds" | "status" | "nextBusTime">,
): CityBusRealtimeDisplay | undefined {
  if (stop.status === 3) return { labelKey: "last_bus" };
  if (stop.status === 4) return { labelKey: "not_operating" };
  if (stop.status === 1 && stop.nextBusTime)
    return { labelKey: "next_bus", nextBusTime: stop.nextBusTime };
  if (stop.etaSeconds === null) return undefined;
  const seconds = Math.max(0, stop.etaSeconds);
  const minutes = Math.ceil(seconds / 60);
  return seconds < 60
    ? { labelKey: "arriving", minutes: 0 }
    : { labelKey: "countdown", minutes };
}

export function formatCityBusRealtimeDisplay(
  display: CityBusRealtimeDisplay | undefined,
  language: "zh" | "en",
  labels: {
    arriving: string;
    lastBus: string;
    notOperating: string;
    minutes: string;
  },
) {
  if (!display) return undefined;
  if (display.labelKey === "arriving") return labels.arriving;
  if (display.labelKey === "last_bus") return labels.lastBus;
  if (display.labelKey === "not_operating") return labels.notOperating;
  if (display.labelKey === "next_bus" && display.nextBusTime) {
    return formatCityBusTime(display.nextBusTime, language);
  }
  return `${display.minutes ?? 0} ${labels.minutes}`;
}

export function formatCityBusTime(value: string, _language: "zh" | "en") {
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatCityBusUpdatedAt(value: string, language: "zh" | "en") {
  return formatCityBusTime(value, language);
}

export type CityBusLiveStationState = "arriving" | "at_station";

export function getCityBusLiveStationState(
  event: string | number | null,
): CityBusLiveStationState {
  if (
    event === 1 ||
    (typeof event === "string" &&
      /(at[_ -]?station|arrived|停靠|到站)/i.test(event))
  )
    return "at_station";
  return "arriving";
}

export function mergeCityBusEtaIntoTimeline(
  stopIds: string[],
  eta: CityBusEtaResponse,
) {
  return stopIds.map((stopId) => {
    const liveStop = eta.stops.find((item) => item.stopId === stopId);
    const bus = eta.buses.find((item) => item.stopId === stopId);
    return {
      stopId,
      display: liveStop ? getCityBusRealtimeDisplay(liveStop) : undefined,
      state: bus ? getCityBusLiveStationState(bus.event) : undefined,
    };
  });
}

export function getCityBusDayType(day: ServiceDay): CityBusDayType {
  return day === "Saturday" || day === "Sunday" ? "weekend" : "weekday";
}

export function getCityBusDayTypeForDate(now: Date) {
  return getCityBusDayType(taipeiClock(now).weekday);
}

function directionBoardingTimeSignature(direction: CityBusDirection) {
  const boardingStops = direction.stops.filter((stop) => stop.nearCampus);
  const stops = boardingStops.length > 0 ? boardingStops : direction.stops;
  return stops
    .map((stop) => {
      const schedules = direction.schedules
        .map((schedule) => {
          const values = schedule.timesByStop[stop.id] ?? [];
          const serviceDays = SERVICE_DAYS.filter(
            (day) => schedule.serviceDays[day],
          ).join(",");
          return `${schedule.kind}:${serviceDays}:${values.join(",")}`;
        })
        .sort(compareCityBusStrings);
      return `${stop.id}:${schedules.join("|")}`;
    })
    .join(";");
}

export function getDistinctCityBusDirections(route: CityBusRoute) {
  const seen = new Set<string>();
  return route.directions.filter((direction) => {
    const key = `${direction.destinationZh}\u0000${direction.destinationEn}\u0000${directionBoardingTimeSignature(direction)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatNextServiceDay(
  dayOffset: number,
  now: Date,
  language: "zh" | "en",
  tomorrow: string,
) {
  if (dayOffset === 1) return tomorrow;
  const date = new Date(now.getTime() + dayOffset * 86_400_000);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : "en-US", {
    timeZone: "Asia/Taipei",
    weekday: "long",
  }).format(date);
}

const STATIC_ROOT = "/fallback_data/citybus";
const routeCache = new Map<string, Promise<CityBusRoute>>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`City bus static data failed: ${response.status}`);
  return (await response.json()) as T;
}

export async function getCityBusRoutes(): Promise<CityBusRoutesResponse> {
  return fetchJson<CityBusRoutesResponse>(`${STATIC_ROOT}/index.json`);
}

export async function getCityBusRoute(routeId: string) {
  const existing = routeCache.get(routeId);
  if (existing) return existing;
  const promise = fetchJson<CityBusRoute>(
    `${STATIC_ROOT}/routes/${encodeURIComponent(encodeURIComponent(routeId))}.json`,
  );
  routeCache.set(routeId, promise);
  return promise;
}

function timeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 47 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function clockToMinutes(value: string) {
  const minutes = timeToMinutes(value);
  return minutes === null ? null : minutes % 1440;
}

function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(
    normalized % 60,
  ).padStart(2, "0")}`;
}

function taipeiClock(now: Date, offset = 0) {
  const date = new Date(now.getTime() + offset * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    weekday: values.weekday as ServiceDay,
  };
}

function specialDayStatus(schedule: CityBusSchedule, date: string) {
  const specialDay = schedule.specialDays.find((item) => {
    if (item.dates?.includes(date)) return true;
    return Boolean(
      item.startDate &&
        item.endDate &&
        item.startDate <= date &&
        date <= item.endDate,
    );
  });
  return specialDay ? specialDay.serviceStatus !== 0 : undefined;
}

function scheduleRunsOn(
  schedule: CityBusSchedule,
  day: ServiceDay,
  date: string,
) {
  return specialDayStatus(schedule, date) ?? schedule.serviceDays[day];
}

function scheduleTimesAtStop(schedule: CityBusSchedule, stopId: string) {
  const direct = schedule.timesByStop[stopId];
  if (direct?.length) return { values: direct, basis: schedule.timeBasis };
  if (schedule.timeBasis !== "origin" || !schedule.originStopId)
    return undefined;
  const origin = schedule.timesByStop[schedule.originStopId];
  if (!origin?.length) return undefined;
  return { values: origin, basis: "origin" as const };
}

function tripTimeAtStop(
  schedule: CityBusSchedule,
  stopId: string,
  tripIndex: number,
) {
  return schedule.timesByStop[stopId]?.[tripIndex];
}

export function getCityBusTrips(
  route: CityBusRoute,
  directionId: string,
  stopId: string,
  now: Date,
): CityBusTrip[] {
  const direction = route.directions.find((item) => item.id === directionId);
  const stop = direction?.stops.find((item) => item.id === stopId);
  const currentMinutes = clockToMinutes(taipeiClock(now).time);
  if (!direction || !stop || currentMinutes === null) return [];

  const trips: CityBusTrip[] = [];
  for (let dayOffset = -7; dayOffset <= 7; dayOffset += 1) {
    const day = taipeiClock(now, dayOffset);
    for (
      let scheduleIndex = 0;
      scheduleIndex < direction.schedules.length;
      scheduleIndex += 1
    ) {
      const schedule = direction.schedules[scheduleIndex];
      if (!scheduleRunsOn(schedule, day.weekday, day.date)) continue;

      if (schedule.kind === "frequency") {
        const start = timeToMinutes(schedule.frequency?.startTime ?? "");
        const end = timeToMinutes(schedule.frequency?.endTime ?? "");
        if (start === null || end === null) continue;
        if (schedule.timeBasis === "stop" && schedule.originStopId !== stop.id)
          continue;

        const endMinutes = end <= start ? end + 1440 : end;
        const absoluteStart = dayOffset * 1440 + start;
        const absoluteEnd = dayOffset * 1440 + endMinutes;
        if (absoluteEnd < currentMinutes) continue;
        const isActive =
          absoluteStart <= currentMinutes && currentMinutes <= absoluteEnd;
        const absoluteMinutes = isActive ? currentMinutes : absoluteStart;
        trips.push({
          id: `${scheduleIndex}:${dayOffset}:frequency`,
          kind: schedule.kind,
          departureTime: `${minutesToTime(start)}–${minutesToTime(end)}`,
          dayOffset: Math.floor(absoluteMinutes / 1440),
          absoluteMinutes,
          timesByStop: {},
          timeBasis: schedule.timeBasis,
          frequency: schedule.frequency,
        });
        continue;
      }

      const boardingTimes = scheduleTimesAtStop(schedule, stop.id);
      if (!boardingTimes) continue;
      for (
        let tripIndex = 0;
        tripIndex < boardingTimes.values.length;
        tripIndex += 1
      ) {
        const rawMinutes = timeToMinutes(boardingTimes.values[tripIndex]);
        if (rawMinutes === null) continue;
        const absoluteMinutes = dayOffset * 1440 + rawMinutes;
        const timesByStop = Object.fromEntries(
          direction.stops.map((item) => [
            item.id,
            tripTimeAtStop(schedule, item.id, tripIndex),
          ]),
        );
        trips.push({
          id: `${scheduleIndex}:${dayOffset}:${tripIndex}`,
          kind: schedule.kind,
          departureTime: minutesToTime(rawMinutes),
          dayOffset: Math.floor(absoluteMinutes / 1440),
          absoluteMinutes,
          timesByStop,
          timeBasis: boardingTimes.basis,
        });
      }
    }
  }

  return trips.sort((a, b) => a.absoluteMinutes - b.absoluteMinutes);
}

export function getNextCityBusTripIndex(trips: CityBusTrip[], now: Date) {
  const currentMinutes = clockToMinutes(taipeiClock(now).time);
  if (currentMinutes === null) return -1;
  return trips.findIndex((trip) => trip.absoluteMinutes >= currentMinutes);
}

export function stepCityBusTrip(
  trips: CityBusTrip[],
  currentIndex: number,
  direction: -1 | 1,
) {
  const nextIndex = currentIndex + direction;
  return nextIndex >= 0 && nextIndex < trips.length ? nextIndex : -1;
}

function representativeDate(now: Date, dayType: CityBusDayType) {
  const currentDay = taipeiClock(now).weekday;
  if (getCityBusDayType(currentDay) === dayType) return now;
  const currentIndex = SERVICE_DAYS.indexOf(currentDay);
  const targetIndex = dayType === "weekday" ? 1 : 6;
  return new Date(now.getTime() + (targetIndex - currentIndex) * 86_400_000);
}

function dayTypeSignature(
  direction: CityBusDirection,
  stopId: string,
  dayType: CityBusDayType,
) {
  const days = SERVICE_DAYS.filter((day) => getCityBusDayType(day) === dayType);
  return direction.schedules
    .flatMap((schedule) => {
      if (!days.some((day) => schedule.serviceDays[day])) return [];
      if (schedule.kind === "frequency") {
        return [
          `${schedule.kind}:${schedule.frequency?.startTime ?? ""}-${schedule.frequency?.endTime ?? ""}:${schedule.frequency?.headwayMinutes ?? ""}`,
        ];
      }
      const times = scheduleTimesAtStop(schedule, stopId);
      return times
        ? [`${schedule.kind}:${times.basis}:${times.values.join(",")}`]
        : [];
    })
    .sort(compareCityBusStrings)
    .join("|");
}

export function hasDistinctCityBusDayTypes(
  route: CityBusRoute,
  directionId: string,
  stopId: string,
) {
  const direction = route.directions.find((item) => item.id === directionId);
  if (!direction) return false;
  return (
    dayTypeSignature(direction, stopId, "weekday") !==
    dayTypeSignature(direction, stopId, "weekend")
  );
}

export function getCityBusTimetable(
  route: CityBusRoute,
  directionId: string,
  stopId: string,
  now: Date,
  dayType: CityBusDayType = getCityBusDayType(taipeiClock(now).weekday),
): CityBusTimetableEntry[] {
  const direction = route.directions.find((item) => item.id === directionId);
  const stop = direction?.stops.find((item) => item.id === stopId);
  const current = taipeiClock(now);
  const targetDate = representativeDate(now, dayType);
  const target = taipeiClock(targetDate);
  const currentMinutes = clockToMinutes(current.time);
  if (!direction || !stop || currentMinutes === null) return [];
  const isToday = current.date === target.date;
  const entries: Array<{
    sortMinutes: number;
    entry: CityBusTimetableEntry;
  }> = [];

  for (const schedule of direction.schedules) {
    if (!scheduleRunsOn(schedule, target.weekday, target.date)) continue;
    if (schedule.kind === "frequency") {
      const start = timeToMinutes(schedule.frequency?.startTime ?? "");
      const end = timeToMinutes(schedule.frequency?.endTime ?? "");
      if (start === null || end === null) continue;
      const endMinutes = end <= start ? end + 1440 : end;
      entries.push({
        sortMinutes: start,
        entry: {
          departureTime: `${minutesToTime(start)}–${minutesToTime(end)}`,
          minutes:
            isToday && start >= currentMinutes
              ? start - currentMinutes
              : undefined,
          dayOffset: 0,
          realtime: false,
          kind: "frequency",
          timeBasis: schedule.timeBasis,
          originStopNameZh: schedule.originStopNameZh,
          originStopNameEn: schedule.originStopNameEn,
          frequency: schedule.frequency,
          past: isToday && currentMinutes > endMinutes,
        },
      });
      continue;
    }

    const times = scheduleTimesAtStop(schedule, stop.id);
    if (!times) continue;
    for (const value of times.values) {
      const rawMinutes = timeToMinutes(value);
      if (rawMinutes === null) continue;
      const past = isToday && rawMinutes < currentMinutes;
      entries.push({
        sortMinutes: rawMinutes,
        entry: {
          departureTime: minutesToTime(rawMinutes),
          minutes: isToday && !past ? rawMinutes - currentMinutes : undefined,
          dayOffset: 0,
          realtime: false,
          kind: "timetable",
          timeBasis: times.basis,
          originStopNameZh: schedule.originStopNameZh,
          originStopNameEn: schedule.originStopNameEn,
          past,
        },
      });
    }
  }

  const seen = new Set<string>();
  return entries
    .sort((a, b) => a.sortMinutes - b.sortMinutes)
    .map(({ entry }) => entry)
    .filter((entry) => {
      const key = `${entry.departureTime}:${entry.kind}:${entry.timeBasis}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function frequencyWait(
  schedule: CityBusSchedule,
  currentMinutes: number,
  dayOffset: number,
) {
  if (!schedule.frequency) return undefined;
  const start = timeToMinutes(schedule.frequency.startTime);
  const end = timeToMinutes(schedule.frequency.endTime);
  if (start === null || end === null) return undefined;
  const rawStart = dayOffset * 1440 + start;
  const rawEnd = dayOffset * 1440 + (end <= start ? end + 1440 : end);
  if (currentMinutes > rawEnd) return undefined;
  return Math.max(0, rawStart - currentMinutes);
}

export function getNextScheduledDepartures(
  route: CityBusRoute,
  directionId: string,
  stopId: string,
  now: Date,
  limit = 5,
) {
  const direction = route.directions.find((item) => item.id === directionId);
  const stop = direction?.stops.find((item) => item.id === stopId);
  const current = taipeiClock(now);
  const currentMinutes = clockToMinutes(current.time);
  if (!direction || !stop || currentMinutes === null) return [];
  const candidates: Array<{
    absoluteMinutes: number;
    departure: CityBusDeparture;
  }> = [];

  for (const dayOffset of [-1, 0, 1, 2, 3, 4, 5, 6, 7]) {
    const day = taipeiClock(now, dayOffset).weekday;
    const date = taipeiClock(now, dayOffset).date;
    for (const schedule of direction.schedules) {
      if (!scheduleRunsOn(schedule, day, date)) continue;
      if (schedule.kind === "frequency") {
        if (schedule.timeBasis === "stop" && schedule.originStopId !== stopId)
          continue;
        const wait = frequencyWait(schedule, currentMinutes, dayOffset);
        const start = timeToMinutes(schedule.frequency?.startTime ?? "");
        const end = timeToMinutes(schedule.frequency?.endTime ?? "");
        if (wait === undefined || start === null || end === null) continue;
        candidates.push({
          absoluteMinutes: Math.max(currentMinutes, dayOffset * 1440 + start),
          departure: {
            departureTime: `${minutesToTime(start)}–${minutesToTime(end)}`,
            minutes: wait,
            dayOffset: dayOffset + Math.floor(start / 1440),
            realtime: false,
            kind: "frequency",
            timeBasis: schedule.timeBasis,
            originStopNameZh: schedule.originStopNameZh,
            originStopNameEn: schedule.originStopNameEn,
            frequency: schedule.frequency,
          },
        });
        continue;
      }

      const times = scheduleTimesAtStop(schedule, stopId);
      if (!times) continue;
      for (const value of times.values) {
        const rawMinutes = timeToMinutes(value);
        if (rawMinutes === null) continue;
        const absoluteMinutes = dayOffset * 1440 + rawMinutes;
        if (absoluteMinutes < currentMinutes) continue;
        candidates.push({
          absoluteMinutes,
          departure: {
            departureTime: minutesToTime(rawMinutes),
            minutes: absoluteMinutes - currentMinutes,
            dayOffset: dayOffset + Math.floor(rawMinutes / 1440),
            realtime: false,
            kind: "timetable",
            timeBasis: times.basis,
            originStopNameZh: schedule.originStopNameZh,
            originStopNameEn: schedule.originStopNameEn,
          },
        });
      }
    }
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => a.absoluteMinutes - b.absoluteMinutes)
    .map(({ departure }) => departure)
    .filter((departure) => {
      const key = `${departure.departureTime}:${departure.kind}:${departure.minutes}:${departure.dayOffset}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function getScheduleStatus(
  route: CityBusRoute,
  directionId: string,
  stopId: string,
  now: Date,
): CityBusScheduleStatus {
  const direction = route.directions.find((item) => item.id === directionId);
  const stop = direction?.stops.find((item) => item.id === stopId);
  if (!direction || !stop || direction.schedules.length === 0)
    return "no_timetable";
  const hasDaySchedule = [-1, 0, 1, 2, 3, 4, 5, 6, 7].some((dayOffset) => {
    const day = taipeiClock(now, dayOffset);
    return direction.schedules.some((schedule) =>
      scheduleRunsOn(schedule, day.weekday, day.date),
    );
  });
  if (!hasDaySchedule) return "no_timetable";
  return getNextScheduledDepartures(route, directionId, stopId, now, 1).length
    ? "scheduled"
    : "no_service";
}

const realtimeDisabledRoutes = new Set<string>();

export function isCityBusRealtimeDisabled(routeId: string) {
  return realtimeDisabledRoutes.has(routeId);
}

export async function getCityBusEta(
  routeId: string,
  directionId: string,
): Promise<CityBusEtaResponse | undefined> {
  if (realtimeDisabledRoutes.has(routeId)) return undefined;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(
      `${import.meta.env.VITE_COURSEWEB_API_URL}/citybus/eta?route_id=${encodeURIComponent(routeId)}&direction_id=${encodeURIComponent(directionId)}`,
      { signal: controller.signal },
    );
    if (response.status === 404) realtimeDisabledRoutes.add(routeId);
    if (!response.ok) return undefined;
    const data = (await response.json()) as CityBusEtaResponse;
    if (!data.realtime) realtimeDisabledRoutes.add(routeId);
    return data.realtime ? data : undefined;
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useCityBusEta(
  routeId: string | undefined,
  directionId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["citybus_eta", routeId, directionId],
    queryFn: async () => (await getCityBusEta(routeId!, directionId!)) ?? null,
    enabled:
      enabled &&
      Boolean(routeId && directionId) &&
      !isCityBusRealtimeDisabled(routeId ?? ""),
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      !isCityBusRealtimeDisabled(routeId ?? "")
        ? 20_000
        : false,
  });
}

export async function getCityBusDepartures(
  routeId: string,
  directionId: string,
  stopId: string,
  limit = 5,
  now = new Date(),
): Promise<CityBusDeparturesResponse> {
  const route = await getCityBusRoute(routeId);
  const scheduled = getNextScheduledDepartures(
    route,
    directionId,
    stopId,
    now,
    limit,
  );
  const status = getScheduleStatus(route, directionId, stopId, now);
  const eta = await getCityBusEta(routeId, directionId);
  const liveStop = eta?.stops.find((item) => item.stopId === stopId);
  const display = liveStop ? getCityBusRealtimeDisplay(liveStop) : undefined;
  const realtime =
    eta && liveStop && display
      ? {
          source: route.sourceInfo,
          routeId,
          directionId,
          stopId,
          realtime: true,
          status:
            liveStop.status === 3 || liveStop.status === 4
              ? ("no_service" as const)
              : ("scheduled" as const),
          departures:
            liveStop.etaSeconds !== null
              ? [
                  {
                    departureTime: formatCityBusTime(
                      new Date(
                        now.getTime() + liveStop.etaSeconds * 1000,
                      ).toISOString(),
                      "zh",
                    ),
                    minutes: Math.ceil(liveStop.etaSeconds / 60),
                    realtime: true,
                    arrivalAt: new Date(
                      now.getTime() + liveStop.etaSeconds * 1000,
                    ).toISOString(),
                    ...(liveStop.etaSeconds < 60
                      ? { status: "approaching" as const }
                      : {}),
                    ...(eta.updatedAt ? { updatedAt: eta.updatedAt } : {}),
                  },
                ]
              : liveStop.nextBusTime
                ? [
                    {
                      departureTime: formatCityBusTime(
                        liveStop.nextBusTime,
                        "zh",
                      ),
                      realtime: true,
                      ...(eta.updatedAt ? { updatedAt: eta.updatedAt } : {}),
                    },
                  ]
                : [],
          eta,
        }
      : undefined;
  return (
    realtime ?? {
      source: route.sourceInfo,
      routeId,
      directionId,
      stopId,
      realtime: false,
      status,
      departures: scheduled,
    }
  );
}
