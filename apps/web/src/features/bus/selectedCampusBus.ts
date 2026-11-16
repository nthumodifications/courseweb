import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import { getTimeOnDate } from "@/helpers/bus";
import useDictionary from "@/dictionaries/useDictionary";
import type { CompleteBusData } from "@/libs/bus";
import type { BusListingItemProps } from "./BusListingItem";
import type { CampusBusPin } from "./busPins";

export function selectedCampusBus(
  pin: CampusBusPin,
  busData: CompleteBusData,
  time: Date,
  weektype: "weekday" | "weekend",
  dict: ReturnType<typeof useDictionary>,
): Omit<BusListingItemProps, "refTime"> {
  const mainDirection =
    pin.direction === "up" ? "toward_TSMC_building" : "toward_main_gate";
  const nandaDirection =
    pin.direction === "up" ? "toward_south_campus" : "toward_main_campus";
  const schedule =
    pin.line === "red" || pin.line === "green"
      ? busData.main[weektype][mainDirection].filter(
          (bus) => bus.route === "校園公車" && bus.line === pin.line,
        )
      : busData.nanda[weektype][nandaDirection].filter(
          (bus) => bus.type === pin.line,
        );
  const next = schedule
    .filter((bus) => getTimeOnDate(time, bus.time).getTime() >= time.getTime())
    .sort(
      (a, b) =>
        getTimeOnDate(time, a.time).getTime() -
        getTimeOnDate(time, b.time).getTime(),
    )[0];
  const lineTitle =
    pin.line === "red"
      ? dict.bus.red_line
      : pin.line === "green"
        ? dict.bus.green_line
        : pin.line === "route1"
          ? dict.bus.route1_line
          : dict.bus.route2_line;
  const isNanda = pin.line === "route1" || pin.line === "route2";
  const destination = isNanda
    ? pin.direction === "up"
      ? dict.bus.to_nanda
      : dict.bus.to_main_campus
    : undefined;

  return {
    tab: isNanda ? "nanda" : pin.direction === "up" ? "north_gate" : "tsmc",
    startTime: next?.time ?? "0:00",
    Icon:
      pin.line === "red"
        ? RedLineIcon
        : pin.line === "green"
          ? GreenLineIcon
          : pin.line === "route1"
            ? Route1LineIcon
            : Route2LineIcon,
    line: pin.line,
    direction: pin.direction,
    title: lineTitle,
    destination,
    notes: next?.description ? [next.description] : [],
    arrival: next?.time ?? dict.bus.service_over,
    pin,
  };
}

const defaultCampusPins: CampusBusPin[] = [
  { kind: "campus", line: "red", direction: "up" },
  { kind: "campus", line: "green", direction: "up" },
  { kind: "campus", line: "route1", direction: "up" },
  { kind: "campus", line: "route2", direction: "up" },
];

export function getUpcomingCampusBuses(
  busData: CompleteBusData,
  time: Date,
  weektype: "weekday" | "weekend",
  dict: ReturnType<typeof useDictionary>,
) {
  return defaultCampusPins
    .map((pin) => selectedCampusBus(pin, busData, time, weektype, dict))
    .filter((bus) => bus.arrival !== dict.bus.service_over)
    .sort(
      (a, b) =>
        getTimeOnDate(time, a.arrival).getTime() -
        getTimeOnDate(time, b.arrival).getTime(),
    );
}
