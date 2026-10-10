import { FC, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import {
  BusListingItem,
  type BusListingItemProps,
} from "@/features/bus/BusListingItem";
import useDictionary from "@/dictionaries/useDictionary";
import { getAllBusData } from "@/libs/bus";
import useTime from "@/hooks/useTime";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";
import {
  findNextCampusBus,
  type CampusClass,
} from "@/helpers/campusBusSuggestion";

type CampusBusSuggestionProps = {
  events: readonly UpcomingEvent[];
};

const CampusBusSuggestion: FC<CampusBusSuggestionProps> = ({ events }) => {
  const dict = useDictionary();
  const now = useTime(60_000);
  const { data, isLoading, error } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 5 * 60 * 1000,
  });

  const classes = useMemo<CampusClass[]>(
    () =>
      events
        .filter((event) => event.source === "class" && !event.allDay)
        .map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          venue: event.location,
        })),
    [events],
  );
  const suggestion = useMemo(
    () => (data ? findNextCampusBus(classes, data, now) : null),
    [classes, data, now],
  );

  if (isLoading || error || !suggestion) return null;

  const Icon = suggestion.line === "route1" ? Route1LineIcon : Route2LineIcon;
  const destination =
    suggestion.campus === "nanda" ? dict.bus.nanda : dict.bus.main_campus;
  const busProps: Omit<BusListingItemProps, "refTime"> = {
    tab: suggestion.direction === "up" ? "north_gate" : "nanda",
    startTime: suggestion.departureTime,
    Icon,
    line: suggestion.line,
    direction: suggestion.direction,
    title:
      suggestion.line === "route1"
        ? dict.bus.route1_line
        : dict.bus.route2_line,
    destination: `${dict.bus.to}${destination}`,
    notes: [
      dict.bus.next_class.replace("{name}", suggestion.class.title),
      dict.bus.next_class_venue.replace(
        "{venue}",
        suggestion.class.venue ?? destination,
      ),
    ],
    arrival: dict.bus.leave_by.replace("{time}", suggestion.departureTime),
    exactArrival: true,
  };

  return (
    <div className="flex flex-col px-2 divide-y divide-border">
      <BusListingItem {...busProps} refTime={now} />
    </div>
  );
};

export default CampusBusSuggestion;
