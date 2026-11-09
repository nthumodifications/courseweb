import { describe, expect, test } from "bun:test";
import { formatTaipeiBookingRange } from "./shared";

const timeZone = "Asia/Taipei";
const currentYear = Number(
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
  }).format(new Date()),
);
const utcTime = (year: number, month: number, day: number, hour: number) =>
  new Date(Date.UTC(year, month - 1, day, hour)).toISOString();

describe("formatTaipeiBookingRange", () => {
  test("prints a same-day date once in all supported languages", () => {
    const startAt = utcTime(currentYear, 11, 12, 10);
    const endAt = utcTime(currentYear, 11, 12, 12);
    const start = new Date(startAt);
    const weekdayZh = new Intl.DateTimeFormat("zh-TW", {
      timeZone,
      weekday: "short",
    }).format(start);
    const weekdayZhHans = new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      weekday: "short",
    }).format(start);
    const dateEn = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(start);

    expect(formatTaipeiBookingRange(startAt, endAt, "zh")).toBe(
      `11月12日（${weekdayZh}）18:00–20:00`,
    );
    expect(formatTaipeiBookingRange(startAt, endAt, "zh-cn")).toBe(
      `11月12日（${weekdayZhHans}）18:00–20:00`,
    );
    expect(formatTaipeiBookingRange(startAt, endAt, "en")).toBe(
      `${dateEn}, 6:00 PM–8:00 PM`,
    );
  });

  test("includes the year for dates outside the current Taipei year", () => {
    const nextYear = currentYear + 1;
    const startAt = utcTime(nextYear, 11, 12, 10);
    const endAt = utcTime(nextYear, 11, 12, 12);
    const start = new Date(startAt);
    const weekdayZh = new Intl.DateTimeFormat("zh-TW", {
      timeZone,
      weekday: "short",
    }).format(start);
    const dateEn = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(start);

    expect(formatTaipeiBookingRange(startAt, endAt, "zh")).toBe(
      `${nextYear}年11月12日（${weekdayZh}）18:00–20:00`,
    );
    expect(formatTaipeiBookingRange(startAt, endAt, "en")).toBe(
      `${dateEn}, 6:00 PM–8:00 PM`,
    );
  });

  test("uses both dates when a range crosses a Taipei day boundary", () => {
    const startAt = utcTime(currentYear, 11, 12, 15);
    const endAt = utcTime(currentYear, 11, 12, 16);
    const startWeekday = new Intl.DateTimeFormat("zh-TW", {
      timeZone,
      weekday: "short",
    }).format(new Date(startAt));
    const endWeekday = new Intl.DateTimeFormat("zh-TW", {
      timeZone,
      weekday: "short",
    }).format(new Date(endAt));

    expect(formatTaipeiBookingRange(startAt, endAt, "zh")).toBe(
      `11月12日（${startWeekday}） 23:00–11月13日（${endWeekday}） 00:00`,
    );
  });
});
