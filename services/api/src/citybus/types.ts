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
export type CityBusCategory = "pilot" | "city" | "intercity";

export interface CityBusSource {
  name: string;
  url: string;
  license: string;
  attribution: string;
}

export interface CityBusStaticStop {
  id: string;
  nameZh: string;
  nameEn: string;
  sequence: number;
  nearCampus: boolean;
  position?: { lat: number; lon: number };
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

export interface CityBusStaticDirection {
  id: string;
  labelZh: string;
  labelEn: string;
  originZh: string;
  originEn: string;
  destinationZh: string;
  destinationEn: string;
  stops: CityBusStaticStop[];
  schedules: CityBusSchedule[];
}

export interface CityBusStaticRoute {
  id: string;
  source: "city" | "intercity";
  category: CityBusCategory;
  tdxRouteUid: string;
  tdxRouteName: string;
  nameZh: string;
  nameEn: string;
  operatorZh?: string;
  operatorEn?: string;
  timesUrl?: string;
  generatedAt: string;
  sourceInfo: CityBusSource;
  directions: CityBusStaticDirection[];
}

export interface CityBusStaticData {
  version: number;
  generatedAt: string;
  source: CityBusSource;
  routes: CityBusStaticRoute[];
}

export interface CityBusDirectionSummary {
  id: string;
  labelZh: string;
  labelEn: string;
  destinationZh: string;
  destinationEn: string;
  campusStops: Array<{ id: string; nameZh: string; nameEn: string }>;
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

export type CityBusScheduleStatus = "scheduled" | "no_timetable" | "no_service";

export interface CityBusDeparturesResponse {
  source: CityBusSource;
  routeId: string;
  directionId: string;
  stopId: string;
  realtime: boolean;
  status: CityBusScheduleStatus;
  departures: CityBusDeparture[];
}

export interface TdxEtaRecord {
  RouteUID?: string;
  RouteID?: string;
  SubRouteUID?: string;
  SubRouteID?: string;
  StopUID?: string;
  StopID?: string;
  StopName?: { Zh_tw?: string; En?: string };
  EstimateTime?: number | null;
  StopCountDown?: number | null;
  StopStatus?: number;
  Direction?: number;
  NextBusTime?: string | null;
  PlateNumb?: string | null;
  SrcUpdateTime?: string;
  UpdateTime?: string;
  DataTime?: string;
  IsLastBus?: boolean;
}

export interface TdxNearStopRecord {
  RouteUID?: string;
  RouteID?: string;
  SubRouteUID?: string;
  SubRouteID?: string;
  StopUID?: string;
  StopID?: string;
  PlateNumb?: string | null;
  Direction?: number;
  EventType?: string | number | null;
  A2EventType?: string | number | null;
  Event?: string | number | null;
  BusStatus?: string | number | null;
  SrcUpdateTime?: string;
  UpdateTime?: string;
  DataTime?: string;
}
