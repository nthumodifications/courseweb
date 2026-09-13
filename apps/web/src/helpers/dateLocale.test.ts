import { describe, expect, it } from "bun:test";
import { formatDistanceStrict } from "date-fns";
import { getLocale } from "./dateLocale";

/**
 * The next-up countdown composes formatDistanceStrict with getLocale, so the
 * unit scales with the distance instead of always reading in minutes.
 */
const startsIn = (minutes: number, language: "en" | "zh") => {
  const now = new Date("2026-09-12T18:23:00+08:00");
  return formatDistanceStrict(new Date(now.getTime() + minutes * 60_000), now, {
    locale: getLocale(language),
  });
};

describe("countdown distance formatting", () => {
  it("reads in minutes under an hour", () => {
    expect(startsIn(59, "en")).toBe("59 minutes");
    expect(startsIn(59, "zh")).toBe("59 分鐘");
  });

  it("pluralizes a single minute without a dedicated string", () => {
    expect(startsIn(1, "en")).toBe("1 minute");
    expect(startsIn(1, "zh")).toBe("1 分鐘");
  });

  it("scales to hours", () => {
    expect(startsIn(90, "en")).toBe("2 hours");
    expect(startsIn(90, "zh")).toBe("2 小時");
  });

  it("scales to days, the case that read as 2577 min", () => {
    expect(startsIn(2577, "en")).toBe("2 days");
    expect(startsIn(2577, "zh")).toBe("2 天");
  });

  it("stays in hours until a full day has passed", () => {
    expect(startsIn(1439, "en")).toBe("24 hours");
  });

  it("handles the seven-day lookahead window maximum", () => {
    expect(startsIn(7 * 24 * 60, "en")).toBe("7 days");
    expect(startsIn(7 * 24 * 60, "zh")).toBe("7 天");
  });
});
