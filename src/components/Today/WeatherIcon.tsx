import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";
const WeatherIcon = ({ wxCode }: { wxCode: string | undefined }) => {
  // Map CWA weather codes to Lucide icons
  // Based on https://www.cwa.gov.tw/V8/assets/img/weather_icons/weathers/svg_icon/day/XX.svg
  if (!wxCode) return <Sun className="h-5 w-5 text-yellow-500" />;

  const code = parseInt(wxCode);

  // Sunny (01)
  if (code === 1) return <Sun className="h-5 w-5 text-yellow-500" />;

  // Fair (02, 03)
  if (code >= 2 && code <= 3)
    return <CloudSun className="h-5 w-5 text-blue-400" />;

  // Cloudy (04, 05, 06, 07)
  if (code >= 4 && code <= 7)
    return <Cloud className="h-5 w-5 text-gray-400" />;

  // Fog related (08, 09)
  if (code >= 8 && code <= 9)
    return <Cloud className="h-5 w-5 text-gray-300" />;

  // Showers/Rain (10-19, 21, 22, 29, 30)
  if (
    (code >= 10 && code <= 19) ||
    code === 21 ||
    code === 22 ||
    code === 29 ||
    code === 30
  )
    return <CloudRain className="h-5 w-5 text-blue-500" />;

  // Thunderstorm (20, 22, 23, 24, 25, 26, 27, 28, 39, 41)
  if (code === 20 || (code >= 22 && code <= 28) || code === 39 || code === 41)
    return <CloudLightning className="h-5 w-5 text-amber-500" />;

  // Snow (32-38, 42)
  if ((code >= 32 && code <= 38) || code === 42)
    return <Snowflake className="h-5 w-5 text-blue-300" />;

  // Default
  return <Sun className="h-5 w-5 text-yellow-500" />;
};

export default WeatherIcon;
