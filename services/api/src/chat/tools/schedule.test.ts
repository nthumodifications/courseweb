import { describe, expect, test } from "bun:test";
import {
  findFreePeriods,
  findTimetableConflicts,
  getOccupiedSlots,
  groupSlotsByDay,
  parseTimeSlots,
  trimList,
  trimText,
} from "./schedule";

describe("chat timetable helpers", () => {
  test("parses compact NTHU times and preserves special periods", () => {
    expect(parseTimeSlots(["M3M4", "W2W3W4", "Mn", "M3"])).toEqual([
      "M3",
      "M4",
      "Mn",
      "W2",
      "W3",
      "W4",
    ]);
  });

  test("finds conflicts by individual slot instead of raw string equality", () => {
    expect(
      findTimetableConflicts([
        { raw_id: "A", times: ["M3M4"] },
        { raw_id: "B", times: ["M4M5"] },
        { raw_id: "C", times: ["T3T4"] },
      ]),
    ).toEqual([
      { first: "A", second: "B", overlappingSlots: ["M4"] },
    ]);
  });

  test("returns occupied and free periods in timetable order", () => {
    const occupied = getOccupiedSlots([
      { raw_id: "A", times: ["M3M4", "W2"] },
    ]);
    expect(occupied).toEqual(["M3", "M4", "W2"]);
    expect(findFreePeriods(occupied).slice(0, 6)).toEqual([
      "M1",
      "M2",
      "Mn",
      "M5",
      "M6",
      "M7",
    ]);
    expect(groupSlotsByDay(occupied)).toMatchObject({
      M: ["M3", "M4"],
      W: ["W2"],
    });
  });

  test("trims long tool output and caps arrays", () => {
    expect(trimText("abcdef", 5)).toBe("abcd…");
    expect(trimList([1, 2, 3], 2)).toEqual([1, 2]);
  });
});
