import { describe, expect, test } from "bun:test";
import type { BusDepartureDetails } from "@/libs/bus";
import { exportNotes, getTimeOnDate } from "./bus";

const campusBus = (
  overrides: Partial<Extract<BusDepartureDetails, { route: "校園公車" }>> = {},
) => ({
  time: "08:00",
  description: "",
  route: "校園公車" as const,
  dep_stop: "主校區",
  line: "紅線",
  ...overrides,
});

const nandaBus = (
  description: string,
): Extract<BusDepartureDetails, { route: "南大區間車" }> => ({
  time: "08:00",
  description,
  route: "南大區間車",
});

describe("campus bus helpers", () => {
  test("sets a departure time without mutating the reference date", () => {
    const date = new Date(2026, 9, 9, 3, 4, 5);

    expect(getTimeOnDate(date, "08:30")).toEqual(
      new Date(2026, 9, 9, 8, 30, 5),
    );
    expect(date).toEqual(new Date(2026, 9, 9, 3, 4, 5));
  });

  test("adds campus-specific notes and localizes the departure note", () => {
    const bus = campusBus({ description: "校本部發車", dep_stop: "綜二 " });

    expect(exportNotes(bus, "zh").notes).toEqual(["校本部發車", "綜二發車"]);
    expect(exportNotes(bus, "en").notes).toEqual([
      "校本部發車",
      "Dep. from GEN II",
    ]);
  });

  test("adds Nanda service notes from the description", () => {
    expect(exportNotes(nandaBus("83號，週五停駛"), "en").notes).toEqual([
      "Bus 83",
      "N/A on Fridays",
    ]);
  });
});
