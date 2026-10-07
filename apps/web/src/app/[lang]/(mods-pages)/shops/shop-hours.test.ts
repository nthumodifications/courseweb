import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { checkOpen } from "./shop-hours";

// 2026-10-07 is a Wednesday, 2026-10-10 a Saturday.
const at = (day: number, hour: number, minute = 0) =>
  setSystemTime(new Date(2026, 9, day, hour, minute));

afterEach(() => {
  setSystemTime();
});

describe("checkOpen", () => {
  it("handles the fixed cases", () => {
    expect(checkOpen("24小時")).toEqual([true, "營業中", "24小時營業"]);
    expect(checkOpen("")).toEqual([false, "今日休息"]);
    expect(checkOpen("not a schedule")).toEqual([false, "無資訊"]);
  });

  it("walks a single range through the day", () => {
    const schedule = "11:00-20:00";
    at(7, 8);
    expect(checkOpen(schedule)).toEqual([false, "即將開始", "11:00開始營業"]);
    at(7, 10, 30);
    expect(checkOpen(schedule)).toEqual([false, "即將開始", "11:00開始營業"]);
    at(7, 12);
    expect(checkOpen(schedule)).toEqual([true, "營業中", "20:00後休息"]);
    at(7, 19, 30);
    expect(checkOpen(schedule)).toEqual([true, "即將休息", "20:00後休息"]);
    at(7, 21);
    expect(checkOpen(schedule)).toEqual([false, "休息中"]);
  });

  it("uses the next slot of a split day", () => {
    const schedule = "11:00-14:00,17:00-20:00";
    at(7, 15);
    expect(checkOpen(schedule)).toEqual([false, "即將開始", "17:00開始營業"]);
    at(7, 18);
    expect(checkOpen(schedule)).toEqual([true, "營業中", "20:00後休息"]);
    at(7, 21);
    expect(checkOpen(schedule)).toEqual([false, "休息中"]);
  });

  it("picks the part of a multi-day schedule that applies today", () => {
    const schedule = "週一至週五:11:00-20:00、週六:11:00-14:00";
    at(7, 15);
    expect(checkOpen(schedule)).toEqual([true, "營業中", "20:00後休息"]);
    at(10, 15);
    expect(checkOpen(schedule)).toEqual([false, "休息中"]);
    at(11, 12);
    expect(checkOpen(schedule)).toEqual([false, "無資訊"]);
  });

  it("accepts a weekday range written with a colon", () => {
    at(7, 12);
    expect(checkOpen("周一~周五:11:00:20:00、週六:11:00-14:00")).toEqual([
      true,
      "營業中",
      "20:00後休息",
    ]);
  });
});
