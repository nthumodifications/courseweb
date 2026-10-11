import { afterEach, describe, expect, test, mock } from "bun:test";
import weather, { parseWeatherResponse } from "./weather";

const originalFetch = globalThis.fetch;
const originalKey = process.env.CWA_API_KEY;
const now = new Date("2026-10-10T00:00:00.000Z");

const weatherPayload = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  records: {
    Locations: [
      {
        Location: [
          {
            WeatherElement: [
              {
                ElementName: "最低溫度",
                Time: [
                  {
                    StartTime: "2026-10-09T00:00:00Z",
                    EndTime: "2026-10-20T00:00:00Z",
                    ElementValue: [{ MinTemperature: "21" }],
                  },
                ],
              },
              {
                ElementName: "最高溫度",
                Time: [
                  {
                    StartTime: "2026-10-09T00:00:00Z",
                    EndTime: "2026-10-20T00:00:00Z",
                    ElementValue: [{ MaxTemperature: "27" }],
                  },
                ],
              },
              {
                ElementName: "12小時降雨機率",
                Time: [
                  {
                    StartTime: "2026-10-09T00:00:00Z",
                    EndTime: "2026-10-20T00:00:00Z",
                    ElementValue: [{ ProbabilityOfPrecipitation: "30" }],
                  },
                ],
              },
              {
                ElementName: "天氣現象",
                Time: [
                  {
                    StartTime: "2026-10-09T00:00:00Z",
                    EndTime: "2026-10-20T00:00:00Z",
                    ElementValue: [{ WeatherCode: "2" }],
                  },
                ],
              },
              {
                ElementName: "天氣預報綜合描述",
                Time: [
                  {
                    StartTime: "2026-10-09T00:00:00Z",
                    EndTime: "2026-10-20T00:00:00Z",
                    ElementValue: [{ WeatherDescription: "晴時多雲" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  ...overrides,
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.CWA_API_KEY;
  else process.env.CWA_API_KEY = originalKey;
});

describe("weather upstream parser", () => {
  test("preserves the normal five-day response shape", () => {
    expect(parseWeatherResponse(weatherPayload(), now)).toEqual(
      Array.from({ length: 5 }, (_, index) => ({
        date: `2026-10-${String(10 + index).padStart(2, "0")}`,
        weatherData: {
          MinT: "21",
          MaxT: "27",
          PoP12h: "30",
          Wx: "2",
          WeatherDescription: "晴時多雲",
        },
      })),
    );
  });

  test.each([
    ["empty body", new Response("")],
    ["HTML error page with 200", new Response("<html>error</html>")],
    ["upstream 5xx", new Response("down", { status: 503 })],
    ["timeout", new Error("timeout")],
  ])("returns 502 for %s", async (_label, result) => {
    process.env.CWA_API_KEY = "test-key";
    globalThis.fetch = mock(async () => {
      if (result instanceof Error) throw result;
      return result;
    }) as unknown as typeof fetch;
    const response = await weather.request("/");
    expect(response.status).toBe(502);
  });

  test("preserves missing and unusual values accepted by HEAD", () => {
    const payload = weatherPayload();
    const elements = payload.records.Locations[0].Location[0].WeatherElement;
    expect(() => parseWeatherResponse({ records: {} }, now)).toThrow();
    expect(
      parseWeatherResponse(
        {
          ...payload,
          records: {
            Locations: [
              { Location: [{ WeatherElement: elements.slice(0, 4) }] },
            ],
          },
        },
        now,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weatherData: expect.objectContaining({
            WeatherDescription: undefined,
          }),
        }),
      ]),
    );
    expect(
      parseWeatherResponse(
        {
          ...payload,
          records: {
            Locations: [
              {
                Location: [
                  {
                    WeatherElement: elements.map((element) =>
                      element.ElementName === "12小時降雨機率"
                        ? {
                            ...element,
                            Time: [
                              {
                                ...element.Time[0],
                                ElementValue: [
                                  { ProbabilityOfPrecipitation: "101" },
                                ],
                              },
                            ],
                          }
                        : element,
                    ),
                  },
                ],
              },
            ],
          },
        },
        now,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weatherData: expect.objectContaining({ PoP12h: "101" }),
        }),
      ]),
    );
  });
});
