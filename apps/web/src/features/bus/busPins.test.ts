import { describe, expect, test } from "bun:test";
import {
  busPinId,
  isBusPinned,
  toggleBusPin,
  type CityBusPin,
} from "./busPins";

const cityPin: CityBusPin = {
  kind: "city",
  routeId: "83",
  stopId: "HSZ303610",
  routeNameZh: "83",
  routeNameEn: "83",
  stopNameZh: "清大南大校區",
  stopNameEn: "NTHU Nanda Campus",
};

describe("bus pins", () => {
  test("uses route and stop identity for city pins", () => {
    expect(busPinId(cityPin)).toBe("city:83:HSZ303610");
    expect(isBusPinned([cityPin], { ...cityPin, stopNameZh: "其他" })).toBe(
      true,
    );
  });

  test("toggles a pin without duplicating it", () => {
    expect(toggleBusPin([], cityPin)).toEqual([cityPin]);
    expect(toggleBusPin([cityPin], cityPin)).toEqual([]);
  });
});
