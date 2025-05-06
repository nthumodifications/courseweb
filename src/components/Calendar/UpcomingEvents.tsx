import { useQuery } from "@tanstack/react-query";
import { getBrightness, getContrastColor } from "@/helpers/colors";
import { EventData } from "@/types/calendar_event";
import { useCalendar } from "@/components/Calendar/calendar_hook";
import { addDays, format, formatRelative, isSameDay, parse } from "date-fns";
import { eventsToDisplay } from "@/components/Calendar/calendar_utils";
import { EventPopover } from "@/components/Calendar/EventPopover";
import { getLocale } from "@/helpers/dateLocale";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import WeatherIcon from "@/components/Today/WeatherIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import client from "@/config/api";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

const UpcomingEvents = () => {
  const { events } = useCalendar();
  const { language } = useSettings();
  const today = useTime();
  const end = addDays(today, 5);
  const days = [today, ...[1, 2, 3, 4].map((i) => addDays(today, i))];

  const {
    data: weatherData,
    error: weatherError,
    isLoading: weatherLoading,
  } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
      const data = await res.json();
      return data;
    },
  });

  const {
    data: calendarData = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useQuery<EventData[]>({
    queryKey: ["event", format(today, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await client.acacalendar.$get({
        query: {
          start: today.toISOString(),
          end: end.toISOString(),
        },
      });
      return res.json();
    },
  });

  const upcomingEvents = eventsToDisplay(events, today, end).sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const renderLabelEvents = (date: Date) => {
    const ev = upcomingEvents
      .filter((event) => isSameDay(event.displayStart, date))
      .sort((a, b) => a.displayStart.getTime() - b.displayStart.getTime());

    if (ev.length === 0) {
      return (
        <div className="flex flex-row gap-2 items-start">
          <div className="size-4 rounded-sm mt-1 flex items-center justify-center">
            🎉
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-semibold">無行程</div>
            <div className="text-xs text-muted-foreground">
              今天沒有任何行程
            </div>
          </div>
        </div>
      );
    }

    return ev.map((event, index) => {
      //Determine the text color
      const brightness = getBrightness(event.color);
      //From the brightness, using the getContrastColor function, create a complementary color that is legible
      const textColor = getContrastColor(event.color);

      return (
        <EventPopover event={event} key={event.id + index}>
          <div className="flex flex-row gap-2 items-start">
            <div
              className="size-4 rounded-sm mt-1"
              style={{ backgroundColor: event.color }}
            ></div>
            <div className="flex flex-col gap-1">
              <div className="font-semibold">{event.title}</div>
              <div className="text-xs text-muted-foreground align-baseline">
                <Clock className="size-3 inline mr-1" />
                {format(event.displayStart, "HH:mm")} -{" "}
                {format(event.displayEnd, "HH:mm")}
              </div>
              {event.location && (
                <div className="text-xs text-muted-foreground align-baseline">
                  <MapPin className="size-3 inline mr-1" />
                  {event.location}
                </div>
              )}
              {event.details && (
                <div className="text-xs text-muted-foreground">
                  {event.details}
                </div>
              )}
            </div>
          </div>
        </EventPopover>
      );
    });
  };

  const renderCalendars = (date: Date) => {
    const events = (calendarData ?? []).filter((event) =>
      isSameDay(parse(event.date, "yyyy-MM-dd", new Date()), date),
    );

    return (
      events.length > 0 &&
      events.map((event, index) => (
        <div key={index} className="flex flex-row gap-2 items-start">
          <div className="size-4 bg-nthu-500 rounded-sm shrink-0 mt-1"></div>
          <div className="text-sm">{event.summary}</div>
        </div>
      ))
    );
  };

  const renderWeather = (day: Date) => {
    const weatherItem = weatherData?.find(
      (w) => w.date === format(day, "yyyy-MM-dd"),
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
          <span className="text-muted-foreground text-xs">資料更新中</span>
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
    <div className="flex-col justify-start items-start gap-2 inline-flex md:max-w-[292px] md:h-full">
      <div className="self-stretch text-lg font-semibold leading-7">
        即將到來的行程
      </div>
      <div className="self-stretch flex-col justify-start items-start gap-6 flex overflow-x-hidden overflow-y-auto max-h-[calc(100vh-12rem)]">
        {days.map((day) => (
          <div
            className="flex flex-col gap-2 pb-4 w-full"
            key={format(day, "EEEE, do MMMM")}
          >
            <div className="flex flex-row justify-between">
              <div className="flex flex-row flex-1 items-baseline gap-2">
                <div
                  className={cn(
                    "whitespace-nowrap font-semibold text-lg",
                    !isSameDay(day, today) && "text-muted-foreground",
                  )}
                >
                  {formatRelative(day, Date.now(), {
                    locale: getLocale(language),
                  })}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(
                    day,
                    isSameDay(day, today) ? "EEE, MMMM do" : "MMMM do",
                    { locale: getLocale(language) },
                  )}
                </div>
              </div>
              {!weatherLoading && weatherData && renderWeather(day)}
            </div>
            {renderCalendars(day)}
            {renderLabelEvents(day)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;
