import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQuery } from "@tanstack/react-query";
import { Bus } from "lucide-react";
import { getAllBusData } from "@/libs/bus";
import { isWeekend } from "date-fns";
import { getCityBusRoutes } from "@/libs/citybus";
import { useBusPins, type CampusBusPin } from "@/features/bus/busPins";
import useDictionary from "@/dictionaries/useDictionary";
import useTime from "@/hooks/useTime";
import { BusListingItem } from "@/features/bus/BusListingItem";
import { CityBusSelectedLines } from "@/features/bus/CityBusCatalogue";
import {
  getUpcomingCampusBuses,
  selectedCampusBus,
} from "@/features/bus/selectedCampusBus";

interface BusWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const MAX_ROWS = 5;

const BusWidget: FC<BusWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const time = useTime();
  const weektype = isWeekend(time) ? "weekend" : "weekday";
  const { pins, toggle: togglePin } = useBusPins();
  const campusPins = useMemo(
    () => pins.filter((pin): pin is CampusBusPin => pin.kind === "campus"),
    [pins],
  );
  const cityPins = useMemo(
    () => pins.filter((pin) => pin.kind === "city"),
    [pins],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
  const title =
    cityPins.length > 0 ? dict.bus.widget_title : dict.bus.campus_widget_title;
  const { isLoading: isCityRoutesLoading } = useQuery({
    queryKey: ["citybus_static_index"],
    queryFn: getCityBusRoutes,
    enabled: cityPins.length > 0,
    staleTime: 60 * 60 * 1000,
  });
  const campusBuses = useMemo(() => {
    if (!data) return [];
    if (pins.length === 0) {
      return getUpcomingCampusBuses(data, time, weektype, dict).slice(
        0,
        MAX_ROWS,
      );
    }
    return campusPins.slice(0, MAX_ROWS).map((pin) => ({
      ...selectedCampusBus(pin, data, time, weektype, dict),
      isPinned: true,
      onTogglePin: togglePin,
    }));
  }, [campusPins, data, dict, pins.length, time, togglePin, weektype]);
  const cityRowLimit = Math.max(0, MAX_ROWS - campusBuses.length);
  const hasRows = campusBuses.length > 0 || cityPins.length > 0;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        {isLoading || isCityRoutesLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : !hasRows ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Bus className="h-8 w-8 mb-2 text-muted-foreground/40" />
            <span className="text-sm">{dict.bus.no_departures}</span>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border px-2">
            {campusBuses.map((bus, index) => (
              <BusListingItem
                key={`${bus.line}:${bus.direction}:${index}`}
                {...bus}
                compact
                refTime={time}
              />
            ))}
            {cityPins.length > 0 && cityRowLimit > 0 && (
              <CityBusSelectedLines
                refTime={time}
                compact
                maxItems={cityRowLimit}
              />
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
};

export default BusWidget;
