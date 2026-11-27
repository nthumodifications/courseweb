import { FC, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, cn } from "@courseweb/ui";
import { Cloud, Clock, MapPin } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import client from "@/config/api";
import { contentLanguage } from "@/helpers/contentLanguage";
import { getLocale } from "@/helpers/dateLocale";
import useTime from "@/hooks/useTime";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useUpcomingEvents, {
  addTaipeiDays,
  getTaipeiDateKey,
  groupConsecutiveEmptyDays,
  UPCOMING_TIME_ZONE,
  type UpcomingDayGroup,
  type UpcomingEvent,
} from "@/hooks/useUpcomingEvents";
import { TimetableItemDrawer } from "@/components/Timetable/TimetableItemDrawer";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import WeatherIcon from "./WeatherIcon";
import { NoClassPickedReminder } from "./NoClassPickedReminder";

type DaySchedule = {
  day: Date;
  classes: UpcomingEvent[];
  otherEvents: UpcomingEvent[];
  hasWeather: boolean;
};

type TimetableAgendaProps = {
  days?: number;
};

const TimetableAgenda: FC<TimetableAgendaProps> = ({
  days: requestedDays = 5,
}) => {
  const daysToShow = Math.min(5, Math.max(1, Math.floor(requestedDays)));
  const { isCoursesEmpty } = useUserTimetable();
  const { language, showAcademicCalendar } = useSettings();
  const dict = useDictionary();
  const date = useTime();
  const [isClient, setIsClient] = useState(false);
  const { events, windowStart } = useUpcomingEvents({
    includePast: true,
    windowDays: daysToShow,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const agendaDays = useMemo(
    () =>
      Array.from({ length: daysToShow }, (_, index) =>
        addTaipeiDays(windowStart, index),
      ),
    [daysToShow, windowStart],
  );

  const { data: weather, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const response = await client.weather.$get();
      return await response.json();
    },
  });

  const daySchedules = useMemo<DaySchedule[]>(
    () =>
      agendaDays.map((day) => ({
        day,
        classes: events.filter(
          (event) =>
            event.source === "class" &&
            getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
        ),
        otherEvents: events.filter(
          (event) =>
            event.state !== "past" &&
            event.source !== "class" &&
            (event.source !== "academic" || showAcademicCalendar) &&
            getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
        ),
        hasWeather:
          isClient &&
          Boolean(
            weather?.find(
              (item: { date: string }) => item.date === getTaipeiDateKey(day),
            ),
          ),
      })),
    [agendaDays, events, isClient, showAcademicCalendar, weather],
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
            schedule?.classes.length === 0 &&
              schedule.otherEvents.length === 0 &&
              !schedule.hasWeather,
          );
        },
      ),
    [daySchedules],
  );

  const renderDayTimetable = (classesThisDay: UpcomingEvent[]) =>
    classesThisDay.map((event) => {
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
      return event.course ? (
        <TimetableItemDrawer course={event.course} key={event.id}>
          {content}
        </TimetableItemDrawer>
      ) : (
        <div key={event.id}>{content}</div>
      );
    });

  const renderDay = (schedule: DaySchedule) => {
    const { day, classes, otherEvents } = schedule;
    const dayKey = getTaipeiDateKey(day);
    const dateKey = getTaipeiDateKey(date);
    const tomorrowKey = getTaipeiDateKey(addTaipeiDays(date, 1));
    return (
      <div className="flex min-w-0 flex-col gap-2 py-4" key={dayKey}>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <div className="whitespace-nowrap font-bold">
              {dayKey === dateKey
                ? dict.today.upcoming.today
                : dayKey === tomorrowKey
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
        {otherEvents.length > 0 && (
          <UpcomingEventList
            events={otherEvents}
            compact
            showDayGroups={false}
          />
        )}
        {renderDayTimetable(classes)}
      </div>
    );
  };

  const dayLabel = (day: Date) => {
    const dayKey = getTaipeiDateKey(day);
    if (dayKey === getTaipeiDateKey(date)) return dict.today.upcoming.today;
    if (dayKey === getTaipeiDateKey(addTaipeiDays(date, 1)))
      return dict.today.upcoming.tomorrow;
    return formatInTimeZone(day, UPCOMING_TIME_ZONE, "EEEE", {
      locale: getLocale(language),
    });
  };

  const renderEmptyDayGroup = (group: UpcomingDayGroup) => {
    const firstDay = group.days[0]!;
    const lastDay = group.days.at(-1)!;
    const rangeCount =
      contentLanguage(language) === "zh"
        ? new Intl.NumberFormat("zh-u-nu-hanidec").format(group.days.length)
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
        className="flex min-w-0 items-baseline justify-between gap-4 py-4"
        key={getTaipeiDateKey(firstDay)}
      >
        <span className="min-w-0 font-medium text-foreground">{identity}</span>
        <span className="shrink-0 whitespace-nowrap text-right font-bold">
          {dict.today.noclass_plain}
        </span>
      </div>
    );
  };

  const renderDayGroup = (group: UpcomingDayGroup) => {
    if (group.kind === "range") return renderEmptyDayGroup(group);
    const schedule = daySchedules.find(
      (item) => getTaipeiDateKey(item.day) === getTaipeiDateKey(group.days[0]!),
    );
    if (!schedule) return null;
    if (
      schedule.classes.length === 0 &&
      schedule.otherEvents.length === 0 &&
      !schedule.hasWeather
    ) {
      return renderEmptyDayGroup(group);
    }
    return renderDay(schedule);
  };

  const renderWeather = (day: Date) => {
    if (!isClient) return null;
    const weatherData = weather?.find(
      (item: { date: string }) => item.date === getTaipeiDateKey(day),
    );
    if (!weatherData) return null;
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

  return (
    <div className="min-w-0 px-4">
      {isCoursesEmpty && <NoClassPickedReminder />}
      <div className="flex min-w-0 flex-col divide-y divide-border">
        {dayGroups.map(renderDayGroup)}
      </div>
    </div>
  );
};

export default TimetableAgenda;
