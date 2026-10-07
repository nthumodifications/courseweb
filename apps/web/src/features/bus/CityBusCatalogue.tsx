import { Button, ErrorState, Input, Skeleton } from "@courseweb/ui";
import { ExternalLink, Plus, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import {
  formatDepartureCountdown,
  formatDepartureTime,
  getCityBusDepartures,
  getCityBusRoutes,
  type CityBusDirectionSummary,
  type CityBusRouteSummary,
} from "@/libs/citybus";
import { BusListingItem } from "./BusListingItem";
import { CityBusLineBadge } from "./CityBusLineBadge";
import {
  isBusPinned,
  useBusPins,
  type BusPin,
  type CityBusPin,
} from "./busPins";

const SUGGESTED_ROUTES = new Set([
  "blue",
  "blue-1",
  "2",
  "31",
  "72",
  "73",
  "83",
  "182",
]);

function localized(
  language: string,
  value: { nameZh: string; nameEn: string },
) {
  return language === "zh" ? value.nameZh : value.nameEn;
}

function destinationSummary(
  language: string,
  route: CityBusRouteSummary,
  moreDirections: string,
) {
  const destinations = [
    ...new Set(
      route.directions.map((direction) =>
        language === "zh" ? direction.destinationZh : direction.destinationEn,
      ),
    ),
  ];
  if (destinations.length <= 1) return destinations[0] ?? "";
  return `${destinations[0]} · ${moreDirections
    .replace("{count}", String(destinations.length - 1))
    .replace("{total}", String(destinations.length))}`;
}

function makePin(
  route: CityBusRouteSummary,
  direction: CityBusDirectionSummary,
  stop: { id: string; nameZh: string; nameEn: string },
): CityBusPin {
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
}

function defaultSelection(route: CityBusRouteSummary) {
  const direction =
    route.directions.find((item) => item.campusStops.length > 0) ??
    route.directions[0];
  const stop = direction?.campusStops[0];
  return direction && stop ? { direction, stop } : undefined;
}

function CityBusSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((item) => (
        <div className="flex min-h-11 items-center gap-3 py-3" key={item}>
          <Skeleton className="h-7 w-10 rounded-full" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function CatalogueRouteRow({
  route,
  language,
  dict,
  pins,
  togglePin,
}: {
  route: CityBusRouteSummary;
  language: string;
  dict: ReturnType<typeof useDictionary>;
  pins: BusPin[];
  togglePin: (pin: BusPin) => void;
}) {
  const navigate = useNavigate();
  const selection = defaultSelection(route);
  const pin = selection
    ? makePin(route, selection.direction, selection.stop)
    : undefined;
  const isPinned = pin ? isBusPinned(pins, pin) : false;
  const routeName = localized(language, route);
  const stopName = selection
    ? localized(language, selection.stop)
    : dict.bus.no_campus_stop;
  const detailUrl = `/${language}/bus/city/${encodeURIComponent(route.id)}${selection ? `?direction=${encodeURIComponent(selection.direction.id)}&stop=${encodeURIComponent(selection.stop.id)}` : ""}`;

  return (
    <div className="flex min-h-11 items-start gap-3 py-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate(detailUrl)}
      >
        <CityBusLineBadge
          nameZh={route.nameZh}
          nameEn={route.nameEn}
          category={route.category}
          language={language as "zh" | "en"}
        />
        <span className="min-w-0 flex-1 text-sm leading-relaxed">
          <span className="block break-words font-bold">{routeName}</span>
          <span className="block break-words font-bold">
            {destinationSummary(language, route, dict.bus.more_directions)}
          </span>
          <span className="block break-words font-medium text-muted-foreground">
            {stopName}
            {route.source === "intercity" && (
              <span className="ml-2">{dict.bus.times_not_available}</span>
            )}
          </span>
        </span>
      </button>
      {route.source === "intercity" && route.timesUrl && (
        <a
          className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={route.timesUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={dict.bus.operator_times}
          title={dict.bus.operator_times}
          onClick={(event) => event.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11 shrink-0"
        aria-label={pin && isPinned ? dict.bus.remove_bus : dict.bus.add_bus}
        onClick={() => {
          if (pin) togglePin(pin);
          else navigate(detailUrl);
        }}
      >
        {pin && isPinned ? (
          <Star className="h-4 w-4 text-nthu-500" fill="currentColor" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function RouteSection({
  title,
  caption,
  routes,
  language,
  dict,
  pins,
  togglePin,
}: {
  title: string;
  caption?: string;
  routes: CityBusRouteSummary[];
  language: string;
  dict: ReturnType<typeof useDictionary>;
  pins: BusPin[];
  togglePin: (pin: BusPin) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        <span className="text-xs font-medium text-muted-foreground">
          {routes.length}
        </span>
      </div>
      {caption && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {caption}
        </p>
      )}
      {routes.length > 0 && (
        <div className="divide-y divide-border">
          {routes.map((route) => (
            <CatalogueRouteRow
              key={route.id}
              route={route}
              language={language}
              dict={dict}
              pins={pins}
              togglePin={togglePin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function getPinnedDetails(
  routes: CityBusRouteSummary[] | undefined,
  pins: Extract<BusPin, { kind: "city" }>[],
) {
  return pins.flatMap((pin) => {
    const route = routes?.find((item) => item.id === pin.routeId);
    const direction = route?.directions.find(
      (item) =>
        item.id === pin.directionId ||
        item.campusStops.some((stop) => stop.id === pin.stopId),
    );
    const stop = direction?.campusStops.find((item) => item.id === pin.stopId);
    return route && direction && stop ? [{ pin, route, direction, stop }] : [];
  });
}

export function CityBusSelectedLines({ refTime }: { refTime: Date }) {
  const { language } = useSettings();
  const dict = useDictionary();
  const { pins, toggle: togglePin } = useBusPins();
  const cityPins = pins.filter(
    (pin): pin is Extract<BusPin, { kind: "city" }> => pin.kind === "city",
  );
  const { data, isLoading } = useQuery({
    queryKey: ["citybus_static_index"],
    queryFn: getCityBusRoutes,
    enabled: cityPins.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  const details = useMemo(
    () => getPinnedDetails(data?.routes, cityPins),
    [data?.routes, cityPins],
  );
  const departureQueries = useQueries({
    queries: details.map(({ pin, direction }) => ({
      queryKey: ["citybus_departures", pin.routeId, direction.id, pin.stopId],
      queryFn: () =>
        getCityBusDepartures(pin.routeId, direction.id, pin.stopId, 1),
      enabled: Boolean(data),
      staleTime: 30 * 1000,
      refetchInterval: 60 * 1000,
    })),
  });

  if (isLoading && cityPins.length > 0) return <CityBusSkeleton />;

  return (
    <>
      {details.map(({ pin, route, direction, stop }, index) => {
        const departure = departureQueries[index]?.data?.departures[0];
        const status = departureQueries[index]?.data?.status;
        const locale = language as "zh" | "en";
        const arrival = departure
          ? formatDepartureTime(departure, locale, {
              tomorrow: dict.bus.tomorrow,
              daysAfter: dict.bus.days_after,
            })
          : status === "no_timetable"
            ? dict.bus.no_timetable
            : status === "no_service"
              ? dict.bus.city_no_service
              : dict.bus.loading;
        const selectedPin = { ...pin, directionId: direction.id };
        return (
          <BusListingItem
            key={`${pin.routeId}:${direction.id}:${pin.stopId}`}
            tab="city"
            startTime=""
            refTime={refTime}
            leading={
              <CityBusLineBadge
                nameZh={route.nameZh}
                nameEn={route.nameEn}
                category={route.category}
                language={locale}
              />
            }
            line="city"
            direction={direction.id}
            title={localized(language, route)}
            destination={
              language === "zh"
                ? direction.destinationZh
                : direction.destinationEn
            }
            notes={[localized(language, stop)]}
            sourceLabel={
              departure?.realtime ? dict.bus.realtime : dict.bus.scheduled
            }
            compactMeta
            countdown={formatDepartureCountdown(departure?.minutes, locale, {
              underHour: dict.bus.minutes,
              minute: dict.bus.countdown_minute,
              hour: dict.bus.countdown_hour,
            })}
            arrival={arrival}
            exactArrival
            detailLine={route.id}
            pin={selectedPin}
            isPinned
            onTogglePin={togglePin}
          />
        );
      })}
    </>
  );
}

export default function CityBusCatalogue() {
  const { language } = useSettings();
  const dict = useDictionary();
  const { pins, toggle: togglePin } = useBusPins();
  const [searchValue, setSearchValue] = useState("");
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["citybus_static_index"],
    queryFn: getCityBusRoutes,
    staleTime: 60 * 60 * 1000,
  });

  const filteredRoutes = useMemo(() => {
    const value = searchValue.trim().toLocaleLowerCase();
    if (!data || !value) return data?.routes ?? [];
    return data.routes.filter((route) =>
      [
        route.id,
        route.nameZh,
        route.nameEn,
        ...route.stopNamesZh,
        ...route.stopNamesEn,
        ...route.directions.flatMap((direction) => [
          direction.labelZh,
          direction.labelEn,
          direction.destinationZh,
          direction.destinationEn,
        ]),
      ].some((item) => item.toLocaleLowerCase().includes(value)),
    );
  }, [data, searchValue]);

  if (isLoading) return <CityBusSkeleton />;
  if (error || !data) {
    return (
      <ErrorState
        title={dict.bus.load_error}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {dict.common.try_again}
          </Button>
        }
      />
    );
  }

  const suggestions = data.routes
    .filter((route) => SUGGESTED_ROUTES.has(route.id))
    .flatMap((route) => {
      const selection = defaultSelection(route);
      return selection
        ? [{ route, direction: selection.direction, stop: selection.stop }]
        : [];
    });
  const categoryRoutes = (category: "pilot" | "city" | "intercity") =>
    filteredRoutes.filter((route) => route.category === category);
  const pilotRoutes = categoryRoutes("pilot");
  const cityRoutes = categoryRoutes("city");
  const intercityRoutes = categoryRoutes("intercity");
  const hasSearch = searchValue.trim().length > 0;
  const hasMatches = filteredRoutes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {!hasSearch && suggestions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">{dict.bus.campus_suggestions}</h2>
          <div className="divide-y divide-border">
            {suggestions.map(({ route, direction, stop }) => (
              <CatalogueRouteRow
                key={`${route.id}:${direction.id}:${stop.id}`}
                route={route}
                language={language}
                dict={dict}
                pins={pins}
                togglePin={togglePin}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{dict.bus.browse_lines}</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={dict.bus.search_city_buses}
            className="h-10 pl-6"
            aria-label={dict.bus.search_city_buses}
          />
        </div>
      </section>

      {hasSearch && !hasMatches ? (
        <p className="py-4 text-sm text-muted-foreground">
          {dict.bus.no_route_matches}
        </p>
      ) : (
        <>
          {(!hasSearch || pilotRoutes.length > 0) && (
            <RouteSection
              title={dict.bus.pilot_routes}
              caption={dict.bus.pilot_routes_caption}
              routes={pilotRoutes}
              language={language}
              dict={dict}
              pins={pins}
              togglePin={togglePin}
            />
          )}
          {(!hasSearch || cityRoutes.length > 0) && (
            <RouteSection
              title={dict.bus.other_city_routes}
              routes={cityRoutes}
              language={language}
              dict={dict}
              pins={pins}
              togglePin={togglePin}
            />
          )}
          {(!hasSearch || intercityRoutes.length > 0) && (
            <RouteSection
              title={dict.bus.intercity_routes}
              caption={dict.bus.intercity_routes_caption}
              routes={intercityRoutes}
              language={language}
              dict={dict}
              pins={pins}
              togglePin={togglePin}
            />
          )}
        </>
      )}
    </div>
  );
}
