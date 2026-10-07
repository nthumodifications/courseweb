import {
  Button,
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@courseweb/ui";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import {
  formatNextServiceDay,
  formatCityBusRealtimeDisplay,
  formatCityBusUpdatedAt,
  getCityBusRoute,
  getCityBusRealtimeDisplay,
  getCityBusTrips,
  getDistinctCityBusDirections,
  getNextCityBusTripIndex,
  getScheduleStatus,
  mergeCityBusEtaIntoTimeline,
  stepCityBusTrip,
  useCityBusEta,
  type CityBusRoute,
} from "@/libs/citybus";
import { useBusPins, type CityBusPin } from "@/features/bus/busPins";
import { CityBusLineBadge } from "@/features/bus/CityBusLineBadge";
import {
  BusLineHeader,
  BusStationState,
  BusStopTimeline,
} from "@/features/bus/BusLineDetailShared";

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
  const { data: realtimeData } = useCityBusEta(
    route?.id ?? routeId,
    direction?.id,
    Boolean(route && direction),
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
  }, [direction, route, stop]);

  const trips = useMemo(
    () =>
      route && direction && stop
        ? getCityBusTrips(route, direction.id, stop.id, now)
        : [],
    [direction, now, route, stop],
  );
  const nextTripIndex = useMemo(
    () => getNextCityBusTripIndex(trips, now),
    [now, trips],
  );
  const [selectedTripId, setSelectedTripId] = useState<string>();
  const [view, setView] = useState<"realtime" | "timetable">("realtime");
  useEffect(() => {
    setSelectedTripId(undefined);
    setView("realtime");
  }, [direction?.id, stop?.id]);

  const selectedTripIndex = selectedTripId
    ? trips.findIndex((trip) => trip.id === selectedTripId)
    : nextTripIndex;
  const selectedTrip =
    selectedTripIndex >= 0 ? trips[selectedTripIndex] : undefined;

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
  const destination =
    language === "zh" ? direction.destinationZh : direction.destinationEn;
  const selected = pinned(pin);
  const status = getScheduleStatus(route, direction.id, stop.id, now);
  const tripDay = selectedTrip
    ? selectedTrip.dayOffset > 0
      ? formatNextServiceDay(
          selectedTrip.dayOffset,
          now,
          language as "zh" | "en",
          dict.bus.tomorrow,
        )
      : dict.bus.scheduled
    : undefined;
  const directionStops = [...direction.stops].sort(
    (a, b) => a.sequence - b.sequence,
  );
  const realtimeAvailable = Boolean(
    realtimeData?.realtime &&
      (realtimeData.buses.length > 0 ||
        realtimeData.stops.some((item) =>
          Boolean(getCityBusRealtimeDisplay(item)),
        )),
  );
  const showingRealtime = realtimeAvailable && view === "realtime";
  const realtimeTimeline = realtimeData
    ? mergeCityBusEtaIntoTimeline(
        directionStops.map((item) => item.id),
        realtimeData,
      )
    : [];

  const setDirection = (nextDirectionId: string) => {
    const nextDirection = directions.find(
      (item) => item.id === nextDirectionId,
    );
    const nextStop = nextDirection
      ? (nextDirection.stops.find((item) => item.nearCampus) ??
        nextDirection.stops[0])
      : undefined;
    if (nextDirection && nextStop) navigateTo(nextDirection.id, nextStop.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <BusLineHeader
        returnUrl={returnUrl}
        title={routeName}
        subtitle={`${dict.bus.head_to} ${destination}`}
        icon={
          <CityBusLineBadge
            nameZh={route.nameZh}
            nameEn={route.nameEn}
            category={route.category}
            language={language as "zh" | "en"}
          />
        }
        pinned={selected}
        onTogglePin={() => toggle(pin)}
      />

      {directions.length === 2 && (
        <Tabs
          value={direction.id}
          onValueChange={setDirection}
          className="px-4"
        >
          <TabsList className="w-full justify-evenly mb-4">
            {directions.map((item) => (
              <TabsTrigger className="flex-1" value={item.id} key={item.id}>
                {directionOptionLabel(
                  directions,
                  item.id,
                  language as "zh" | "en",
                  dict.bus.head_to,
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {directions.length > 2 && (
        <div className="px-4 pb-2">
          <Select value={direction.id} onValueChange={setDirection}>
            <SelectTrigger aria-label={dict.bus.direction}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {directions.map((item) => (
                <SelectItem value={item.id} key={item.id}>
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
        </div>
      )}

      {realtimeAvailable && (
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as "realtime" | "timetable")}
          className="px-4"
        >
          <TabsList className="w-full justify-evenly mb-4">
            <TabsTrigger className="flex-1" value="realtime">
              {dict.bus.realtime_tab}
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="timetable">
              {dict.bus.timetable_tab}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {showingRealtime ? (
        <>
          <div className="flex items-center justify-between gap-4 px-4">
            <div className="min-w-0">
              <p className="font-bold text-nthu-500">{dict.bus.realtime}</p>
              {realtimeData?.updatedAt && (
                <p className="text-sm font-medium text-muted-foreground">
                  {dict.bus.realtime_updated_at.replace(
                    "{time}",
                    formatCityBusUpdatedAt(
                      realtimeData.updatedAt,
                      language as "zh" | "en",
                    ),
                  )}
                </p>
              )}
            </div>
          </div>
          <BusStopTimeline
            activeId={stop.id}
            items={directionStops.map((item, index) => {
              const live = realtimeTimeline[index];
              const liveText = formatCityBusRealtimeDisplay(
                live?.display,
                language as "zh" | "en",
                {
                  arriving: dict.bus.realtime_arriving,
                  lastBus: dict.bus.realtime_last_bus,
                  notOperating: dict.bus.realtime_not_operating,
                  minutes: dict.bus.minutes,
                },
              );
              return {
                id: item.id,
                station: language === "zh" ? item.nameZh : item.nameEn,
                time: liveText ?? "",
                state:
                  live?.state === "at_station"
                    ? BusStationState.AT_STATION
                    : live?.state === "arriving"
                      ? BusStationState.ARRIVING
                      : BusStationState.UNAVAILABLE,
                onSelect: () => navigateTo(direction.id, item.id),
              };
            })}
          />
        </>
      ) : selectedTrip ? (
        <>
          <div className="flex items-center justify-between gap-4 px-4">
            <div className="min-w-0">
              {selectedTrip.kind === "frequency" ? (
                <p className="font-bold text-nthu-500">
                  {dict.bus.frequency_window}{" "}
                  {selectedTrip.frequency?.headwayMinutes ?? ""}{" "}
                  {dict.bus.minutes}
                  {" · "}
                  {selectedTrip.departureTime}
                </p>
              ) : (
                <p className="font-bold text-nthu-500">
                  {selectedTrip.departureTime}
                </p>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {tripDay}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={dict.bus.previous_trip}
                disabled={stepCityBusTrip(trips, selectedTripIndex, -1) === -1}
                onClick={() => {
                  const index = stepCityBusTrip(trips, selectedTripIndex, -1);
                  if (index >= 0) setSelectedTripId(trips[index].id);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={dict.bus.next_trip}
                disabled={stepCityBusTrip(trips, selectedTripIndex, 1) === -1}
                onClick={() => {
                  const index = stepCityBusTrip(trips, selectedTripIndex, 1);
                  if (index >= 0) setSelectedTripId(trips[index].id);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <BusStopTimeline
            activeId={stop.id}
            items={directionStops.map((item) => ({
              id: item.id,
              station: language === "zh" ? item.nameZh : item.nameEn,
              time:
                selectedTrip.kind === "frequency"
                  ? ""
                  : (selectedTrip.timesByStop[item.id] ?? ""),
              state:
                item.id === stop.id
                  ? BusStationState.AT_STATION
                  : BusStationState.UNAVAILABLE,
              onSelect: () => navigateTo(direction.id, item.id),
            }))}
          />
        </>
      ) : (
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground">
            {route.source === "intercity" && route.timesUrl
              ? dict.bus.times_not_available
              : status === "no_timetable"
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

      <p className="px-4 text-xs leading-relaxed text-muted-foreground">
        {route.sourceInfo.attribution} · {route.sourceInfo.license}
      </p>
      <div className="h-6" />
    </div>
  );
};

export default CityBusDetails;
