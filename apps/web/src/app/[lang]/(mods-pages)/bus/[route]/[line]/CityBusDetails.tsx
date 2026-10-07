import {
  Button,
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@courseweb/ui";
import { ChevronLeft, ExternalLink, Star } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import {
  formatDepartureCountdown,
  formatNextServiceDay,
  formatDepartureTime,
  getCityBusDayTypeForDate,
  getCityBusTimetable,
  getDistinctCityBusDirections,
  getCityBusDepartures,
  getCityBusRoute,
  getNextScheduledDepartures,
  hasDistinctCityBusDayTypes,
  type CityBusDayType,
  type CityBusRoute,
} from "@/libs/citybus";
import useTime from "@/hooks/useTime";
import { useBusPins, type CityBusPin } from "@/features/bus/busPins";
import { CityBusLineBadge } from "@/features/bus/CityBusLineBadge";
import { cn } from "@courseweb/ui";

type CityBusDetailsProps = {
  routeId: string;
};

function CityBusDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex items-center gap-4 border-b border-border py-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="divide-y divide-border">
        {[0, 1, 2].map((item) => (
          <div
            className="flex items-center justify-between gap-4 py-4"
            key={item}
          >
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function directionOptionLabel(
  directions: CityBusRoute["directions"],
  directionId: string,
  language: "zh" | "en",
  to: string,
) {
  const direction = directions.find((item) => item.id === directionId);
  if (!direction) return directionId;
  const destination =
    language === "zh" ? direction.destinationZh : direction.destinationEn;
  if (directions.length <= 2) return `${to} ${destination}`;
  const label = language === "zh" ? direction.labelZh : direction.labelEn;
  return `${to} ${destination} · ${label}`;
}

const CityBusDetails = ({ routeId }: CityBusDetailsProps) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const now = useTime(60_000);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pinned, toggle } = useBusPins();
  const returnUrl =
    searchParams.get("return_url") ?? `/${language}/bus?tab=city`;
  const directionId = searchParams.get("direction");
  const stopId = searchParams.get("stop");

  const {
    data: route,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["citybus_static_route", routeId],
    queryFn: () => getCityBusRoute(routeId),
    staleTime: 60 * 60 * 1000,
  });
  const directions = useMemo(
    () => (route ? getDistinctCityBusDirections(route) : []),
    [route],
  );
  const direction =
    directions.find((item) => item.id === directionId) ?? directions[0];
  const stop =
    direction?.stops.find((item) => item.id === stopId) ??
    direction?.stops.find((item) => item.nearCampus) ??
    direction?.stops[0];
  const { data: departureData, isLoading: isDepartureLoading } = useQuery({
    queryKey: ["citybus_departures", routeId, direction?.id, stop?.id],
    queryFn: () => getCityBusDepartures(routeId, direction!.id, stop!.id, 5),
    enabled: Boolean(direction && stop),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
  const [dayType, setDayType] = useState<CityBusDayType>(
    getCityBusDayTypeForDate(new Date()),
  );

  const pin = useMemo<CityBusPin | undefined>(() => {
    if (!route || !direction || !stop) return undefined;
    return {
      kind: "city",
      routeId: route.id,
      directionId: direction.id,
      stopId: stop.id,
      routeNameZh: route.nameZh,
      routeNameEn: route.nameEn,
      stopNameZh: stop.nameZh,
      stopNameEn: stop.nameEn,
    };
  }, [route, direction, stop]);

  const scheduledDepartures = useMemo(
    () =>
      route && direction && stop
        ? getNextScheduledDepartures(route, direction.id, stop.id, now, 5)
        : [],
    [direction, now, route, stop],
  );
  const nextDepartures = useMemo(() => {
    const candidates = departureData?.realtime
      ? [...(departureData.departures ?? []), ...scheduledDepartures]
      : scheduledDepartures.length > 0
        ? scheduledDepartures
        : (departureData?.departures ?? []);
    const seen = new Set<string>();
    return candidates
      .sort((a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity))
      .filter((departure) => {
        const key = `${departure.departureTime}:${departure.dayOffset ?? 0}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [departureData, scheduledDepartures]);
  const hasDayTypeSwitch = Boolean(
    route &&
      direction &&
      stop &&
      hasDistinctCityBusDayTypes(route, direction.id, stop.id),
  );
  const timetable = useMemo(
    () =>
      route && direction && stop
        ? getCityBusTimetable(route, direction.id, stop.id, now, dayType)
        : [],
    [dayType, direction, now, route, stop],
  );

  const navigateTo = (nextDirectionId: string, nextStopId: string) => {
    navigate(
      `/${language}/bus/city/${encodeURIComponent(routeId)}?direction=${encodeURIComponent(nextDirectionId)}&stop=${encodeURIComponent(nextStopId)}&return_url=${encodeURIComponent(returnUrl)}`,
      { replace: true },
    );
  };

  if (isLoading) return <CityBusDetailsSkeleton />;
  if (error || !route || !direction || !stop || !pin) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <ErrorState title={dict.bus.city_unavailable} />
        <Button variant="outline" asChild>
          <Link to={returnUrl}>{dict.bus.back_to_bus}</Link>
        </Button>
      </div>
    );
  }

  const routeName = language === "zh" ? route.nameZh : route.nameEn;
  const stopName = language === "zh" ? stop.nameZh : stop.nameEn;
  const destination =
    language === "zh" ? direction.destinationZh : direction.destinationEn;
  const nearCampusStops = direction.stops.filter((item) => item.nearCampus);
  const otherStops = direction.stops.filter((item) => !item.nearCampus);
  const selected = pinned(pin);
  const firstDeparture = nextDepartures[0];

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex items-center gap-4 border-b border-border py-4">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 shrink-0"
          asChild
        >
          <Link to={returnUrl} aria-label={dict.bus.back_to_bus}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CityBusLineBadge
              nameZh={route.nameZh}
              nameEn={route.nameEn}
              category={route.category}
              language={language as "zh" | "en"}
            />
            <h1 className="font-bold">{routeName}</h1>
          </div>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">
            {dict.bus.head_to} {destination}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "min-h-11 min-w-11 shrink-0",
            selected ? "text-nthu-500" : "text-muted-foreground",
          )}
          aria-label={selected ? dict.bus.remove_bus : dict.bus.add_bus}
          onClick={() => toggle(pin)}
        >
          <Star className="h-4 w-4" fill={selected ? "currentColor" : "none"} />
        </Button>
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-border p-3">
        <div className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <span className="shrink-0 text-muted-foreground">
            {dict.bus.from_stop}
          </span>
          <Select
            value={stop.id}
            onValueChange={(value) => navigateTo(direction.id, value)}
          >
            <SelectTrigger id="city-bus-stop" className="h-11 min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nearCampusStops.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {language === "zh" ? item.nameZh : item.nameEn}
                </SelectItem>
              ))}
              {otherStops.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {language === "zh" ? item.nameZh : item.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span aria-hidden="true">→</span>
          <span className="max-w-[38%] truncate">{destination}</span>
        </div>
        {directions.length === 2 ? (
          <div className="grid grid-cols-2 gap-2" role="tablist">
            {directions.map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={item.id === direction.id}
                className={cn(
                  "min-h-11 rounded-lg border px-2 text-sm font-medium",
                  item.id === direction.id
                    ? "border-nthu-500 bg-nthu-500/10 text-nthu-500"
                    : "border-border text-muted-foreground",
                )}
                key={item.id}
                onClick={() => {
                  const nextStop =
                    item.stops.find((stop) => stop.nearCampus) ?? item.stops[0];
                  if (nextStop) navigateTo(item.id, nextStop.id);
                }}
              >
                {directionOptionLabel(
                  directions,
                  item.id,
                  language as "zh" | "en",
                  dict.bus.head_to,
                )}
              </button>
            ))}
          </div>
        ) : (
          <Select
            value={direction.id}
            onValueChange={(value) => {
              const nextDirection = directions.find(
                (item) => item.id === value,
              );
              const nextStop = nextDirection
                ? (nextDirection.stops.find((stop) => stop.nearCampus) ??
                  nextDirection.stops[0])
                : undefined;
              if (nextDirection && nextStop)
                navigateTo(nextDirection.id, nextStop.id);
            }}
          >
            <SelectTrigger id="city-bus-direction" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {directions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {directionOptionLabel(
                    directions,
                    item.id,
                    language as "zh" | "en",
                    dict.bus.head_to,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-bold">{stopName}</h2>
            <p className="text-sm font-medium text-muted-foreground">
              {departureData?.realtime ? dict.bus.realtime : dict.bus.scheduled}
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {destination}
          </span>
        </div>
        <div className="divide-y divide-border" aria-live="polite">
          {isDepartureLoading ? (
            [0, 1, 2].map((item) => (
              <div
                className="flex items-center justify-between gap-4 py-4"
                key={item}
              >
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))
          ) : nextDepartures.length ? (
            (() => {
              const todayCount = nextDepartures.filter(
                (departure) => (departure.dayOffset ?? 0) === 0,
              ).length;
              const showNextServiceDay = todayCount < 3;
              return nextDepartures.map((departure, index) => {
                const dayOffset = departure.dayOffset ?? 0;
                const previousDayOffset =
                  nextDepartures[index - 1]?.dayOffset ?? 0;
                const showDayHeader =
                  showNextServiceDay &&
                  dayOffset > 0 &&
                  dayOffset !== previousDayOffset;
                return (
                  <Fragment
                    key={`${departure.departureTime}-${departure.minutes}-${departure.dayOffset}`}
                  >
                    {showDayHeader && (
                      <p className="pt-4 text-xs font-bold text-muted-foreground">
                        {formatNextServiceDay(
                          dayOffset,
                          now,
                          language as "zh" | "en",
                          dict.bus.tomorrow,
                        )}
                      </p>
                    )}
                    <div className="flex flex-col gap-1 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-nthu-500">
                          {dayOffset > 0
                            ? departure.departureTime
                            : formatDepartureTime(
                                departure,
                                language as "zh" | "en",
                                {
                                  tomorrow: dict.bus.tomorrow,
                                  daysAfter: dict.bus.days_after,
                                },
                              )}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-muted-foreground">
                          {departure.kind === "frequency"
                            ? `${dict.bus.frequency_window} ${departure.frequency?.headwayMinutes ?? ""} ${dict.bus.minutes}`
                            : departure.status === "approaching"
                              ? dict.bus.approaching
                              : dayOffset === 0 &&
                                  index < 2 &&
                                  departure.minutes !== undefined
                                ? formatDepartureCountdown(
                                    departure.minutes,
                                    language as "zh" | "en",
                                    {
                                      underHour: dict.bus.minutes,
                                      minute: dict.bus.countdown_minute,
                                      hour: dict.bus.countdown_hour,
                                    },
                                  )
                                : dict.bus.scheduled}
                        </span>
                      </div>
                      {departure.timeBasis === "origin" && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {dict.bus.from_origin} ·{" "}
                          {language === "zh"
                            ? departure.originStopNameZh
                            : departure.originStopNameEn}
                        </p>
                      )}
                    </div>
                  </Fragment>
                );
              });
            })()
          ) : (
            <div className="flex flex-col gap-2 py-4">
              <p className="text-sm text-muted-foreground">
                {route.source === "intercity" && route.timesUrl
                  ? dict.bus.times_not_available
                  : departureData?.status === "no_timetable"
                    ? dict.bus.no_timetable
                    : dict.bus.city_no_service}
              </p>
              {route.source === "intercity" && route.timesUrl && (
                <a
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-nthu-500"
                  href={route.timesUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {dict.bus.operator_times}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
        {firstDeparture?.timeBasis === "stop" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {dict.bus.at_stop}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold">{dict.bus.full_day_timetable}</h2>
          {hasDayTypeSwitch && (
            <div className="flex shrink-0 gap-1" role="tablist">
              {(["weekday", "weekend"] as const).map((item) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={item === dayType}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium",
                    item === dayType
                      ? "bg-nthu-500/10 text-nthu-500"
                      : "text-muted-foreground",
                  )}
                  key={item}
                  onClick={() => setDayType(item)}
                >
                  {item === "weekday" ? dict.bus.weekdays : dict.bus.weekends}
                </button>
              ))}
            </div>
          )}
        </div>
        <div
          className="divide-y divide-border"
          aria-label={dict.bus.full_day_timetable}
        >
          {timetable.length ? (
            timetable.map((departure) => (
              <div
                className={cn(
                  "flex items-center justify-between gap-4 py-3",
                  departure.past && "opacity-40",
                )}
                key={`${departure.departureTime}-${departure.kind}-${departure.timeBasis}`}
              >
                <span className="font-bold text-nthu-500">
                  {departure.departureTime}
                </span>
                <span className="shrink-0 text-sm font-medium text-muted-foreground">
                  {departure.kind === "frequency"
                    ? `${dict.bus.frequency_window} ${departure.frequency?.headwayMinutes ?? ""} ${dict.bus.minutes}`
                    : departure.past
                      ? dict.bus.departed
                      : dict.bus.scheduled}
                </span>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              {dict.bus.no_timetable}
            </p>
          )}
        </div>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {route.sourceInfo.attribution} · {route.sourceInfo.license}
      </p>
      <div className="h-6" />
    </div>
  );
};

export default CityBusDetails;
