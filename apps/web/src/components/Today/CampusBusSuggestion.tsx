import { FC, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { getAllBusData } from "@/libs/bus";
import useTime from "@/hooks/useTime";
import { useSettings } from "@/hooks/contexts/settings";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";
import {
  findCampusTransfers,
  hasNoClassToday,
  planNextCampusBus,
  type CampusClass,
} from "@/helpers/campusBusSuggestion";

type CampusBusSuggestionProps = {
  events: readonly UpcomingEvent[];
};

const CampusBusSuggestion: FC<CampusBusSuggestionProps> = ({ events }) => {
  const dict = useDictionary();
  const now = useTime(60_000);
  const { homeCampus } = useSettings();
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
      data && !holidayToday
        ? planNextCampusBus(
            classes,
            data,
            now,
            homeCampus === "none" ? null : homeCampus,
          )
        : null,
    [classes, data, holidayToday, homeCampus, now],
  );
  const transfers = useMemo(
    () =>
      data && !holidayToday ? findCampusTransfers(classes, data, now) : [],
    [classes, data, holidayToday, now],
  );

  if (isLoading || error || (!suggestion && transfers.length === 0))
    return null;

  const failedNextTransferId =
    suggestion?.status === "no_bus" ? suggestion.class.id : null;
  const transferWarnings = transfers.filter(
    (transfer) =>
      transfer.status !== "scheduled" &&
      transfer.to.id !== failedNextTransferId,
  );
  if (!suggestion && transferWarnings.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-1 px-2 py-1 text-sm font-medium text-muted-foreground"
      role="status"
    >
      {suggestion?.status === "scheduled" && (
        <div>
          {dict.bus.leave_by_trip
            .replace("{departure}", suggestion.departureTime)
            .replace("{arrival}", suggestion.arrivalTime)}
        </div>
      )}
      {suggestion?.status === "no_bus" && <div>{dict.bus.leave_by_no_fit}</div>}
      {transferWarnings.map((transfer) => {
        const message =
          dict.bus[
            transfer.status === "too_short"
              ? "campus_transfer_warning_too_short"
              : "campus_transfer_warning_no_bus"
          ];
        return (
          <div key={`${transfer.from.id}-${transfer.to.id}`}>{message}</div>
        );
      })}
    </div>
  );
};

export default CampusBusSuggestion;
