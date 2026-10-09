import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/contexts/settings";
import { Bus } from "lucide-react";
import { getAllBusData } from "@/libs/bus";
import { isWeekend } from "date-fns";
import { getTimeOnDate } from "@/helpers/bus";
import {
  formatDepartureCountdown,
  formatDepartureTime,
  formatCityBusRealtimeDisplay,
  getCityBusRealtimeDisplay,
  getCityBusDepartures,
  getCityBusRoutes,
} from "@/libs/citybus";
import { useBusPins, type BusPin } from "@/features/bus/busPins";
import useDictionary from "@/dictionaries/useDictionary";

interface BusWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

interface WidgetDeparture {
  time: string;
  countdown?: string;
  lineLabel: string;
  directionIcon: string;
  sourceLabel?: string;
  pin?: BusPin;
}

const BusWidget: FC<BusWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const { pins, pinned } = useBusPins();

  const { data, isLoading } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
  const cityPins = pins.filter(
    (pin): pin is Extract<BusPin, { kind: "city" }> => pin.kind === "city",
  );
  const title =
    cityPins.length > 0 ? dict.bus.widget_title : dict.bus.campus_widget_title;
  const { data: cityRoutes, isLoading: isCityRoutesLoading } = useQuery({
    queryKey: ["citybus_static_index"],
    queryFn: getCityBusRoutes,
    enabled: cityPins.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  const cityDepartureQueries = useQueries({
    queries: cityPins.map((pin) => {
      const route = cityRoutes?.routes.find((item) => item.id === pin.routeId);
      const direction = route?.directions.find(
        (item) =>
          item.id === pin.directionId ||
          item.campusStops.some((stop) => stop.id === pin.stopId),
      );
      return {
        queryKey: [
          "citybus_departures",
          pin.routeId,
          direction?.id,
          pin.stopId,
        ],
        queryFn: () =>
          getCityBusDepartures(pin.routeId, direction!.id, pin.stopId, 1),
        enabled: Boolean(direction),
        staleTime: 15 * 1000,
        refetchInterval: () =>
          typeof document !== "undefined" &&
          document.visibilityState === "visible"
            ? 20 * 1000
            : false,
        retry: false,
      };
    }),
  });

  const departures: WidgetDeparture[] = useMemo(() => {
    if (!data && cityPins.length === 0) return [];
    const now = new Date();
    const schedule = isWeekend(now) ? "weekend" : "weekday";
    const results: WidgetDeparture[] = [];

    const mainSchedule = data?.main[schedule];
    for (const dep of mainSchedule?.toward_TSMC_building ?? []) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.line === "red" ? dict.bus.red_line : dict.bus.green_line,
          directionIcon: "↑",
          sourceLabel: cityPins.length > 0 ? dict.bus.scheduled : undefined,
          pin: {
            kind: "campus",
            line: dep.line === "red" ? "red" : "green",
            direction: "up",
          },
        });
      }
    }
    for (const dep of mainSchedule?.toward_main_gate ?? []) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.line === "red" ? dict.bus.red_line : dict.bus.green_line,
          directionIcon: "↓",
          sourceLabel: cityPins.length > 0 ? dict.bus.scheduled : undefined,
          pin: {
            kind: "campus",
            line: dep.line === "red" ? "red" : "green",
            direction: "down",
          },
        });
      }
    }

    const nandaSchedule = data?.nanda[schedule];
    for (const dep of nandaSchedule?.toward_south_campus ?? []) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.type === "route2" ? dict.bus.route2_line : dict.bus.route1_line,
          directionIcon: "↓",
          sourceLabel: cityPins.length > 0 ? dict.bus.scheduled : undefined,
          pin: {
            kind: "campus",
            line: dep.type === "route2" ? "route2" : "route1",
            direction: "up",
          },
        });
      }
    }
    for (const dep of nandaSchedule?.toward_main_campus ?? []) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.type === "route2" ? dict.bus.route2_line : dict.bus.route1_line,
          directionIcon: "↑",
          sourceLabel: cityPins.length > 0 ? dict.bus.scheduled : undefined,
          pin: {
            kind: "campus",
            line: dep.type === "route2" ? "route2" : "route1",
            direction: "down",
          },
        });
      }
    }

    cityPins.forEach((pin, index) => {
      const departureData = cityDepartureQueries[index]?.data;
      const departure = departureData?.departures[0];
      const liveStop = departureData?.eta?.stops.find(
        (item) => item.stopId === pin.stopId,
      );
      const liveDisplay = liveStop
        ? getCityBusRealtimeDisplay(liveStop)
        : undefined;
      const liveText = formatCityBusRealtimeDisplay(liveDisplay, language, {
        arriving: dict.bus.realtime_arriving,
        lastBus: dict.bus.realtime_last_bus,
        notOperating: dict.bus.realtime_not_operating,
        minutes: dict.bus.minutes,
      });
      if (!departure && !liveText) return;
      const countdown = liveText
        ? undefined
        : formatDepartureCountdown(departure?.minutes, language, {
            underHour: dict.bus.minutes,
            minute: dict.bus.countdown_minute,
            hour: dict.bus.countdown_hour,
          });
      results.push({
        time:
          liveText ??
          formatDepartureTime(departure!, language, {
            tomorrow: dict.bus.tomorrow,
            daysAfter: dict.bus.days_after,
          }),
        countdown,
        lineLabel:
          language === "zh"
            ? `${pin.routeNameZh} · ${pin.stopNameZh}`
            : `${pin.routeNameEn} · ${pin.stopNameEn}`,
        directionIcon: "",
        sourceLabel:
          liveText || departure?.realtime
            ? dict.bus.realtime
            : dict.bus.scheduled,
        pin,
      });
    });

    const pinRank = (pin?: BusPin) => (pin ? Number(pinned(pin)) : 0);
    results.sort(
      (a, b) => pinRank(b.pin) - pinRank(a.pin) || a.time.localeCompare(b.time),
    );
    return results.slice(0, 5);
  }, [data, dict, language, cityPins, cityDepartureQueries, pinned]);

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="p-4">
        {isLoading || isCityRoutesLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : departures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Bus className="h-8 w-8 mb-2 text-muted-foreground/40" />
            <span className="text-sm">{dict.bus.no_departures}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {departures.map((dep, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Bus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-xs">{dep.lineLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {dep.directionIcon}
                  </span>
                  {dep.sourceLabel && (
                    <span className="text-[10px] text-muted-foreground">
                      {dep.sourceLabel}
                    </span>
                  )}
                  <span className="flex flex-col items-end">
                    <span className="text-xs font-mono font-semibold text-primary">
                      {dep.time}
                    </span>
                    {dep.countdown && (
                      <span className="text-[10px] text-muted-foreground">
                        {dep.countdown}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default BusWidget;
