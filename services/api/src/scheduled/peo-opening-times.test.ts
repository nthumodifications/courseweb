import { describe, expect, it } from "bun:test";
import { isUnreadableWeek, type DaySchedule } from "./peo-opening-times";

const closedWeek = (notes: string | null): DaySchedule => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
  holiday: [],
  notes,
});

describe("isUnreadableWeek", () => {
  it("treats an empty week with no reason as a failed parse", () => {
    expect(isUnreadableWeek(closedWeek(null))).toBe(true);
    expect(isUnreadableWeek(closedWeek("  "))).toBe(true);
  });

  it("keeps a facility that is closed for a stated reason", () => {
    expect(isUnreadableWeek(closedWeek("場地施工期間暫停開放"))).toBe(false);
  });

  it("keeps any week with open slots", () => {
    const week = closedWeek(null);
    week.saturday = [{ open: "07:00", close: "21:30" }];
    expect(isUnreadableWeek(week)).toBe(false);
  });
});
