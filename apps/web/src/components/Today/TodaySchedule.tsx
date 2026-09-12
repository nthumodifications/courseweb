import { FC, useMemo, useState, useEffect } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import { Cloud, MapPin, Clock, PartyPopper, ChevronDown } from "lucide-react";
import { apps } from "@/const/apps";
import useTime from "@/hooks/useTime";
import { NoClassPickedReminder } from "./NoClassPickedReminder";
import { TimetableItemDrawer } from "@/components/Timetable/TimetableItemDrawer";
import AppItem from "@/app/[lang]/(mods-pages)/apps/AppItem";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { Badge, Button, EmptyState, Section } from "@courseweb/ui";
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
  calendarEvents: UpcomingEvent[];
  hasCalendarEvent: boolean;
  hasWeather: boolean;
};

const getAcademicEventsForDay = (
  events: UpcomingEvent[],
  day: Date,
  showAcademicCalendar: boolean,
) =>
  events.filter(
    (event) =>
      event.state !== "past" &&
      (event.source === "academic" || event.source === "course-date") &&
      (event.source !== "academic" || showAcademicCalendar) &&
      getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
  );

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
  const [expandedRanges, setExpandedRanges] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const days = useMemo(
    () => [0, 1, 2, 3, 4].map((index) => addTaipeiDays(windowStart, index)),
    [windowStart],
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
        calendarEvents: getAcademicEventsForDay(
          dashboardEvents,
          day,
          showAcademicCalendar,
        ),
        hasCalendarEvent: dashboardEvents.some(
          (event) =>
            event.state !== "past" &&
            event.source === "calendar" &&
            getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
        ),
        hasWeather:
          isClient &&
          (weatherLoading ||
            Boolean(
              weather?.find((item) => item.date === getTaipeiDateKey(day)),
            )),
      })),
    [
      dashboardEvents,
      days,
      isClient,
      showAcademicCalendar,
      weather,
      weatherLoading,
    ],
  );

  const dayGroups = useMemo(
    () =>
      groupConsecutiveEmptyDays(
        daySchedules.map(({ day }) => day),
        (day) => {
          const schedule = daySchedules.find(
            (item) => getTaipeiDateKey(item.day) === getTaipeiDateKey(day),
          );
          // Weather is ambient, not something on the student's schedule: a day
          // with only a forecast is still a day with nothing on it, and letting
          // the forecast block the collapse puts the five identical "no class"
          // rows straight back.
          return Boolean(
            schedule &&
              schedule.classes.length === 0 &&
              schedule.calendarEvents.length === 0 &&
              !schedule.hasCalendarEvent,
          );
        },
      ),
    [daySchedules],
  );

  const renderDayTimetable = (
    day: Date,
    classesThisDay: UpcomingEvent[],
    insideCollapsedRange = false,
  ) => {
    if (classesThisDay.length === 0) {
      const isToday =
        getTaipeiDateKey(day) === getTaipeiDateKey(date) &&
        !insideCollapsedRange;
      // The day heading directly above already carries the weekday and the
      // date, so repeating them here just says the same thing twice.
      const title = isToday ? dict.today.noclass : dict.today.noclass_plain;

      return (
        <EmptyState
          icon={PartyPopper}
          title={title}
          description={isToday ? dict.today.noclass_sub : null}
          size="sm"
        />
      );
    }

    return classesThisDay.map((event) => {
      const course = event.course;
      const isNoClass = event.courseDate?.type === "no_class";
      const isSpecialDate = event.courseDate && !isNoClass;
      const content = (
        <div className="flex flex-row gap-2 items-start">
          <div
            className={cn(
              "mt-1 size-4 shrink-0 rounded-sm",
              isNoClass && "bg-muted-foreground",
            )}
            style={!isNoClass ? { backgroundColor: event.color } : undefined}
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
                className="self-start px-2 py-0 text-xs"
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

  const renderCalendars = (events: UpcomingEvent[]) => {
    return (
      events.length > 0 && (
        <UpcomingEventList
          events={events}
          compact
          showDayGroups={false}
          emptyStateSize="sm"
        />
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

  const renderDay = (schedule: DaySchedule, insideCollapsedRange = false) => {
    const { day, classes, calendarEvents } = schedule;
    return (
      <div
        className="flex min-w-0 flex-col gap-2 pb-4"
        key={getTaipeiDateKey(day)}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <div className="whitespace-nowrap font-semibold text-base">
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
        {calendarEvents.length > 0 && renderCalendars(calendarEvents)}
        {renderDayTimetable(day, classes, insideCollapsedRange)}
      </div>
    );
  };

  const renderDayGroup = (group: UpcomingDayGroup) => {
    if (group.kind !== "range") {
      return renderDay(
        daySchedules.find(
          (schedule) =>
            getTaipeiDateKey(schedule.day) === getTaipeiDateKey(group.days[0]),
        )!,
      );
    }

    const rangeKey = `${getTaipeiDateKey(group.days[0])}:${getTaipeiDateKey(group.days[group.days.length - 1])}`;
    const expanded = expandedRanges.has(rangeKey);
    const rangeTitle = dict.today.noclass_range
      .replace(
        "{start}",
        formatInTimeZone(group.days[0], UPCOMING_TIME_ZONE, "M/d"),
      )
      .replace(
        "{end}",
        formatInTimeZone(
          group.days[group.days.length - 1],
          UPCOMING_TIME_ZONE,
          "M/d",
        ),
      );

    return (
      <div className="min-w-0" key={rangeKey}>
        {/* The disclosure belongs under the row it opens, not floated off to
            the side of it. */}
        <div className="flex min-w-0 flex-col items-center gap-1">
          <EmptyState
            className="w-full min-w-0"
            icon={PartyPopper}
            title={rangeTitle}
            description={dict.today.noclass_range_sub}
            size="sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-10 gap-1 px-2 text-xs text-muted-foreground"
            aria-expanded={expanded}
            onClick={() =>
              setExpandedRanges((current) => {
                const next = new Set(current);
                if (next.has(rangeKey)) next.delete(rangeKey);
                else next.add(rangeKey);
                return next;
              })
            }
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
            {expanded ? dict.today.noclass_collapse : dict.today.noclass_expand}
          </Button>
        </div>
        {expanded && (
          <div className="mt-3 space-y-6 border-l border-border pl-3">
            {group.days.map((day) =>
              renderDay(
                daySchedules.find(
                  (schedule) =>
                    getTaipeiDateKey(schedule.day) === getTaipeiDateKey(day),
                )!,
                true,
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {isCoursesEmpty && <NoClassPickedReminder />}
      {renderPinnedApps()}
      {/* With nothing coming up, this card and the day list below it would both
          be saying "nothing" — the day list says it better, so only one of them
          speaks. */}
      {nextEvent && (
        <Section title={dict.today.upcoming.next_up} variant="card">
          <NextUpLine
            event={nextEvent}
            showLabel={false}
            className="border-0 bg-transparent p-0"
          />
        </Section>
      )}
      {dayGroups.map(renderDayGroup)}
    </div>
  );
};

export default TodaySchedule;
