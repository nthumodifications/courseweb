import type {
  CityBusDeparture,
  CityBusSchedule,
  CityBusStaticDirection,
  CityBusStaticRoute,
  CityBusStaticStop,
  ServiceDay,
  TdxEtaRecord,
} from "./types";

const TAIPEI_TIME_ZONE = "Asia/Taipei";
interface TaipeiClock {
  date: string;
  time: string;
  weekday: ServiceDay;
}

function taipeiClock(now: Date, offset = 0): TaipeiClock {
  const date = new Date(now.getTime() + offset * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
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

function findDirection(route: CityBusStaticRoute, directionId: string) {
  return route.directions.find((direction) => direction.id === directionId);
}

function stopTimesFor(
  schedule: CityBusSchedule,
  stopId: string,
  requestedStop: CityBusStaticStop,
) {
  const direct = schedule.timesByStop[stopId];
  if (direct?.length) return { times: direct, timeBasis: schedule.timeBasis };
  if (schedule.timeBasis !== "origin" || !schedule.originStopId)
    return undefined;
  const originTimes = schedule.timesByStop[schedule.originStopId];
  if (!originTimes?.length) return undefined;
  return {
    times: originTimes,
    timeBasis: "origin" as const,
    requestedStop,
  };
}

function frequencyWindow(
  schedule: CityBusSchedule,
  nowMinutes: number,
  dayOffset: number,
) {
  if (!schedule.frequency) return undefined;
  const start = timeToMinutes(schedule.frequency.startTime);
  const end = timeToMinutes(schedule.frequency.endTime);
  if (start === null || end === null) return undefined;
  const absoluteStart = dayOffset * 1440 + start;
  const absoluteEnd = dayOffset * 1440 + (end <= start ? end + 1440 : end);
  const current = nowMinutes;
  if (current > absoluteEnd) return undefined;
  return Math.max(0, absoluteStart - current);
}

export function getNextScheduledDepartures(
  route: CityBusStaticRoute,
  directionId: string,
  stopId: string,
  now: Date,
  limit = 5,
): CityBusDeparture[] {
  const direction = findDirection(route, directionId);
  const stop = direction?.stops.find((item) => item.id === stopId);
  if (!direction || !stop) return [];

  const current = taipeiClock(now);
  const currentMinutes = clockToMinutes(current.time);
  if (currentMinutes === null) return [];
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
        const wait = frequencyWindow(schedule, currentMinutes, dayOffset);
        if (wait === undefined) continue;
        const start = timeToMinutes(schedule.frequency?.startTime ?? "");
        const end = timeToMinutes(schedule.frequency?.endTime ?? "");
        if (start === null || end === null) continue;
        candidates.push({
          absoluteMinutes: Math.max(currentMinutes, dayOffset * 1440 + start),
          departure: {
            departureTime: `${minutesToTime(start)}–${minutesToTime(end)}`,
            minutes: wait,
            dayOffset: dayOffset + Math.floor(start / 1440),
            realtime: false,
            kind: "frequency",
            timeBasis: schedule.timeBasis,
            ...(schedule.originStopNameZh
              ? { originStopNameZh: schedule.originStopNameZh }
              : {}),
            ...(schedule.originStopNameEn
              ? { originStopNameEn: schedule.originStopNameEn }
              : {}),
            frequency: schedule.frequency,
          },
        });
        continue;
      }

      const stopTimes = stopTimesFor(schedule, stopId, stop);
      if (!stopTimes) continue;
      for (const value of stopTimes.times) {
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
            timeBasis: stopTimes.timeBasis,
            ...(schedule.originStopNameZh
              ? { originStopNameZh: schedule.originStopNameZh }
              : {}),
            ...(schedule.originStopNameEn
              ? { originStopNameEn: schedule.originStopNameEn }
              : {}),
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
  route: CityBusStaticRoute,
  directionId: string,
  stopId: string,
  now: Date,
): "scheduled" | "no_timetable" | "no_service" {
  const direction = findDirection(route, directionId);
  const stop = direction?.stops.find((item) => item.id === stopId);
  if (!direction || !stop || direction.schedules.length === 0)
    return "no_timetable";
  const hasDaySchedule = [-1, 0, 1, 2, 3, 4, 5, 6, 7].some((dayOffset) => {
    const day = taipeiClock(now, dayOffset).weekday;
    const date = taipeiClock(now, dayOffset).date;
    return direction.schedules.some((schedule) =>
      scheduleRunsOn(schedule, day, date),
    );
  });
  if (!hasDaySchedule) return "no_timetable";
  return getNextScheduledDepartures(route, directionId, stopId, now, 1).length
    ? "scheduled"
    : "no_service";
}

export function normalizeTdxEtas(
  records: TdxEtaRecord[],
  now: Date,
  limit = 5,
): CityBusDeparture[] {
  const normalized = records
    .map((record): CityBusDeparture | null => {
      const seconds = record.EstimateTime;
      if (
        typeof seconds !== "number" ||
        !Number.isFinite(seconds) ||
        seconds < 0
      )
        return null;
      const arrival = new Date(now.getTime() + seconds * 1000);
      const clock = taipeiClock(arrival);
      return {
        departureTime: clock.time,
        minutes: Math.ceil(seconds / 60),
        dayOffset: 0,
        realtime: true,
        arrivalAt: arrival.toISOString(),
        ...(seconds < 60 ? { status: "approaching" as const } : {}),
        ...(record.UpdateTime ? { updatedAt: record.UpdateTime } : {}),
      };
    })
    .filter((departure): departure is CityBusDeparture => departure !== null)
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));

  const seen = new Set<string>();
  return normalized
    .filter((departure) => {
      const key = `${departure.departureTime}:${departure.minutes}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function findCityBusDirection(
  route: CityBusStaticRoute,
  directionId: string,
) {
  return findDirection(route, directionId);
}

export function findCityBusStop(
  route: CityBusStaticRoute,
  directionId: string,
  stopId: string,
) {
  return findDirection(route, directionId)?.stops.find(
    (stop) => stop.id === stopId,
  );
}

export { minutesToTime };
