import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import WeatherIcon from "@/components/Today/WeatherIcon";
import { Cloud } from "lucide-react";
import { EmptyState, Skeleton } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

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
  const dict = useDictionary();
  const { data: weather, isLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
      return await res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const title = dict.widgets.weather_title;

  // Get today's weather data (first entry)
  const todayWeather = Array.isArray(weather) ? weather[0]?.weatherData : null;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : !todayWeather ? (
          <EmptyState
            icon={Cloud}
            title={dict.widgets.weather_unavailable}
            description={dict.widgets.weather_unavailable_description}
            size="sm"
          />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {todayWeather.Wx && (
                <div className="text-xl">
                  <WeatherIcon wxCode={todayWeather.Wx} />
                </div>
              )}
              <div>
                <div className="text-xl font-bold tabular-nums">
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
                <div className="text-base font-semibold text-info">
                  {todayWeather.PoP12h}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {dict.widgets.rain_probability}
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
