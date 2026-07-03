import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { useSettings } from "@/hooks/contexts/settings";
import WeatherIcon from "@/components/Today/WeatherIcon";
import { Cloud } from "lucide-react";

interface WeatherWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const WeatherWidget: FC<WeatherWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { language } = useSettings();
  const { data: weather, isLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
      return await res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const title = language === "zh" ? "新竹天氣" : "Hsinchu Weather";

  // Get today's weather data (first entry)
  const todayWeather = Array.isArray(weather) ? weather[0]?.weatherData : null;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : !todayWeather ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Cloud className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-xs">
              {language === "zh" ? "無法取得天氣資料" : "Weather unavailable"}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {todayWeather.Wx && (
                <div className="text-4xl">
                  <WeatherIcon wxCode={todayWeather.Wx} />
                </div>
              )}
              <div>
                <div className="text-2xl font-bold">
                  {todayWeather.MaxT}°
                  <span className="text-base font-normal text-muted-foreground ml-1">
                    / {todayWeather.MinT}°
                  </span>
                </div>
                {todayWeather.Wx && (
                  <div className="text-xs text-muted-foreground">
                    {todayWeather.Wx}
                  </div>
                )}
              </div>
            </div>
            {todayWeather.PoP12h !== undefined && (
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-500">
                  {todayWeather.PoP12h}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === "zh" ? "降雨機率" : "Rain"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default WeatherWidget;
