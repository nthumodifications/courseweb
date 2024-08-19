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

type GetMainBusesAPIResponse = {
  toward_TSMC_building_info: LineInfo;
  weekday_bus_schedule_toward_TSMC_building: MainBusDepartureDetails[];
  weekend_bus_schedule_toward_TSMC_building: MainBusDepartureDetails[];
  toward_main_gate_info: LineInfo;
  weekday_bus_schedule_toward_main_gate: MainBusDepartureDetails[];
  weekend_bus_schedule_toward_main_gate: MainBusDepartureDetails[];
};

export const getMainBuses = async () => {
  const res = await fetch(`https://api.nthusa.tw/buses/main`);

  if (!res.ok) {
    const data = await fetch(
      `https://nthumods.com/fallback_data/bus/main.json`,
    );
    return (await data.json()) as GetMainBusesAPIResponse;
  }

  const data = await res.json();
  return data as GetMainBusesAPIResponse;
};

type GetNandaBusesAPIResponse = {
  toward_south_campus_info: LineInfo;
  weekday_bus_schedule_toward_south_campus: NandaBusDepartureDetails[];
  weekend_bus_schedule_toward_south_campus: NandaBusDepartureDetails[];
  toward_main_campus_info: LineInfo;
  weekday_bus_schedule_toward_main_campus: NandaBusDepartureDetails[];
  weekend_bus_schedule_toward_main_campus: NandaBusDepartureDetails[];
};

export const getNandaBuses = async () => {
  const res = await fetch(`https://api.nthusa.tw/buses/nanda`);

  if (!res.ok) {
    const data = await fetch(
      `https://nthumods.com/fallback_data/bus/nanda.json`,
    );
    return (await data.json()) as GetNandaBusesAPIResponse;
  }

  const data = await res.json();
  return data as GetNandaBusesAPIResponse;
};
