import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";

export interface CampusBusPin {
  kind: "campus";
  line: "red" | "green" | "route1" | "route2";
  direction: "up" | "down";
}

export interface CityBusPin {
  kind: "city";
  routeId: string;
  directionId?: string;
  stopId: string;
  routeNameZh: string;
  routeNameEn: string;
  stopNameZh: string;
  stopNameEn: string;
}

export type BusPin = CampusBusPin | CityBusPin;

export function busPinId(pin: BusPin) {
  return pin.kind === "campus"
    ? `campus:${pin.line}:${pin.direction}`
    : `city:${pin.routeId}:${pin.directionId ? `${pin.directionId}:` : ""}${pin.stopId}`;
}

function isSameCityStop(a: CityBusPin, b: CityBusPin) {
  return (
    a.routeId === b.routeId &&
    a.stopId === b.stopId &&
    (!a.directionId || !b.directionId || a.directionId === b.directionId)
  );
}

export function toggleBusPin(pins: BusPin[], pin: BusPin) {
  const id = busPinId(pin);
  return pins.some((item) =>
    item.kind === "city" && pin.kind === "city"
      ? isSameCityStop(item, pin)
      : busPinId(item) === id,
  )
    ? pins.filter((item) =>
        item.kind === "city" && pin.kind === "city"
          ? !isSameCityStop(item, pin)
          : busPinId(item) !== id,
      )
    : [...pins, pin];
}

export function isBusPinned(pins: BusPin[], pin: BusPin) {
  return pins.some((item) =>
    item.kind === "city" && pin.kind === "city"
      ? isSameCityStop(item, pin)
      : busPinId(item) === busPinId(pin),
  );
}

export function useBusPins() {
  const [pins, setPins] = useLocalStorage<BusPin[]>("bus_pins", []);
  const toggle = useCallback(
    (pin: BusPin) => setPins((current) => toggleBusPin(current, pin)),
    [setPins],
  );
  const pinned = useCallback((pin: BusPin) => isBusPinned(pins, pin), [pins]);
  return { pins, toggle, pinned };
}
