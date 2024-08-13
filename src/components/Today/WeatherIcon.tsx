import { WeatherData } from "@/types/weather";
import { FC } from "react";
import { Umbrella } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WeatherIconProps {
  date: Date;
  weather: WeatherData[number];
}

const WeatherIcon: FC<WeatherIconProps> = ({ date, weather }) => {
  if (!weather) return <></>;

  const weatherData = weather.weatherData.Wx;
  const weatherDescription = weather.weatherData.WeatherDescription;

  if (!weatherData || !weatherDescription) return <></>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-row gap-4 items-center">
            {parseInt(weather.weatherData.PoP12h ?? "0") > 0 && (
              <div className="relative">
                <div className="absolute -top-2 -right-3 bg-blue-500 text-white rounded-full p-0.5 flex items-center justify-center text-xs">
                  {weather.weatherData.PoP12h}%
                </div>
                <Umbrella />
              </div>
            )}
            <div className="flex flex-col">
              <img
                className="w-9 h-8"
                src={`https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/day/${weatherData}.svg`}
              />

              <p className="text-center text-xs">
                <span className="text-gray-600 dark:text-neutral-400 px-1">
                  {weather.weatherData.MaxT}
                </span>
                <span className="text-gray-400 dark:text-neutral-600 px-1">
                  {weather.weatherData.MinT}
                </span>
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{weatherDescription}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WeatherIcon;
