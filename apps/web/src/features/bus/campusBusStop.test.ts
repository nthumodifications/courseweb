import { describe, expect, test } from "bun:test";
import { BusStationState } from "./BusLineDetailShared";
import { findCampusBusStopIndex, withCampusBusStopIds } from "./campusBusStop";

describe("campus bus stop deep links", () => {
  test.each([
    {
      name: "matches a Chinese station name after trimming",
      query: " 綜二 ",
      zh: ["北校門口", "綜二", "台積館"],
      en: ["North Main Gate", "General Building II", "TSMC Building"],
      past: [],
      expected: 1,
    },
    {
      name: "matches an English station name case-insensitively",
      query: " tSmC building ",
      zh: ["北校門口", "台積館"],
      en: ["North Main Gate", "TSMC Building"],
      past: [],
      expected: 1,
    },
    {
      name: "chooses the first duplicate that has not been passed",
      query: "General Building II",
      zh: ["綜二", "楓林小徑", "綜二"],
      en: ["General Building II", "Maple Path", "General Building II"],
      past: [true, false, false],
      expected: 2,
    },
    {
      name: "falls back to the first duplicate when all are past",
      query: "綜二",
      zh: ["綜二", "楓林小徑", "綜二"],
      en: ["General Building II", "Maple Path", "General Building II"],
      past: [true, false, true],
      expected: 0,
    },
    {
      name: "ignores an unknown station",
      query: "Unknown stop",
      zh: ["北校門口"],
      en: ["North Main Gate"],
      past: [],
      expected: undefined,
    },
  ])("$name", ({ query, zh, en, past, expected }) => {
    expect(findCampusBusStopIndex(query, zh, en, past)).toBe(expected);
  });

  test("keeps timeline states unchanged for a deep-linked stop", () => {
    const items = [
      {
        station: "North Main Gate",
        time: "08:00",
        state: BusStationState.LEFT,
      },
      {
        station: "General Building II",
        time: "08:02",
        state: BusStationState.UNAVAILABLE,
      },
    ];
    const selectedStop = findCampusBusStopIndex(
      "General Building II",
      items.map((item) => item.station),
      items.map((item) => item.station),
    );

    expect(selectedStop).toBe(1);
    expect(withCampusBusStopIds(items).map((item) => item.state)).toEqual(
      items.map((item) => item.state),
    );
  });
});
