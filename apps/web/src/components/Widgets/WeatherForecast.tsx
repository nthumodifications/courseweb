import { FC } from "react";
import { Cloud } from "lucide-react";
import WeatherIcon from "@/components/Today/WeatherIcon";
import { formatWeatherWeekday, WeatherLanguage } from "./weather-utils";

export interface WeatherForecastItem {
  date: string;
  weatherData?: {
    MinT?: string;
    MaxT?: string;
    PoP12h?: string;
    Wx?: string;
  };
}

export interface WeatherForecastLabels {
  high: string;
  low: string;
  missingValue: string;
  rain: string;
}

interface WeatherForecastProps {
  forecasts: WeatherForecastItem[];
  labels: WeatherForecastLabels;
  language: WeatherLanguage;
}

const WeatherForecast: FC<WeatherForecastProps> = ({
  forecasts,
  labels,
  language,
}) => (
  <div className="grid min-w-0 grid-cols-4 gap-2">
    {forecasts.map((forecast, index) => {
      const weatherData = forecast.weatherData;
      const weekday =
        formatWeatherWeekday(forecast.date, language) || labels.missingValue;
      const maxTemperature = weatherData?.MaxT
        ? `${weatherData.MaxT}°`
        : labels.missingValue;
      const minTemperature = weatherData?.MinT
        ? `${weatherData.MinT}°`
        : labels.missingValue;
      const rainChance = weatherData?.PoP12h
        ? `${weatherData.PoP12h}%`
        : labels.missingValue;

      return (
        <div
          key={`${forecast.date}-${index}`}
          className="flex h-20 min-w-0 flex-col items-center justify-between text-center"
          aria-label={`${weekday}, ${labels.high} ${maxTemperature}, ${labels.low} ${minTemperature}, ${labels.rain} ${rainChance}`}
        >
          <span className="max-w-full truncate text-xs font-medium">
            {weekday}
          </span>
          <span className="flex h-5 items-center justify-center">
            {weatherData?.Wx ? (
              <WeatherIcon wxCode={weatherData.Wx} />
            ) : (
              <Cloud className="h-5 w-5 text-muted-foreground/40" />
            )}
          </span>
          <div className="flex items-center gap-0.5 whitespace-nowrap text-xs">
            <span className="font-medium">{maxTemperature}</span>
            <span className="text-muted-foreground">/ {minTemperature}</span>
          </div>
          <div className="flex flex-col leading-tight text-[10px] text-muted-foreground">
            <span>{labels.rain}</span>
            <span className="font-medium text-blue-500">{rainChance}</span>
          </div>
        </div>
      );
    })}
  </div>
);

export default WeatherForecast;
