import { useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { getLocale } from "@/helpers/dateLocale";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import WeatherIcon from "@/components/Today/WeatherIcon";
import client from "@/config/api";
import { Badge, Button, EmptyState, Section } from "@courseweb/ui";
import { Calendar as CalendarIcon, ChevronDown, Cloud } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";
import useUpcomingEvents, {
  addTaipeiDays,
  groupConsecutiveEmptyDays,
  getTaipeiDateKey,
  UPCOMING_TIME_ZONE,
  UpcomingDayGroup,
} from "@/hooks/useUpcomingEvents";
import { useQuery } from "@tanstack/react-query";

const UpcomingEvents = () => {
  const { language, showAcademicCalendar } = useSettings();
  const today = useTime();
  const dict = useDictionary();
  const { events, windowStart } = useUpcomingEvents();
  const [expandedRanges, setExpandedRanges] = useState<Set<string>>(
    () => new Set(),
  );
  const days = useMemo(
    () => [0, 1, 2, 3, 4].map((index) => addTaipeiDays(windowStart, index)),
    [windowStart],
  );

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await client.weather.$get();
      return await res.json();
    },
  });

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) => event.source !== "academic" || showAcademicCalendar,
      ),
    [events, showAcademicCalendar],
  );

  const eventsForDay = (day: Date) =>
    visibleEvents.filter(
      (event) => getTaipeiDateKey(event.start) === getTaipeiDateKey(day),
    );

  const dayGroups = useMemo(
    () =>
      groupConsecutiveEmptyDays(days, (day) =>
        visibleEvents.every(
          (event) => getTaipeiDateKey(event.start) !== getTaipeiDateKey(day),
        ),
      ),
    [days, visibleEvents],
  );

  const renderWeather = (day: Date) => {
    const weatherItem = weatherData?.find(
      (w) => w.date === getTaipeiDateKey(day),
    );
    if (!weatherItem) return null;

    if (
      !weatherItem.weatherData ||
      Object.keys(weatherItem.weatherData).length === 0 ||
      !weatherItem.weatherData.Wx
    ) {
      return (
        <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
          <Cloud className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {dict.calendar.updating}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
        <WeatherIcon wxCode={weatherItem.weatherData.Wx} />
        <span className="font-medium">{weatherItem.weatherData.MaxT}°</span>
        <span className="text-xs text-muted-foreground">
          {weatherItem.weatherData.MinT}°
        </span>
        <Badge variant="outline" className="ml-1 text-xs">
          {weatherItem.weatherData.PoP12h}%
        </Badge>
      </div>
    );
  };

  const renderDay = (day: Date) => {
    const dayEvents = eventsForDay(day);
    const dayTitle =
      getTaipeiDateKey(day) === getTaipeiDateKey(today)
        ? dict.today.upcoming.today
        : getTaipeiDateKey(day) === getTaipeiDateKey(addTaipeiDays(today, 1))
          ? dict.today.upcoming.tomorrow
          : formatInTimeZone(day, UPCOMING_TIME_ZONE, "EEEE", {
              locale: getLocale(language),
            });

    return (
      <div
        className="flex min-w-0 flex-col gap-2 pb-4"
        key={getTaipeiDateKey(day)}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <div className="whitespace-nowrap text-base font-semibold">
              {dayTitle}
            </div>
            <div className="whitespace-nowrap text-sm text-muted-foreground">
              {formatInTimeZone(day, UPCOMING_TIME_ZONE, "M/d", {
                locale: getLocale(language),
              })}
            </div>
          </div>
          {!weatherLoading && weatherData && renderWeather(day)}
        </div>
        <UpcomingEventList events={dayEvents} />
      </div>
    );
  };

  const renderDayGroup = (group: UpcomingDayGroup) => {
    if (group.kind !== "range") return renderDay(group.days[0]);

    const rangeKey = `${getTaipeiDateKey(group.days[0])}:${getTaipeiDateKey(group.days[group.days.length - 1])}`;
    const expanded = expandedRanges.has(rangeKey);
    const rangeTitle = dict.calendar.no_events_range
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
        {!expanded ? (
          <div className="flex min-w-0 items-start gap-2">
            <EmptyState
              className="min-w-0 flex-1"
              icon={CalendarIcon}
              title={rangeTitle}
              description={dict.calendar.empty_description}
              size="sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10 shrink-0 gap-1 px-2 text-xs"
              aria-expanded={expanded}
              onClick={() =>
                setExpandedRanges((current) => {
                  const next = new Set(current);
                  next.add(rangeKey);
                  return next;
                })
              }
            >
              <ChevronDown className="size-4" aria-hidden="true" />
              {dict.calendar.no_events_expand}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10 gap-1 px-2 text-xs"
                aria-expanded={expanded}
                onClick={() =>
                  setExpandedRanges((current) => {
                    const next = new Set(current);
                    next.delete(rangeKey);
                    return next;
                  })
                }
              >
                <ChevronDown className="size-4 rotate-180" aria-hidden="true" />
                {dict.calendar.no_events_collapse}
              </Button>
            </div>
            <div className="space-y-6">{group.days.map(renderDay)}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <Section title={dict.calendar.upcoming_events} className="h-full min-w-0">
      <div className="max-h-[calc(100vh-12rem)] min-w-0 overflow-x-hidden overflow-y-auto">
        {dayGroups.map(renderDayGroup)}
      </div>
    </Section>
  );
};

export default UpcomingEvents;
