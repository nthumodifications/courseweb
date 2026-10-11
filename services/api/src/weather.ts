import { Hono } from "hono";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { env } from "hono/adapter";
import { getRangeOfDays } from "./utils/dates";
import { fetchUpstream } from "./utils/upstream";

type WeatherAPIResponse = {
  Locations: {
    DatasetDescription: string;
    LocationsName: string;
    Dataid: string;
    Location: {
      LocationName: string;
      Geocode: string;
      Lat: string;
      Lon: string;
      WeatherElement: {
        ElementName: string;
        Description: string;
        Time: {
          StartTime: string;
          EndTime: string;
          ElementValue: {
            [Measures: string]: string;
          }[];
        }[];
      }[];
    }[];
  }[];
};

type WeatherData = {
  date: string;
  weatherData: {
    MinT: string | undefined;
    MaxT: string | undefined;
    PoP12h: string | undefined;
    Wx: string | undefined;
    WeatherDescription: string | undefined;
  };
}[];

export function parseWeatherResponse(
  payload: unknown,
  now = new Date(),
): WeatherData {
  const apiResponse = payload as {
    success?: boolean;
    result?: unknown;
    records: WeatherAPIResponse;
  };
  if (apiResponse.success === false) {
    throw new Error("Failed to fetch data " + String(apiResponse.result));
  }
  const weatherResponse = apiResponse.records as WeatherAPIResponse;
  const days = getRangeOfDays(
    toZonedTime(now, "Asia/Taipei"),
    toZonedTime(new Date(now.getTime() + 86400000 * 4), "Asia/Taipei"),
  );

  return days.map((day) => {
    const dayElements =
      weatherResponse.Locations[0].Location[0].WeatherElement.map((element) => {
        const data = element.Time.find(
          (t) => new Date(t.StartTime) <= day && new Date(t.EndTime) >= day,
        );

        if (element.ElementName === "天氣現象" && data) {
          return {
            element: "Wx",
            value: data.ElementValue.find((v) => v.WeatherCode)?.WeatherCode!,
          };
        } else if (element.ElementName === "12小時降雨機率" && data) {
          return {
            element: "PoP12h",
            value: data.ElementValue.find((v) => v.ProbabilityOfPrecipitation)
              ?.ProbabilityOfPrecipitation!,
          };
        } else if (element.ElementName === "最高溫度" && data) {
          return {
            element: "MaxT",
            value: data.ElementValue.find((v) => v.MaxTemperature)
              ?.MaxTemperature!,
          };
        } else if (element.ElementName === "最低溫度" && data) {
          return {
            element: "MinT",
            value: data.ElementValue.find((v) => v.MinTemperature)
              ?.MinTemperature!,
          };
        } else if (element.ElementName === "風速" && data) {
          return {
            element: "WindSpeed",
            value: data.ElementValue.find((v) => v.WindSpeed)?.WindSpeed!,
          };
        } else if (element.ElementName === "天氣預報綜合描述" && data) {
          return {
            element: "WeatherDescription",
            value: data.ElementValue.find((v) => v.WeatherDescription)
              ?.WeatherDescription!,
          };
        } else {
          return { element: element.ElementName, value: "" };
        }
      });
    const weatherData = {
      MinT: dayElements.find((e) => e.element === "MinT")?.value,
      MaxT: dayElements.find((e) => e.element === "MaxT")?.value,
      PoP12h: dayElements.find((e) => e.element === "PoP12h")?.value,
      Wx: dayElements.find((e) => e.element === "Wx")?.value,
      WeatherDescription: dayElements.find(
        (e) => e.element === "WeatherDescription",
      )?.value,
    };
    return {
      date: format(day, "yyyy-MM-dd"),
      weatherData,
    };
  });
}

const app = new Hono().get("/", async (c) => {
  try {
    const { CWA_API_KEY } = env<{ CWA_API_KEY: string }>(c);
    const res = await fetchUpstream(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-055?Authorization=${CWA_API_KEY}&format=JSON&locationName=%E6%9D%B1%E5%8D%80&elementName=MinT,MaxT,PoP12h,Wx,WeatherDescription`,
    );
    return c.json(parseWeatherResponse(await res.json()));
  } catch (error) {
    console.error("Failed to fetch weather data", error);
    return c.json({ error: "Weather service unavailable" }, 502);
  }
});

export default app;
