import { describe, expect, it } from "bun:test";
import { formatWeatherWeekday } from "./weather-utils";

describe("formatWeatherWeekday", () => {
  it("formats API dates in both supported languages", () => {
    expect(formatWeatherWeekday("2026-10-09", "en")).toBe("Fri");
    expect(formatWeatherWeekday("2026-10-09", "zh")).toBe("週五");
  });

  it("rejects dates that would roll into another calendar day", () => {
    expect(formatWeatherWeekday("2026-02-30", "en")).toBe("");
    expect(formatWeatherWeekday("not-a-date", "zh")).toBe("");
  });
});
