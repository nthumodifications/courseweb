import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import useDictionary from "@/dictionaries/useDictionary";
import { getTimeOnDate } from "@/helpers/bus";
import { useSettings } from "@/hooks/contexts/settings";
import { contentLanguage } from "@/helpers/contentLanguage";
import useTime from "@/hooks/useTime";
import {
  addMinutes,
  formatDate,
  isSameMinute,
  subMinutes,
  isWeekend,
  format,
  startOfMinute,
  differenceInMinutes,
  getDay,
} from "date-fns";
import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { getAllBusData } from "@/libs/bus";
import { useQuery } from "@tanstack/react-query";
import CityBusDetails from "./CityBusDetails";
import { useBusPins, type CampusBusPin } from "@/features/bus/busPins";
import {
  BusLineHeader,
  BusStationState,
  BusStopTimeline,
} from "@/features/bus/BusLineDetailShared";
import {
  campusBusStopId,
  findCampusBusStopIndex,
  withCampusBusStopIds,
} from "@/features/bus/campusBusStop";
import { linesDict } from "@/features/bus/campusBusLines";
import { getSingleSearchParam } from "@/lib/deep-links/search-params";
export { linesDict } from "@/features/bus/campusBusLines";

const CampusLineDisplayPage = () => {
  const { line } = useParams() as { line: string };
  const [searchParams] = useSearchParams();
  const time = useTime();
  const lineData = linesDict[line] as (typeof linesDict)["green_up"];

  // If line is "nanda", we want to show both route1 and route2 combined
  const isNandaCombined = line === "nanda";

  const { language } = useSettings();
  const contentLang = contentLanguage(language);
  const dict = useDictionary();
  const { pinned, toggle } = useBusPins();
  const returnUrl =
    getSingleSearchParam(searchParams, "return_url") ?? `/${language}/bus`;
  const campusLine =
    line === "red" || line === "green"
      ? line
      : line.startsWith("route1")
        ? "route1"
        : line.startsWith("route2")
          ? "route2"
          : undefined;
  const campusPin: CampusBusPin | undefined = campusLine
    ? {
        kind: "campus",
        line: campusLine,
        direction: line.endsWith("_down") ? "down" : "up",
      }
    : undefined;

  const weektype = isWeekend(time) ? "weekend" : "weekday";

  const { data: busData } = useQuery({
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
            const hasMatchingUpBus = busses.some(
              (b) =>
                b.direction == "up" &&
                isSameMinute(
                  getTimeOnDate(time, b.time),
                  subMinutes(getTimeOnDate(time, bus.time), 7),
                ),
            );
            if (hasMatchingUpBus) return false;
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
            const hasMatchingUpBus = busses.some(
              (b) =>
                b.direction == "up" &&
                isSameMinute(
                  getTimeOnDate(time, b.time),
                  subMinutes(getTimeOnDate(time, bus.time), 7),
                ),
            );
            if (hasMatchingUpBus) return false;
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
          const startIndex = 0;
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
    return (
      contentLang == "zh" ? lineData.stations_zh : lineData.stations_en
    ).map((station, i) => {
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
    });
  }, [time, busOfInterest, contentLang]);

  const activeStopIndex = findCampusBusStopIndex(
    getSingleSearchParam(searchParams, "stop"),
    lineData.stations_zh,
    lineData.stations_en,
    displayText.map((item) => item.state === BusStationState.LEFT),
  );

  if (!(line in linesDict) && !isNandaCombined) {
    return <div>{dict.bus.invalid_line}</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      <BusLineHeader
        returnUrl={returnUrl}
        title={
          isNandaCombined
            ? contentLang == "zh"
              ? "南大校車 經台積館 & 經教育學院"
              : "Nanda Via TSMC & COE"
            : contentLang == "zh"
              ? lineData.title_zh
              : lineData.title_en
        }
        icon={
          isNandaCombined ? (
            <>
              <Route1LineIcon />
              <Route2LineIcon />
            </>
          ) : (
            <lineData.Icon />
          )
        }
        pinned={campusPin ? pinned(campusPin) : undefined}
        onTogglePin={campusPin ? () => toggle(campusPin) : undefined}
      />
      <BusStopTimeline
        activeId={
          activeStopIndex === undefined
            ? undefined
            : campusBusStopId(activeStopIndex)
        }
        items={withCampusBusStopIds(displayText).map((m) => ({
          id: m.id,
          state: m.state,
          station: m.station,
          time: m.time,
          lineIcon:
            isNandaCombined && m.bus && "type" in m.bus ? (
              m.bus.type === "route1" ? (
                <Route1LineIcon width={15} height={15} />
              ) : m.bus.type === "route2" ? (
                <Route2LineIcon width={15} height={15} />
              ) : undefined
            ) : undefined,
        }))}
      />
    </div>
  );
};

const LineDisplayPage = () => {
  const { route, line } = useParams() as { route: string; line: string };
  if (route === "city") return <CityBusDetails routeId={line} />;
  return <CampusLineDisplayPage />;
};

export default LineDisplayPage;
