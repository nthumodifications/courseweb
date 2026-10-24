import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import type { FC } from "react";

export type CampusBusLine = {
  Icon: FC;
  title_zh: string;
  title_en: string;
  stations_zh: string[];
  stations_en: string[];
  timings: number[];
};

export const linesDict: Record<string, CampusBusLine> = {
  //up
  // (紅線)北校門口 → 綜二館 → 楓林小徑 → 人社院/生科院 → 台積館
  // (綠線) 北校門口 → 綜二館 → 楓林小徑 → 奕園停車場 → 南門停車場 → 台積館"
  // (Red Line) North Main Gate → General Building II → Maple Path → CHSS/CLS Building → TSMC Building
  // (Green Line) North Main Gate → General Building II → Maple Path → Yi Pavilion Parking Lot → South Gate Parking Lot → TSMC Building"
  //down
  // (紅線) 台積館 → 南門停車場 → 奕園停車場 → 楓林小徑 → 綜二館 → 北校門口
  // (綠線) 台積館 → 人社院/生科院 → 楓林小徑 → 綜二館 → 北校門口",
  // (Red Line) TSMC Building → South Gate Parking Lot → Yi Pavilion Parking Lot → Maple Path → General Building II → North Main Gate
  // (Green Line) TSMC Building → CHSS/CLS Building → Maple Path → General Building II → North Main Gate"
  green: {
    Icon: GreenLineIcon,
    title_zh: "綠線",
    title_en: "Green Line",
    stations_zh: [
      "北校門口",
      "綜二",
      "楓林小徑",
      "奕園停車場",
      "南門停車場",
      "台積館",
      "人社院/生科院",
      "綜二",
      "北校門口",
    ],
    stations_en: [
      "North Main Gate",
      "General Building II",
      "Maple Path",
      "Yi Pavilion Parking Lot",
      "South Gate Parking Lot",
      "TSMC Building",
      "CHSS/CLS Building",
      "General Building II",
      "North Main Gate",
    ],
    timings: [1, 2, 2, 1, 1, 2, 4, 1],
  },
  red: {
    Icon: RedLineIcon,
    title_zh: "紅線",
    title_en: "Red Line",
    stations_zh: [
      "北校門口",
      "綜二",
      "楓林小徑",
      "人社院/生科院",
      "台積館",
      "南門停車場",
      "奕園停車場",
      "綜二",
      "北校門口",
    ],
    stations_en: [
      "North Main Gate",
      "General Building II",
      "Maple Path",
      "CHSS/CLS Building",
      "TSMC Building",
      "South Gate Parking Lot",
      "Yi Pavilion Parking Lot",
      "General Building II",
      "North Main Gate",
    ],
    timings: [1, 2, 3, 2, 1, 1, 3, 1],
  },
  nanda_up: {
    Icon: NandaLineIcon,
    title_zh: "南大校車 往南大校區",
    title_en: "Nanda Line To Nanda",
    stations_zh: ["北校門口", "綜二", "人社院/生科院", "台積館", "南大校區"],
    stations_en: [
      "North Main Gate",
      "General Building II",
      "CHSS/CLS Building",
      "TSMC Building",
      "Nanda Campus",
    ],
    timings: [1, 3, 2, 10],
  },
  nanda_down: {
    Icon: NandaLineIcon,
    title_zh: "南大校車 往校本部",
    title_en: "Nanda Line to Main Campus",
    stations_zh: ["南大校區", "台積館", "人社院/生科院", "綜二", "北校門口"],
    stations_en: [
      "Nanda Campus",
      "TSMC Building",
      "CHSS/CLS Building",
      "General Building II",
      "North Main Gate",
    ],
    timings: [10, 2, 3, 1],
  },
  route1_up: {
    Icon: Route1LineIcon,
    title_zh: "經台積館 往南大校區",
    title_en: "Via TSMC Building To Nanda",
    stations_zh: [
      "北校門口",
      "綜二",
      "人社院/生科院",
      "台積館(經寶山路)",
      "南大校區",
    ],
    stations_en: [
      "North Main Gate",
      "General Building II",
      "CHSS/CLS Building",
      "TSMC Building(Baoshan Rd.)",
      "Nanda Campus",
    ],
    timings: [1, 3, 2, 10],
  },
  route1_down: {
    Icon: Route1LineIcon,
    title_zh: "經台積館 往校本部",
    title_en: "Via TSMC Building to Main Campus",
    stations_zh: [
      "南大校區",
      "台積館(經寶山路)",
      "人社院/生科院",
      "綜二",
      "北校門口",
    ],
    stations_en: [
      "Nanda Campus",
      "TSMC Building(Baoshan Rd.)",
      "CHSS/CLS Building",
      "General Building II",
      "North Main Gate",
    ],
    timings: [10, 2, 3, 1],
  },
  route2_up: {
    Icon: Route2LineIcon,
    title_zh: "經教育學院 往南大校區",
    title_en: "Via COE Building To Nanda",
    stations_zh: [
      "北校門口",
      "綜二",
      "奕園停車場",
      "教育學院大樓/南門停車場(經寶山路)",
      "南大校區",
    ],
    stations_en: [
      "North Main Gate",
      "General Building II",
      "Yi Pavilion Parking Lot",
      "COE Building/South Gate Parking Lot(Baoshan Rd.)",
      "Nanda Campus",
    ],
    timings: [1, 2, 1, 10],
  },
  route2_down: {
    Icon: Route2LineIcon,
    title_zh: "經教育學院 往校本部",
    title_en: "Via COE Building to Main Campus",
    stations_zh: [
      "南大校區",
      "教育學院大樓/南門停車場(經寶山路)",
      "奕園停車場",
      "綜二",
      "北校門口",
    ],
    stations_en: [
      "Nanda Campus",
      "COE Building/South Gate Parking Lot(Baoshan Rd.)",
      "Yi Pavilion Parking Lot",
      "General Building II",
      "North Main Gate",
    ],
    timings: [10, 1, 2, 1],
  },
};
