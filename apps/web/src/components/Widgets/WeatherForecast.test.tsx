import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "bun:test";
import en from "@/dictionaries/en.json";
import zh from "@/dictionaries/zh.json";
import WeatherForecast from "./WeatherForecast";

const forecasts = [
  {
    date: "2026-10-09",
    weatherData: { MaxT: "27", MinT: "21", PoP12h: "30", Wx: "2" },
  },
  {
    date: "2026-10-10",
    weatherData: {},
  },
];

describe("WeatherForecast markup", () => {
  it("keeps the compact layout and labels both languages", () => {
    const cases = [
      {
        language: "en" as const,
        labels: en.settings.calendar.widget_dashboard.weather,
        weekday: "Fri",
        rain: "Rain",
      },
      {
        language: "zh" as const,
        labels: zh.settings.calendar.widget_dashboard.weather,
        weekday: "週五",
        rain: "降雨機率",
      },
    ];

    for (const testCase of cases) {
      const markup = renderToStaticMarkup(
        <WeatherForecast
          forecasts={forecasts}
          language={testCase.language}
          labels={{
            high: testCase.labels.high,
            low: testCase.labels.low,
            missingValue: testCase.labels.missing_value,
            rain: testCase.labels.rain,
          }}
        />,
      );

      expect(markup).toContain("grid-cols-4");
      expect(markup).toContain("h-20");
      expect(markup).toContain(testCase.weekday);
      expect(markup).toContain(testCase.rain);
      expect(markup).toContain("27°");
      expect(markup).toContain("—");
    }
  });
});
