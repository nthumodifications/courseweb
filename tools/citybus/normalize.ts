export const SERVICE_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type ServiceDay = (typeof SERVICE_DAYS)[number];
export type ScheduleKind = "timetable" | "frequency";
export type TimeBasis = "stop" | "origin";

export interface NormalizedSpecialDay {
  dates?: string[];
  startDate?: string;
  endDate?: string;
  serviceStatus: number;
  descriptionZh?: string;
}

export interface NormalizedSchedule {
  kind: ScheduleKind;
  serviceDays: Record<ServiceDay, boolean>;
  timesByStop: Record<string, string[]>;
  timeBasis: TimeBasis;
  originStopId?: string;
  originStopNameZh?: string;
  originStopNameEn?: string;
  frequency?: {
    startTime: string;
    endTime: string;
    headwayMinutes: number;
  };
  specialDays: NormalizedSpecialDay[];
}

export const HSINCHU_CITY_BOUNDS = {
  minLat: 24.7,
  maxLat: 24.88,
  minLon: 120.9,
  maxLon: 121.06,
} as const;

export function isHsinchuCityStop(stop: AnyRecord) {
  const city = stop.City ?? stop.StopCity ?? stop.StopAddress?.City;
  if (typeof city === "string" && city.trim()) return city.includes("新竹市");
  const lat = Number(stop.StopPosition?.PositionLat);
  const lon = Number(stop.StopPosition?.PositionLon);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= HSINCHU_CITY_BOUNDS.minLat &&
    lat <= HSINCHU_CITY_BOUNDS.maxLat &&
    lon >= HSINCHU_CITY_BOUNDS.minLon &&
    lon <= HSINCHU_CITY_BOUNDS.maxLon
  );
}

export function routeHasHsinchuCityStop(row: AnyRecord) {
  return (row.Stops ?? []).some((stop: AnyRecord) => isHsinchuCityStop(stop));
}

export function normalizeTime(value: unknown) {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 47 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeServiceDays(
  value: Record<string, unknown> | undefined,
): Record<ServiceDay, boolean> {
  return Object.fromEntries(
    SERVICE_DAYS.map((day) => [
      day,
      value?.[day] === 1 || value?.[day] === true,
    ]),
  ) as Record<ServiceDay, boolean>;
}

function stopName(stop: AnyRecord | undefined, language: "Zh_tw" | "En") {
  return stop?.StopName?.[language];
}

function normalizeSpecialDays(value: unknown): NormalizedSpecialDay[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: AnyRecord) => ({
    ...(Array.isArray(item.Dates) ? { dates: item.Dates } : {}),
    ...(item.DatePeriod?.StartDate
      ? { startDate: item.DatePeriod.StartDate }
      : {}),
    ...(item.DatePeriod?.EndDate ? { endDate: item.DatePeriod.EndDate } : {}),
    serviceStatus: Number(item.ServiceStatus ?? 0),
    ...(item.Description ? { descriptionZh: item.Description } : {}),
  }));
}

function normalizeStopTimes(stopTimes: AnyRecord[]) {
  const timesByStop: Record<string, string[]> = {};
  const ordered = [...stopTimes].sort(
    (a, b) => Number(a.StopSequence ?? 0) - Number(b.StopSequence ?? 0),
  );
  for (const stopTime of ordered) {
    const time = normalizeTime(stopTime.DepartureTime ?? stopTime.ArrivalTime);
    if (!time || !stopTime.StopUID) continue;
    timesByStop[stopTime.StopUID] ??= [];
    if (!timesByStop[stopTime.StopUID].includes(time)) {
      timesByStop[stopTime.StopUID].push(time);
    }
  }
  return { timesByStop, ordered };
}

function findHeadwayMinutes(value: AnyRecord) {
  const raw =
    value.HeadwaySecs ??
    value.HeadwaySeconds ??
    value.HeadwaySec ??
    value.Headway ??
    value.Interval ??
    value.Frequency;
  const number = Number(raw);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return number > 60 ? number / 60 : number;
}

export function normalizeTimetable(
  timetable: AnyRecord,
  fallbackStops: AnyRecord[] = [],
): NormalizedSchedule {
  const { timesByStop, ordered } = normalizeStopTimes(
    timetable.StopTimes ?? [],
  );
  const originTime = ordered[0];
  const origin =
    fallbackStops.find((stop) => stop.StopUID === originTime?.StopUID) ??
    originTime ??
    fallbackStops[0];
  return {
    kind: "timetable",
    serviceDays: normalizeServiceDays(timetable.ServiceDay),
    timesByStop,
    timeBasis: ordered.length > 1 ? "stop" : "origin",
    ...(origin?.StopUID ? { originStopId: origin.StopUID } : {}),
    ...(stopName(origin, "Zh_tw")
      ? { originStopNameZh: stopName(origin, "Zh_tw") }
      : {}),
    ...(stopName(origin, "En")
      ? { originStopNameEn: stopName(origin, "En") }
      : {}),
    specialDays: normalizeSpecialDays(timetable.SpecialDays),
  };
}

export function normalizeFrequency(
  frequency: AnyRecord,
  fallbackStops: AnyRecord[] = [],
): NormalizedSchedule | undefined {
  const startTime = normalizeTime(frequency.StartTime);
  const endTime = normalizeTime(frequency.EndTime);
  const headwayMinutes = findHeadwayMinutes(frequency);
  if (!startTime || !endTime || !headwayMinutes) return undefined;
  const stopId = frequency.StopUID ?? frequency.StopID;
  const origin = fallbackStops[0];
  return {
    kind: "frequency",
    serviceDays: normalizeServiceDays(frequency.ServiceDay),
    timesByStop: {},
    timeBasis: stopId ? "stop" : "origin",
    ...(stopId
      ? { originStopId: stopId }
      : origin?.StopUID
        ? { originStopId: origin.StopUID }
        : {}),
    ...(stopName(origin, "Zh_tw")
      ? { originStopNameZh: stopName(origin, "Zh_tw") }
      : {}),
    ...(stopName(origin, "En")
      ? { originStopNameEn: stopName(origin, "En") }
      : {}),
    frequency: { startTime, endTime, headwayMinutes },
    specialDays: normalizeSpecialDays(frequency.SpecialDays),
  };
}

export function normalizeScheduleRecords(
  records: AnyRecord[],
  fallbackStops: AnyRecord[] = [],
) {
  return records.flatMap((record) => [
    ...(record.Timetables ?? []).map((item: AnyRecord) =>
      normalizeTimetable(item, fallbackStops),
    ),
    ...(record.Frequencys ?? [])
      .map((item: AnyRecord) => normalizeFrequency(item, fallbackStops))
      .filter(
        (item: NormalizedSchedule | undefined): item is NormalizedSchedule =>
          Boolean(item),
      ),
  ]);
}

export type AnyRecord = Record<string, any>;
