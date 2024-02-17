import { BusScheduleDefinition } from "@/config/supabase";

export const busDays = ["SUN", "MON", "TUE", "WED", "THUR", "FRI", "SAT"];

export interface Stop {
    name_zh: string;
    name_en: string;
    code: string;
}

export const stops = [ "北校門口", "綜二館", "楓林小徑", "人社院&生科館", "台積館", "奕園停車場", "南門停車場", "南大校區校門口右側(食品路校牆邊)" ];
export type StopName = typeof stops[number];
export const stops_en = [ "North Gate", "Gen II Building", "Maple Path", "CHSS/CLS Building", "TSMC Building", "Yi Pav. Parking Lot", "South Gate Parking Lot", "Nanda Campus" ];
export const getStopEn = (stop: string) => {
    return stops_en[stops.indexOf(stop)];
}

export type BusDirection = "up" | "down";
export type BusRoute = "校園公車" | "南大區間車";
export type BusLine = "red" | "green";
export type BusDay = "weekday" | "weekend" | "current";

export interface BusStopArrival {
    bus_info: {
        "time": string
        "description": string
        "route": BusRoute,
        "dep_stop"?: string,
        "line"?: BusLine
    },
    arrive_time: string
}

export interface BusStopArrivalResponse extends Array<BusStopArrival> {};
