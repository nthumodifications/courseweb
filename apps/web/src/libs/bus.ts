import client from "@/config/api";

export interface MainBusDepartureDetails {
  time: string;
  description: string;
  route: "校園公車";
  dep_stop: string;
  line: string;
}

export interface NandaBusDepartureDetails {
  time: string;
  description: string;
  route: "南大區間車";
  type?: "route1" | "route2";
}

export type BusDepartureDetails =
  | MainBusDepartureDetails
  | NandaBusDepartureDetails;

export type LineInfo = {
  direction: string;
  duration: string;
  route: string;
  routeEN: string;
};

export interface CompleteBusData {
  main: {
    toward_TSMC_building_info: LineInfo;
    toward_main_gate_info: LineInfo;
    weekday: {
      toward_TSMC_building: MainBusDepartureDetails[];
      toward_main_gate: MainBusDepartureDetails[];
    };
    weekend: {
      toward_TSMC_building: MainBusDepartureDetails[];
      toward_main_gate: MainBusDepartureDetails[];
    };
  };
  nanda: {
    toward_south_campus_info: LineInfo;
    toward_main_campus_info: LineInfo;
    weekday: {
      toward_south_campus: NandaBusDepartureDetails[];
      toward_main_campus: NandaBusDepartureDetails[];
    };
    weekend: {
      toward_south_campus: NandaBusDepartureDetails[];
      toward_main_campus: NandaBusDepartureDetails[];
    };
  };
}

export type BusesSchedules = MainBusDepartureDetails | NandaBusDepartureDetails;

// Main function to get all bus data at once
export const getAllBusData = async (): Promise<CompleteBusData> => {
  const response = await client.bus.$get();

  if (!response.ok) {
    throw new Error("Failed to fetch bus data");
  }

  const data = await response.json();
  return data as CompleteBusData;
};

// Legacy function for filtered bus schedules (uses new API internally)
export const getBusesSchedules = async (
  bus_type: "all" | "main" | "nanda" | "red" | "green" | "route1" | "route2",
  day: "all" | "weekday" | "weekend" | "current",
  direction: "up" | "down",
): Promise<BusesSchedules[]> => {
  const response = await client.bus["schedules"].$get({
    query: {
      bus_type,
      day,
      direction,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch bus schedules");
  }

  const data = await response.json();
  return data as BusesSchedules[];
};

// Specific functions for different route types
export const getMainBuses = async (): Promise<{
  toward_TSMC_building_info: LineInfo;
  weekday_bus_schedule_toward_TSMC_building: MainBusDepartureDetails[];
  weekend_bus_schedule_toward_TSMC_building: MainBusDepartureDetails[];
  toward_main_gate_info: LineInfo;
  weekday_bus_schedule_toward_main_gate: MainBusDepartureDetails[];
  weekend_bus_schedule_toward_main_gate: MainBusDepartureDetails[];
}> => {
  const data = await getAllBusData();

  return {
    toward_TSMC_building_info: data.main.toward_TSMC_building_info,
    weekday_bus_schedule_toward_TSMC_building:
      data.main.weekday.toward_TSMC_building,
    weekend_bus_schedule_toward_TSMC_building:
      data.main.weekend.toward_TSMC_building,
    toward_main_gate_info: data.main.toward_main_gate_info,
    weekday_bus_schedule_toward_main_gate: data.main.weekday.toward_main_gate,
    weekend_bus_schedule_toward_main_gate: data.main.weekend.toward_main_gate,
  };
};

export const getNandaBuses = async (): Promise<{
  toward_south_campus_info: LineInfo;
  weekday_bus_schedule_toward_south_campus: NandaBusDepartureDetails[];
  weekend_bus_schedule_toward_south_campus: NandaBusDepartureDetails[];
  toward_main_campus_info: LineInfo;
  weekday_bus_schedule_toward_main_campus: NandaBusDepartureDetails[];
  weekend_bus_schedule_toward_main_campus: NandaBusDepartureDetails[];
}> => {
  const data = await getAllBusData();

  return {
    toward_south_campus_info: data.nanda.toward_south_campus_info,
    weekday_bus_schedule_toward_south_campus:
      data.nanda.weekday.toward_south_campus,
    weekend_bus_schedule_toward_south_campus:
      data.nanda.weekend.toward_south_campus,
    toward_main_campus_info: data.nanda.toward_main_campus_info,
    weekday_bus_schedule_toward_main_campus:
      data.nanda.weekday.toward_main_campus,
    weekend_bus_schedule_toward_main_campus:
      data.nanda.weekend.toward_main_campus,
  };
};

export const getRoute1Buses = async (): Promise<{
  toward_south_campus_info: LineInfo;
  weekday_bus_schedule_toward_south_campus: (NandaBusDepartureDetails & {
    type: "route1";
  })[];
  weekend_bus_schedule_toward_south_campus: (NandaBusDepartureDetails & {
    type: "route1";
  })[];
  toward_main_campus_info: LineInfo;
  weekday_bus_schedule_toward_main_campus: (NandaBusDepartureDetails & {
    type: "route1";
  })[];
  weekend_bus_schedule_toward_main_campus: (NandaBusDepartureDetails & {
    type: "route1";
  })[];
}> => {
  const data = await getAllBusData();

  return {
    toward_south_campus_info: {
      ...data.nanda.toward_south_campus_info,
      route: "經台積館",
      routeEN: "Via TSMC Building",
    },
    weekday_bus_schedule_toward_south_campus:
      data.nanda.weekday.toward_south_campus.filter(
        (bus) => bus.type === "route1",
      ) as (NandaBusDepartureDetails & { type: "route1" })[],
    weekend_bus_schedule_toward_south_campus:
      data.nanda.weekend.toward_south_campus.filter(
        (bus) => bus.type === "route1",
      ) as (NandaBusDepartureDetails & { type: "route1" })[],
    toward_main_campus_info: {
      ...data.nanda.toward_main_campus_info,
      route: "經台積館",
      routeEN: "Via TSMC Building",
    },
    weekday_bus_schedule_toward_main_campus:
      data.nanda.weekday.toward_main_campus.filter(
        (bus) => bus.type === "route1",
      ) as (NandaBusDepartureDetails & { type: "route1" })[],
    weekend_bus_schedule_toward_main_campus:
      data.nanda.weekend.toward_main_campus.filter(
        (bus) => bus.type === "route1",
      ) as (NandaBusDepartureDetails & { type: "route1" })[],
  };
};

export const getRoute2Buses = async (): Promise<{
  toward_south_campus_info: LineInfo;
  weekday_bus_schedule_toward_south_campus: (NandaBusDepartureDetails & {
    type: "route2";
  })[];
  weekend_bus_schedule_toward_south_campus: (NandaBusDepartureDetails & {
    type: "route2";
  })[];
  toward_main_campus_info: LineInfo;
  weekday_bus_schedule_toward_main_campus: (NandaBusDepartureDetails & {
    type: "route2";
  })[];
  weekend_bus_schedule_toward_main_campus: (NandaBusDepartureDetails & {
    type: "route2";
  })[];
}> => {
  const data = await getAllBusData();

  return {
    toward_south_campus_info: {
      ...data.nanda.toward_south_campus_info,
      route: "經教育學院",
      routeEN: "Via COE Building",
    },
    weekday_bus_schedule_toward_south_campus:
      data.nanda.weekday.toward_south_campus.filter(
        (bus) => bus.type === "route2",
      ) as (NandaBusDepartureDetails & { type: "route2" })[],
    weekend_bus_schedule_toward_south_campus:
      data.nanda.weekend.toward_south_campus.filter(
        (bus) => bus.type === "route2",
      ) as (NandaBusDepartureDetails & { type: "route2" })[],
    toward_main_campus_info: {
      ...data.nanda.toward_main_campus_info,
      route: "經教育學院",
      routeEN: "Via COE Building",
    },
    weekday_bus_schedule_toward_main_campus:
      data.nanda.weekday.toward_main_campus.filter(
        (bus) => bus.type === "route2",
      ) as (NandaBusDepartureDetails & { type: "route2" })[],
    weekend_bus_schedule_toward_main_campus:
      data.nanda.weekend.toward_main_campus.filter(
        (bus) => bus.type === "route2",
      ) as (NandaBusDepartureDetails & { type: "route2" })[],
  };
};

// Utility functions for filtering and processing bus data
export const filterBusesByType = (
  buses: NandaBusDepartureDetails[],
  type: "route1" | "route2" | undefined,
): NandaBusDepartureDetails[] => {
  return buses.filter((bus) => bus.type === type);
};

export const filterBusesByLine = (
  buses: MainBusDepartureDetails[],
  line: "red" | "green",
): MainBusDepartureDetails[] => {
  return buses.filter((bus) => bus.line === line);
};

export const getCurrentDayBuses = (
  weekdayBuses: BusDepartureDetails[],
  weekendBuses: BusDepartureDetails[],
  isWeekend: boolean,
): BusDepartureDetails[] => {
  return isWeekend ? weekendBuses : weekdayBuses;
};
