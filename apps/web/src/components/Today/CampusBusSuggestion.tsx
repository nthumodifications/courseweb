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
  findCampusTransfers,
  findNextCampusBus,
  hasNoClassToday,
  type CampusClass,
} from "@/helpers/campusBusSuggestion";

type CampusBusSuggestionProps = {
  events: readonly UpcomingEvent[];
};

const CampusBusSuggestion: FC<CampusBusSuggestionProps> = ({ events }) => {
  const dict = useDictionary();
  const now = useTime(60_000);
  const classes = useMemo<CampusClass[]>(
    () =>
      events
        .filter((event) => event.source === "class" && !event.allDay)
        .map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          venue: event.location,
        })),
    [events],
  );
  const holidayToday = useMemo(
    () => hasNoClassToday(events, now),
    [events, now],
  );
  const { data, isLoading, error } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 5 * 60 * 1000,
    enabled: classes.length > 0,
  });
  const suggestion = useMemo(
    () =>
      data && !holidayToday ? findNextCampusBus(classes, data, now) : null,
    [classes, data, holidayToday, now],
  );
  const transfers = useMemo(
    () =>
      data && !holidayToday ? findCampusTransfers(classes, data, now) : [],
    [classes, data, holidayToday, now],
  );

  if (isLoading || error || (!suggestion && transfers.length === 0))
    return null;

  const busProps = suggestion
    ? (() => {
        const Icon =
          suggestion.line === "route1" ? Route1LineIcon : Route2LineIcon;
        const destination =
          suggestion.campus === "nanda" ? dict.bus.nanda : dict.bus.main_campus;
        return {
          tab: suggestion.direction === "down" ? "nanda" : "north_gate",
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
          arrival: dict.bus.leave_by.replace(
            "{time}",
            suggestion.departureTime,
          ),
          exactArrival: true,
        } satisfies Omit<BusListingItemProps, "refTime">;
      })()
    : null;

  return (
    <div className="flex flex-col px-2 divide-y divide-border">
      {suggestion && busProps && <BusListingItem {...busProps} refTime={now} />}
      {transfers.length > 0 && (
        <div
          className="flex flex-col gap-1 py-2 text-sm font-medium text-muted-foreground"
          role="status"
        >
          {transfers.map((transfer) => {
            const from =
              transfer.fromCampus === "nanda"
                ? dict.bus.nanda
                : dict.bus.main_campus;
            const to =
              transfer.toCampus === "nanda"
                ? dict.bus.nanda
                : dict.bus.main_campus;
            const message =
              transfer.status === "scheduled"
                ? dict.bus.campus_transfer
                    .replace("{from}", from)
                    .replace("{to}", to)
                    .replace(
                      "{line}",
                      transfer.line === "route1"
                        ? dict.bus.route1_line
                        : dict.bus.route2_line,
                    )
                    .replace("{departure}", transfer.departureTime ?? "")
                    .replace("{arrival}", transfer.arrivalTime ?? "")
                : dict.bus[
                    transfer.status === "too_short"
                      ? "campus_transfer_too_short"
                      : "campus_transfer_no_bus"
                  ]
                    .replace("{from}", from)
                    .replace("{to}", to);
            return (
              <div key={`${transfer.from.id}-${transfer.to.id}`}>{message}</div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampusBusSuggestion;
