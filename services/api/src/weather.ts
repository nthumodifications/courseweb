import { Hono } from "hono";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { env } from "hono/adapter";
import { getRangeOfDays } from "./utils/dates";

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
    MinT: string;
    MaxT: string;
    PoP12h: string;
    Wx: string;
    WeatherDescription: string;
  };
}[];

const app = new Hono().get("/", async (c) => {
  const { CWA_API_KEY } = env<{ CWA_API_KEY: string }>(c);

  const res = await fetch(
    `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-055?Authorization=${CWA_API_KEY}&format=JSON&locationName=%E6%9D%B1%E5%8D%80&elementName=MinT,MaxT,PoP12h,Wx,WeatherDescription`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch data " + res.status + (await res.text()));
  }
  const apiResponse = (await res.json()) as any;
  if (apiResponse.success === false) {
    throw new Error("Failed to fetch data " + apiResponse.result);
  }

  const weatherResponse = apiResponse.records as WeatherAPIResponse;

  // format data to be simpler
  // MinT, MaxT, PoP12h, Wx, WeatherDescription
  //get a range of 5 days starting from today
  const days = getRangeOfDays(
    toZonedTime(new Date(), "Asia/Taipei"),
    toZonedTime(new Date(Date.now() + 86400000 * 4), "Asia/Taipei"),
  );

  // for each day, get the the MinT, MaxT, PoP12h, Wx, WeatherDescription for the day
  const weatherData = days.map((day) => {
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
  return c.json(weatherData);
});

export default app;
