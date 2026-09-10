import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { getLocale } from "@/helpers/dateLocale";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import WeatherIcon from "@/components/Today/WeatherIcon";
import client from "@/config/api";
import { Badge } from "@courseweb/ui";
import { Cloud } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents, {
  addTaipeiDays,
  getTaipeiDateKey,
  UPCOMING_TIME_ZONE,
} from "@/hooks/useUpcomingEvents";

const UpcomingEvents = () => {
  const { language } = useSettings();
  const today = useTime();
  const dict = useDictionary();
  const { events, windowStart } = useUpcomingEvents({ windowDays: 5 });
  const days = [0, 1, 2, 3, 4].map((index) =>
    addTaipeiDays(windowStart, index),
  );

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
      const data = await res.json();
      return data;
    },
  });

  const renderWeather = (day: Date) => {
    const weatherItem = weatherData?.find(
      (w) => w.date === getTaipeiDateKey(day),
    );
    if (!weatherItem) return <></>;

    // Check if weatherData.weatherData is empty or doesn't contain necessary data
    if (
      !weatherItem.weatherData ||
      Object.keys(weatherItem.weatherData).length === 0 ||
      !weatherItem.weatherData.Wx
    ) {
      return (
        <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
          <Cloud className="h-5 w-5 text-gray-400" />
          <span className="text-muted-foreground text-xs">
            {dict.calendar.updating}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
        <WeatherIcon wxCode={weatherItem.weatherData.Wx} />
        <span className="font-medium">{weatherItem.weatherData.MaxT}°</span>
        <span className="text-muted-foreground text-xs">
          {weatherItem.weatherData.MinT}°
        </span>
        <Badge variant="outline" className="ml-1 text-xs">
          {weatherItem.weatherData.PoP12h}%
        </Badge>
      </div>
    );
  };

  return (
    <div className="flex-col justify-start items-start gap-2 inline-flex md:max-w-[300px] md:h-full px-2">
      <div className="self-stretch text-lg font-semibold leading-7">
        {dict.calendar.upcoming_events}
      </div>
      <div className="self-stretch flex-col justify-start items-start gap-6 flex overflow-x-hidden overflow-y-auto max-h-[calc(100vh-12rem)]">
        {days.map((day) => (
          <div
            className="flex flex-col gap-2 pb-4 w-full"
            key={getTaipeiDateKey(day)}
          >
            <div className="flex flex-row justify-between">
              <div className="flex flex-row flex-1 items-baseline gap-2">
                <div className="whitespace-nowrap font-semibold text-lg">
                  {getTaipeiDateKey(day) === getTaipeiDateKey(today)
                    ? dict.today.upcoming.today
                    : getTaipeiDateKey(day) ===
                        getTaipeiDateKey(addTaipeiDays(today, 1))
                      ? dict.today.upcoming.tomorrow
                      : formatInTimeZone(day, UPCOMING_TIME_ZONE, "EEEE", {
                          locale: getLocale(language),
                        })}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatInTimeZone(day, UPCOMING_TIME_ZONE, "MMM do", {
                    locale: getLocale(language),
                  })}
                </div>
              </div>
              {!weatherLoading && weatherData && renderWeather(day)}
            </div>
            <UpcomingEventList
              events={events.filter(
                (event) =>
                  getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
              )}
              emptyContent={dict.calendar.no_events}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;
