import { FC, useMemo, useState, useEffect } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import { Cloud, MapPin, Clock } from "lucide-react";
import { apps } from "@/const/apps";
import useTime from "@/hooks/useTime";
import { NoClassPickedReminder } from "./NoClassPickedReminder";
import { TimetableItemDrawer } from "@/components/Timetable/TimetableItemDrawer";
import AppItem from "@/app/[lang]/(mods-pages)/apps/AppItem";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { Badge } from "@courseweb/ui";
import WeatherIcon from "./WeatherIcon";
import { cn } from "@courseweb/ui";
import { formatInTimeZone } from "date-fns-tz";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import { NextUpLine } from "@/components/Widgets/CountdownWidget";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useUpcomingEvents, {
  addTaipeiDays,
  getTaipeiDateKey,
  UPCOMING_TIME_ZONE,
} from "@/hooks/useUpcomingEvents";

const TodaySchedule: FC = () => {
  const { isCoursesEmpty } = useUserTimetable();
  const { language, pinnedApps, showAcademicCalendar } = useSettings();
  const dict = useDictionary();
  const date = useTime();
  const [isClient, setIsClient] = useState(false);
  const {
    events: dashboardEvents,
    nextEvent,
    windowStart,
  } = useUpcomingEvents({ includePast: true });
  const upcomingEvents = useMemo(
    () => dashboardEvents.filter((event) => event.state !== "past"),
    [dashboardEvents],
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const days = useMemo(
    () => [0, 1, 2, 3, 4].map((index) => addTaipeiDays(windowStart, index)),
    [windowStart],
  );

  const {
    data: weather,
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

  const renderDayTimetable = (day: Date) => {
    const classesThisDay = dashboardEvents.filter(
      (event) =>
        event.source === "class" &&
        getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
    );

    if (classesThisDay.length == 0)
      return (
        <div className="flex flex-row gap-2 items-start">
          <div className="size-4 rounded-sm mt-1 flex items-center justify-center">
            🎉
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{dict.today.noclass}</div>
            <div className="text-xs text-muted-foreground">
              {dict.today.noclass_sub}
            </div>
          </div>
        </div>
      );

    return classesThisDay.map((event) => {
      const course = event.course;
      const isNoClass = event.courseDate?.type === "no_class";
      const isSpecialDate = event.courseDate && !isNoClass;
      const content = (
        <div className="flex flex-row gap-2 items-start">
          <div
            className="size-4 rounded-sm mt-1 shrink-0"
            style={
              isNoClass
                ? {
                    background:
                      "repeating-linear-gradient(-45deg, #9ca3af, #9ca3af 4px, #6b7280 4px, #6b7280 8px)",
                  }
                : { backgroundColor: event.color }
            }
          />
          <div className="flex flex-col gap-1">
            <div
              className={cn(
                "font-semibold",
                isNoClass && "line-through text-muted-foreground",
              )}
            >
              {event.title}
            </div>
            {isSpecialDate && (
              <Badge
                variant="secondary"
                className="self-start text-[10px] px-1 py-0"
              >
                {event.courseDate?.type} · {event.courseDate?.title}
              </Badge>
            )}
            {isNoClass && (
              <div className="text-xs text-muted-foreground">
                {event.courseDate?.title || dict.today.noclass}
              </div>
            )}
            <div className="text-xs text-muted-foreground align-baseline">
              <Clock className="size-3 inline mr-1" />
              {formatInTimeZone(
                event.start,
                UPCOMING_TIME_ZONE,
                "HH:mm",
              )} - {formatInTimeZone(event.end, UPCOMING_TIME_ZONE, "HH:mm")}
            </div>
            <div className="text-xs text-muted-foreground align-baseline">
              <MapPin className="size-3 inline mr-1" />
              {event.location}
            </div>
          </div>
        </div>
      );
      return course ? (
        <TimetableItemDrawer course={course} key={event.id}>
          {content}
        </TimetableItemDrawer>
      ) : (
        <div key={event.id}>{content}</div>
      );
    });
  };

  const renderCalendars = (day: Date) => {
    const events = dashboardEvents.filter(
      (event) =>
        (event.source === "academic" || event.source === "course-date") &&
        (event.source !== "academic" || showAcademicCalendar) &&
        getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
    );
    return (
      events.length > 0 && (
        <UpcomingEventList events={events} compact showDayGroups={false} />
      )
    );
  };

  const renderWeather = (day: Date) => {
    if (!isClient) return null;

    const weatherData = weather?.find((w) => w.date == getTaipeiDateKey(day));
    if (!weatherData) return <></>;

    // Check if weatherData.weatherData is empty or doesn't contain necessary data
    if (
      !weatherData.weatherData ||
      Object.keys(weatherData.weatherData).length === 0 ||
      !weatherData.weatherData.Wx
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
        <WeatherIcon wxCode={weatherData.weatherData.Wx} />
        <span className="font-medium">{weatherData.weatherData.MaxT}°</span>
        <span className="text-muted-foreground text-xs">
          {weatherData.weatherData.MinT}°
        </span>
        <Badge variant="outline" className="ml-1 text-xs">
          {weatherData.weatherData.PoP12h}%
        </Badge>
      </div>
    );
  };

  const applist = apps.filter((app) => pinnedApps.includes(app.id));
  const renderPinnedApps = () => {
    return (
      <div className="flex flex-row flex-wrap gap-4 pb-2">
        {applist.map((app, index) => (
          <AppItem key={index} app={app} mini />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full px-3 md:px-8 space-y-4">
      {isCoursesEmpty && <NoClassPickedReminder />}
      {renderPinnedApps()}
      <NextUpLine event={nextEvent} />
      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-2 text-base font-semibold">
          {dict.calendar.upcoming_events}
        </h2>
        <UpcomingEventList events={upcomingEvents} compact maxEvents={8} />
      </section>
      {days.map((day) => (
        <div className="flex flex-col gap-2 pb-4" key={getTaipeiDateKey(day)}>
          <div className="flex flex-row justify-between">
            <div className="flex flex-row flex-1 items-baseline gap-2">
              <div className="whitespace-nowrap font-semibold text-lg">
                {getTaipeiDateKey(day) === getTaipeiDateKey(date)
                  ? dict.today.upcoming.today
                  : getTaipeiDateKey(day) ===
                      getTaipeiDateKey(addTaipeiDays(date, 1))
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
            {isClient && !weatherLoading && weather && renderWeather(day)}
          </div>
          {renderCalendars(day)}
          {renderDayTimetable(day)}
        </div>
      ))}
    </div>
  );
};

export default TodaySchedule;
