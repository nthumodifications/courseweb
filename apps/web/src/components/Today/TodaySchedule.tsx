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
  groupConsecutiveEmptyDays,
  getTaipeiDateKey,
  UPCOMING_TIME_ZONE,
  UpcomingDayGroup,
  UpcomingEvent,
} from "@/hooks/useUpcomingEvents";

type DaySchedule = {
  day: Date;
  classes: UpcomingEvent[];
  otherEvents: UpcomingEvent[];
};

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
  useEffect(() => {
    setIsClient(true);
  }, []);

  const days = useMemo(
    () => [0, 1, 2, 3, 4].map((index) => addTaipeiDays(windowStart, index)),
    [windowStart],
  );

  const upcomingEvents = useMemo(
    () =>
      dashboardEvents.filter(
        (event) =>
          event.state !== "past" &&
          !days.some(
            (day) => getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
          ),
      ),
    [dashboardEvents, days],
  );

  const { data: weather, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
      const data = await res.json();
      return data;
    },
  });

  const daySchedules = useMemo<DaySchedule[]>(
    () =>
      days.map((day) => ({
        day,
        classes: dashboardEvents.filter(
          (event) =>
            event.source === "class" &&
            getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
        ),
        otherEvents: dashboardEvents.filter(
          (event) =>
            event.state !== "past" &&
            event.source !== "class" &&
            (event.source !== "academic" || showAcademicCalendar) &&
            getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
        ),
      })),
    [dashboardEvents, days, showAcademicCalendar],
  );

  const dayGroups = useMemo(
    () =>
      groupConsecutiveEmptyDays(
        daySchedules.map(({ day }) => day),
        (day) => {
          const schedule = daySchedules.find(
            (item) => getTaipeiDateKey(item.day) === getTaipeiDateKey(day),
          );
          return Boolean(
            schedule &&
              schedule.classes.length === 0 &&
              schedule.otherEvents.length === 0,
          );
        },
      ),
    [daySchedules],
  );

  const renderDayTimetable = (classesThisDay: UpcomingEvent[]) =>
    classesThisDay.map((event) => {
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
                "font-medium",
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

  const renderCalendars = (events: UpcomingEvent[]) => {
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
          <Cloud className="h-5 w-5 text-muted-foreground" />
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

  const renderDay = (schedule: DaySchedule) => {
    const { day, classes, otherEvents } = schedule;
    return (
      <div
        className="flex min-w-0 flex-col gap-2 py-4"
        key={getTaipeiDateKey(day)}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <div className="whitespace-nowrap font-bold">
              {getTaipeiDateKey(day) === getTaipeiDateKey(date)
                ? dict.today.upcoming.today
                : getTaipeiDateKey(day) ===
                    getTaipeiDateKey(addTaipeiDays(date, 1))
                  ? dict.today.upcoming.tomorrow
                  : formatInTimeZone(day, UPCOMING_TIME_ZONE, "EEEE", {
                      locale: getLocale(language),
                    })}
            </div>
            <div className="whitespace-nowrap text-sm text-muted-foreground">
              {formatInTimeZone(day, UPCOMING_TIME_ZONE, "M/d", {
                locale: getLocale(language),
              })}
            </div>
          </div>
          {isClient && !weatherLoading && weather && renderWeather(day)}
        </div>
        {renderCalendars(otherEvents)}
        {renderDayTimetable(classes)}
      </div>
    );
  };

  const dayLabel = (day: Date) =>
    getTaipeiDateKey(day) === getTaipeiDateKey(date)
      ? dict.today.upcoming.today
      : getTaipeiDateKey(day) === getTaipeiDateKey(addTaipeiDays(date, 1))
        ? dict.today.upcoming.tomorrow
        : formatInTimeZone(day, UPCOMING_TIME_ZONE, "EEEE", {
            locale: getLocale(language),
          });

  const renderEmptyDayGroup = (group: UpcomingDayGroup) => {
    const firstDay = group.days[0];
    const lastDay = group.days[group.days.length - 1];
    const rangeCount =
      language === "zh"
        ? (["", "一", "二", "三", "四", "五"][group.days.length] ??
          String(group.days.length))
        : String(group.days.length);
    const identity =
      group.kind === "day"
        ? dayLabel(firstDay)
        : dict.today.noclass_range
            .replace(
              "{start}",
              formatInTimeZone(firstDay, UPCOMING_TIME_ZONE, "M/d"),
            )
            .replace(
              "{end}",
              formatInTimeZone(lastDay, UPCOMING_TIME_ZONE, "M/d"),
            )
            .replace("{count}", rangeCount);

    return (
      <div
        className="flex min-w-0 items-baseline justify-between gap-4 py-4 opacity-30"
        key={getTaipeiDateKey(firstDay)}
      >
        <span className="min-w-0 font-medium">{identity}</span>
        <span className="shrink-0 whitespace-nowrap font-bold">
          {dict.today.noclass_plain}
        </span>
      </div>
    );
  };

  const renderDayGroup = (group: UpcomingDayGroup) => {
    if (group.kind === "range") return renderEmptyDayGroup(group);
    const schedule = daySchedules.find(
      (item) => getTaipeiDateKey(item.day) === getTaipeiDateKey(group.days[0]),
    );
    if (!schedule) return null;
    if (schedule.classes.length === 0 && schedule.otherEvents.length === 0) {
      return renderEmptyDayGroup(group);
    }
    return renderDay(schedule);
  };

  return (
    <div className="h-full w-full min-w-0 space-y-4 px-4">
      {isCoursesEmpty && <NoClassPickedReminder />}
      {renderPinnedApps()}
      <NextUpLine event={nextEvent} />
      {upcomingEvents.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-2 text-base font-medium">
            {dict.calendar.upcoming_events}
          </h2>
          <UpcomingEventList events={upcomingEvents} compact maxEvents={8} />
        </section>
      )}
      <div className="flex min-w-0 flex-col divide-y divide-border">
        {dayGroups.map(renderDayGroup)}
      </div>
    </div>
  );
};

export default TodaySchedule;
