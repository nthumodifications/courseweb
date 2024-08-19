import { BusScheduleDefinition } from "@/config/supabase";

export const busDays = ["SUN", "MON", "TUE", "WED", "THUR", "FRI", "SAT"];

export const stops: Stop[] = [
  { name_zh: "北校門口", name_en: "North Gate", code: "A1" },
  { name_zh: "綜二館", name_en: "Gen II Building", code: "A2" }, //U: 24.794102964063065 120.99366455591867 D: 24.793869207229896 120.9936484646421
  { name_zh: "楓林小徑", name_en: "Maple Path", code: "A3" }, //U: 24.79178595174722 120.99228853885859 D: 24.79279891185534 120.99247358853891
  { name_zh: "人社院/生科館", name_en: "CHSS/CLS Building", code: "A4" }, //U: 24.78944722415075 120.98962398000295 D: 24.789700469727617 120.99004235319325
  { name_zh: "南門停車場", name_en: "South Gate Parking Lot", code: "A5" }, //U: 24.786856297396717 120.98848686312672 D: 24.786768633515123 120.98888914504045
  { name_zh: "奕園停車場", name_en: "Yi Pav. Parking Lot", code: "A6" },
  { name_zh: "台積館", name_en: "TSMC Building", code: "A7" },
  { name_zh: "南大校區", name_en: "Nanda Campus", code: "A8" },
];

export interface Stop {
  name_zh: string;
  name_en: string;
  code: string;
}

export const routes: Route[] = [
  {
    title_zh: "綠 - 台積館",
    title_en: "Green - TSMC Build.",
    color: "#1CC34B",
    code: "GU",
    path: ["A1U", "A2U", "A3U", "A6U", "A5U", "A7D"],
  },
  {
    title_zh: "綠 - 台積館",
    title_en: "Green - TSMC Build.",
    color: "#1CC34B",
    code: "GUS",
    path: ["A2U", "A3U", "A6U", "A5U", "A7D"],
  },
  {
    title_zh: "綠 - 北校門口",
    title_en: "Green - North Gate",
    color: "#1CC34B",
    code: "GD",
    path: ["A7D", "A4D", "A3D", "A2D", "A1D"],
  },
  {
    title_zh: "綠 - 綜二館",
    title_en: "Green - GEN II Build.",
    color: "#1CC34B",
    code: "GDS",
    path: ["A7D", "A4D", "A3D", "A2D"],
  },
  {
    title_zh: "紅 - 台積館",
    title_en: "Red - TSMC Build.",
    color: "#E71212",
    code: "RU",
    path: ["A1U", "A2U", "A3U", "A4U", "A7U"],
  },
  {
    title_zh: "紅 - 台積館",
    title_en: "Red - TSMC Build.",
    color: "#E71212",
    code: "RUS",
    path: ["A2U", "A3U", "A4U", "A7U"],
  },
  {
    title_zh: "紅 - 北校門口",
    title_en: "Red - North Gate",
    color: "#E71212",
    code: "RD",
    path: ["A7U", "A5D", "A6D", "A3D", "A2D"],
  },
  {
    title_zh: "紅 - 綜二館",
    title_en: "Red - GEN II Build.",
    color: "#E71212",
    code: "RDS",
    path: ["A7U", "A5D", "A6D", "A3D", "A2D", "A1D"],
  },
  {
    title_zh: "往南大校區",
    title_en: "To Nanda Campus",
    color: "#1CC34B",
    code: "NG",
    path: ["A1U", "A2U", "A4U", "A7U", "A8"],
  },
  {
    title_zh: "往校本部",
    title_en: "To Main Campus",
    color: "#E71212",
    code: "NB",
    path: ["A8", "A7D", "A4D", "A2D", "A1D"],
  },
];

export interface Route {
  title_zh: string;
  title_en: string;
  color: string;
  code: string;
  path: string[];
}

export type ScheduleItem = {
  arrival: Date;
  route: Route;
} & BusScheduleDefinition;

export const getVehicleDescription = (vehicle: string) => {
  const vehicleTypes = {
    "83": "83公車 $",
    B: "遊覽車",
    S: "小巴",
  };
  if (!Object.keys(vehicleTypes).includes(vehicle)) return vehicle;
  return vehicleTypes[vehicle as keyof typeof vehicleTypes];
};
