"use client";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { getTimeOnDate } from "@/helpers/bus";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { cn } from "@courseweb/ui";
import {
  addMinutes,
  formatDate,
  isSameMinute,
  subMinutes,
  isWeekend,
  subHours,
  format,
  endOfMinute,
  startOfMinute,
  differenceInMinutes,
  set,
  getDay,
} from "date-fns";
import { Bus, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { getAllBusData } from "@/libs/bus";
import { useQuery } from "@tanstack/react-query";

enum BusStationState {
  UNAVAILABLE,
  ARRIVING,
  AT_STATION,
  LEFT,
}

const linesDict: {
  [key: string]: {
    Icon: React.FC;
    title_zh: string;
    title_en: string;
    stations_zh: string[];
    stations_en: string[];
    timings: number[];
  };
} = {
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
      "South Gate Parking Lot",
      "Yi Pavilion Parking Lot",
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
      "Nanda Line",
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

const LineDisplayPage = () => {
  const { line } = useParams() as { line: string };
  const [searchParams] = useSearchParams();
  const time = useTime();
  const lineData = linesDict[line] as (typeof linesDict)["green_up"];

  // If line is "nanda", we want to show both route1 and route2 combined
  const isNandaCombined = line === "nanda";

  const { language } = useSettings();
  const dict = useDictionary();
  const returnUrl = searchParams.get("return_url") ?? `/${language}/bus`;

  const weektype = isWeekend(time) ? "weekend" : "weekday";

  const { data: busData, error } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const busOfInterest = useMemo(() => {
    if (!busData) return [];

    // get only busses that are still available 30 minutes ago
    const time30minAgo = subMinutes(time, 30);
    const currentMainData =
      weektype === "weekend" ? busData.main.weekend : busData.main.weekday;
    const currentNandaData =
      weektype === "weekend" ? busData.nanda.weekend : busData.nanda.weekday;

    const busses = [
      ...currentMainData.toward_TSMC_building.map((m) => ({
        ...m,
        direction: "up",
      })),
      ...currentMainData.toward_main_gate.map((m) => ({
        ...m,
        direction: "down",
      })),
      ...currentNandaData.toward_south_campus
        .filter(
          (bus) =>
            !(
              bus.description.includes("五") &&
              getDay(getTimeOnDate(time, bus.time)) == 5
            ),
        )
        .map((m) => ({
          ...m,
          direction: "up",
        })),
      ...currentNandaData.toward_main_campus.map((m) => ({
        ...m,
        direction: "down",
      })),
    ].filter((bus) => getTimeOnDate(time, bus.time) > time30minAgo);
    // then according to the line, filter out the busses that are not on the line
    if (line == "green")
      return busses
        .filter((bus) => bus.route == "校園公車" && bus.line == "green")
        .filter((bus) => {
          // remove duplicate down busses
          if (bus.direction == "down") {
            const upBus = busses.find(
              (b) =>
                b.direction == "up" &&
                isSameMinute(
                  getTimeOnDate(time, b.time),
                  subMinutes(getTimeOnDate(time, bus.time), 7),
                ),
            );
            if (upBus) return false;
          }
          return true;
        })
        .map((bus) => {
          // if direction is up, startIndex = 0, else startIndex = 5, find the current station the bus is at with startTime,
          const startIndex = bus.direction == "up" ? 0 : 5;
          const startTime = getTimeOnDate(time, bus.time);
          const stationIndex = lineData.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                lineData.timings
                  .slice(0, i - startIndex)
                  .reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            lineData.timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    if (line == "red")
      return busses
        .filter((bus) => bus.route == "校園公車" && bus.line == "red")
        .filter((bus) => {
          // remove duplicate down busses
          if (bus.direction == "down") {
            const upBus = busses.find(
              (b) =>
                b.direction == "up" &&
                isSameMinute(
                  getTimeOnDate(time, b.time),
                  subMinutes(getTimeOnDate(time, bus.time), 7),
                ),
            );
            if (upBus) return false;
          }
          return true;
        })
        .map((bus) => {
          const startIndex = bus.direction == "up" ? 0 : 5;
          const startTime = getTimeOnDate(time, bus.time);
          const stationIndex = lineData.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                lineData.timings
                  .slice(0, i - startIndex)
                  .reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            lineData.timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    if (line == "route1_up")
      return busses
        .filter(
          (bus) =>
            bus.route == "南大區間車" &&
            bus.direction == "up" &&
            "type" in bus &&
            bus.type == "route1",
        )
        .map((bus) => {
          const startIndex = 0;
          const startTime = getTimeOnDate(time, bus.time);
          const stationIndex = lineData.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                lineData.timings
                  .slice(0, i - startIndex)
                  .reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            lineData.timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    if (line == "route1_down")
      return busses
        .filter(
          (bus) =>
            bus.route == "南大區間車" &&
            bus.direction == "down" &&
            "type" in bus &&
            bus.type == "route1",
        )
        .map((bus) => {
          const startIndex = 0;
          const startTime = getTimeOnDate(time, bus.time);
          const stationIndex = lineData.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                lineData.timings
                  .slice(0, i - startIndex)
                  .reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            lineData.timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    if (line == "route2_up")
      return busses
        .filter(
          (bus) =>
            bus.route == "南大區間車" &&
            bus.direction == "up" &&
            "type" in bus &&
            bus.type == "route2",
        )
        .map((bus) => {
          const startIndex = 0;
          const startTime = getTimeOnDate(time, bus.time);
          const stationIndex = lineData.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                lineData.timings
                  .slice(0, i - startIndex)
                  .reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            lineData.timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    if (line == "route2_down")
      return busses
        .filter(
          (bus) =>
            bus.route == "南大區間車" &&
            bus.direction == "down" &&
            "type" in bus &&
            bus.type == "route2",
        )
        .map((bus) => {
          const startIndex = 0;
          const startTime = getTimeOnDate(time, bus.time);
          const stationIndex = lineData.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                lineData.timings
                  .slice(0, i - startIndex)
                  .reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            lineData.timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    if (line == "nanda")
      return busses
        .filter(
          (bus) =>
            bus.route == "南大區間車" &&
            "type" in bus &&
            (bus.type == "route1" || bus.type == "route2"),
        )
        .map((bus) => {
          const startIndex = bus.direction == "up" ? 0 : 0;
          const startTime = getTimeOnDate(time, bus.time);
          // Use route1 timing for both routes as they follow similar paths
          const timings = linesDict.route1_up.timings;
          const stationIndex = linesDict.route1_up.stations_zh.findIndex(
            (station, i) =>
              i >= startIndex &&
              addMinutes(
                startTime,
                timings.slice(0, i - startIndex).reduce((a, b) => a + b, 0),
              ) >= startOfMinute(time),
          );
          const stationDepTime = addMinutes(
            startTime,
            timings
              .slice(0, stationIndex - startIndex)
              .reduce((a, b) => a + b, 0),
          );
          return { ...bus, stationIndex, stationDepTime };
        })
        .filter((bus) => bus.stationIndex != -1);
    return [];
  }, [time, busData, line, lineData, weektype]);

  const displayText = useMemo<
    {
      state: BusStationState;
      station: string;
      time: string;
      bus?: (typeof busOfInterest)[number];
    }[]
  >(() => {
    return (language == "zh" ? lineData.stations_zh : lineData.stations_en).map(
      (station, i) => {
        // const stationDepTime = addMinutes(startDate, lineData.timings.slice(0, i).reduce((a, b) => a + b, 0));
        // if (time < stationDepTime) return { state: BusStationState.UNAVAILABLE, station, time: formatDate(stationDepTime, 'HH:mm') };
        // if (isSameMinute(time, stationDepTime)) return { state: BusStationState.AT_STATION, station, time: dict.bus.departing };
        // if (time > stationDepTime) return { state: BusStationState.LEFT, station, time: formatDate(stationDepTime, 'HH:mm') };
        // return { state: BusStationState.UNAVAILABLE, station, time: formatDate(stationDepTime, 'HH:mm') };

        // get nearest coming bus
        const bus = busOfInterest.find((bus) => bus.stationIndex == i);
        if (!bus) {
          // find the next bus that will arrive (offset by timing)
          const nextBus = busOfInterest.find((bus) => bus.stationIndex < i);
          if (nextBus) {
            const startTime = nextBus.stationDepTime;
            const stationDepTime = addMinutes(
              startTime,
              lineData.timings
                .slice(0, i - nextBus.stationIndex)
                .reduce((a, b) => a + b, 0),
            );
            const diffMin = differenceInMinutes(stationDepTime, time);
            return {
              state: BusStationState.UNAVAILABLE,
              station,
              time:
                diffMin < 8
                  ? `${diffMin} min`
                  : formatDate(stationDepTime, "HH:mm"),
              bus: bus,
            };
          }
        } else {
          if (bus.stationIndex == i) {
            const diffMin = differenceInMinutes(bus.stationDepTime, time);

            if (isSameMinute(time, bus.stationDepTime))
              return {
                state: BusStationState.AT_STATION,
                station,
                time: dict.bus.departing,
                bus: bus,
              };
            if (time < bus.stationDepTime)
              return {
                state: BusStationState.ARRIVING,
                station,
                time:
                  diffMin < 8
                    ? `${diffMin} min`
                    : formatDate(bus.stationDepTime, "HH:mm"),
                bus: bus,
              };
            if (time > bus.stationDepTime)
              return {
                state: BusStationState.LEFT,
                station,
                time: format(bus.stationDepTime, "HH:mm"),
                bus: bus,
              };
          }
        }
        return {
          state: BusStationState.UNAVAILABLE,
          station,
          time: bus?.time ?? "",
          bus,
        };
      },
    );
  }, [time, busOfInterest]);

  if (!(line in linesDict) && !isNandaCombined) return <div>Invalid Line</div>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center px-2 gap-4">
        <Button variant={"ghost"} asChild>
          <Link to={returnUrl}>
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Link>
        </Button>
        <div className="flex flex-row gap-4 items-center">
          {isNandaCombined ? (
            <>
              <Route1LineIcon />
              <Route2LineIcon />
              <h3 className="text-slate-800 dark:text-neutral-200 font-bold">
                {language == "zh"
                  ? "南大校車 經台積館 & 經教育學院"
                  : "Nanda Via TSMC & COE"}
              </h3>
            </>
          ) : (
            <>
              <lineData.Icon />
              <h3 className="text-slate-800 dark:text-neutral-200 font-bold">
                {language == "zh" ? lineData.title_zh : lineData.title_en}
              </h3>
            </>
          )}
        </div>
      </div>
      <div className="w-full items-start inline-flex px-4">
        <div className="w-full p-2 flex-col justify-start inline-flex">
          {isNandaCombined
            ? displayText.map((m, i) => (
                <div key={i} className={cn("items-stretch gap-4 inline-flex")}>
                  <div className="h-auto relative w-5">
                    <div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />
                    {m.state == BusStationState.ARRIVING && (
                      <div className="absolute top-[calc(-10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                        <Bus className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {m.state == BusStationState.AT_STATION && (
                      <div className="absolute top-[calc(50%-10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                        <Bus className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {m.state == BusStationState.LEFT && (
                      <div className="absolute top-[calc(100%+10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                        <Bus className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className="absolute left-[calc(50%-6px)] top-[calc(50%-6px)] w-3 h-3 bg-slate-200 rounded-full z-10" />
                    {i != displayText.length - 1 && (
                      <div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 py-4 justify-start items-center gap-2 flex border-b border-border",
                      m.state > BusStationState.AT_STATION ? "opacity-30" : "",
                    )}
                  >
                    <div className="text-slate-800 dark:text-slate-200 text-base font-bold">
                      {m.station}
                    </div>
                    <div className="flex-1 text-right flex items-center justify-end gap-2">
                      {m.bus && "type" in m.bus && (
                        <div className="text-slate-800 dark:text-neutral-200">
                          {m.bus.type === "route1" ? (
                            <Route1LineIcon width={15} height={15} />
                          ) : m.bus.type === "route2" ? (
                            <Route2LineIcon width={15} height={15} />
                          ) : null}
                        </div>
                      )}
                      <div
                        className={cn(
                          "text-base font-bold",
                          m.state == BusStationState.AT_STATION
                            ? "text-nthu-500"
                            : "text-slate-600 dark:text-slate-400",
                        )}
                      >
                        {m.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : displayText.map((m, i) => (
                <div key={i} className={cn("items-stretch gap-4 inline-flex")}>
                  <div className="h-auto relative w-5">
                    <div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />
                    {m.state == BusStationState.ARRIVING && (
                      <div className="absolute top-[calc(-10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                        <Bus className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {m.state == BusStationState.AT_STATION && (
                      <div className="absolute top-[calc(50%-10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                        <Bus className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {m.state == BusStationState.LEFT && (
                      <div className="absolute top-[calc(100%+10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                        <Bus className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className="absolute left-[calc(50%-6px)] top-[calc(50%-6px)] w-3 h-3 bg-slate-200 rounded-full z-10" />
                    {i != displayText.length - 1 && (
                      <div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-slate-200 z-10" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 py-4 justify-start items-center gap-2 flex border-b border-border",
                      m.state > BusStationState.AT_STATION ? "opacity-30" : "",
                    )}
                  >
                    <div className="text-slate-800 dark:text-slate-200 text-base font-bold">
                      {m.station}
                    </div>
                    <div
                      className={cn(
                        "flex-1 text-right text-base font-bold",
                        m.state == BusStationState.AT_STATION
                          ? "text-nthu-500"
                          : "text-slate-600 dark:text-slate-400",
                      )}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default LineDisplayPage;
