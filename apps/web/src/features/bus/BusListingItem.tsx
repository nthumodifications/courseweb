import { useSettings } from "@/hooks/contexts/settings";
import { differenceInMinutes, set } from "date-fns";
import { FC, ReactNode, SVGProps, useMemo } from "react";
import { ChevronRight, Star, Timer } from "lucide-react";
import { cn } from "@courseweb/ui";
import { useNavigate } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import type { BusPin } from "./busPins";

export type BusListingItemProps = {
  tab: string;
  startTime: string;
  refTime: Date;
  Icon?: FC<SVGProps<SVGSVGElement>>;
  leading?: ReactNode;
  line: string;
  direction: string;
  title: string;
  destination?: string;
  notes?: string[];
  arrival: string;
  exactArrival?: boolean;
  detailLine?: string;
  pin?: BusPin;
  isPinned?: boolean;
  onTogglePin?: (pin: BusPin) => void;
  countdown?: string;
  sourceLabel?: string;
  compact?: boolean;
};

export const BusListingItem = ({
  tab,
  refTime,
  Icon,
  leading,
  line,
  direction,
  title,
  destination,
  notes = [],
  arrival,
  exactArrival = false,
  detailLine,
  pin,
  isPinned = false,
  onTogglePin,
  countdown,
  sourceLabel,
  compact = false,
}: BusListingItemProps) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const displayTime = useMemo(() => {
    if (exactArrival || !arrival.match(/\d{2}:\d{2}/)) return arrival;
    const time = set(new Date(), {
      hours: parseInt(arrival.split(":")[0]),
      minutes: parseInt(arrival.split(":")[1]),
    });
    if (time.getTime() < refTime.getTime()) return dict.bus.departed;
    if (time.getTime() - refTime.getTime() < 2 * 60 * 1000)
      return dict.bus.departing;
    if (time.getTime() - refTime.getTime() < 5 * 60 * 1000) {
      return `${differenceInMinutes(time, refTime)} ${dict.bus.minutes}`;
    }
    return arrival;
  }, [arrival, exactArrival, refTime, dict]);

  const navigate = useNavigate();
  const route =
    line === "city"
      ? "city"
      : line === "nanda" || line === "route1" || line === "route2"
        ? "nanda"
        : "main";

  const handleItemClick = () => {
    if (line === "city" && detailLine) {
      navigate(
        `/${language}/bus/city/${detailLine}?direction=${encodeURIComponent(direction)}&stop=${encodeURIComponent(pin?.kind === "city" ? pin.stopId : "")}&return_url=/${language}/bus?tab=city`,
      );
      return;
    }
    navigate(
      `/${language}/bus/${route}/${line === "nanda" || line === "route1" || line === "route2" ? `${line}_${direction}` : line}?return_url=/${language}/bus?tab=${tab}`,
    );
  };

  const openSchedule = () =>
    line === "city" && detailLine
      ? handleItemClick()
      : navigate(`/${language}/bus/${route}`);

  // Same anatomy as the original shuttle row. City lines only add what a
  // shuttle row lacks: a countdown under the time and the star.
  return (
    <div
      className={cn(
        compact ? "flex flex-col gap-2 py-2" : "flex flex-col gap-4 py-4",
        arrival === dict.bus.service_over ? "opacity-30" : "",
      )}
    >
      <div
        className="flex cursor-pointer flex-row items-center gap-4"
        onClick={handleItemClick}
      >
        <div className="shrink-0">
          {leading ?? (Icon ? <Icon className="h-7 w-7" /> : null)}
        </div>
        <h3 className="min-w-0 break-words font-bold text-foreground">
          <span>{title}</span>
          {destination && <span>-{destination}</span>}
        </h3>
        <div className="flex flex-1 flex-col items-end text-right">
          <div
            className={cn(
              "whitespace-nowrap font-bold text-foreground",
              displayTime === dict.bus.departing ? "text-nthu-500" : "",
            )}
          >
            {displayTime}
          </div>
          {countdown && (
            <div className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              {countdown}
            </div>
          )}
        </div>
        {pin && onTogglePin && (
          <button
            type="button"
            aria-label={isPinned ? dict.bus.unpin : dict.bus.pin}
            className="-mx-2 grid h-11 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-nthu-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin(pin);
            }}
          >
            <Star
              className={cn("h-4 w-4", isPinned && "text-nthu-500")}
              fill={isPinned ? "currentColor" : "none"}
            />
          </button>
        )}
        <div className="grid place-items-center">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-2">
        <div
          className="inline-flex cursor-pointer items-center justify-center gap-2"
          onClick={openSchedule}
        >
          <Timer className="h-4 w-4" />
          <div className="text-center text-sm font-medium">
            {dict.bus.schedule}
          </div>
        </div>
        {notes.map((note) => (
          <div
            className="inline-flex items-center justify-center gap-2"
            key={note}
          >
            <div className="text-center text-sm font-medium">・{note}</div>
          </div>
        ))}
        {sourceLabel && (
          <div className="inline-flex items-center justify-center gap-2">
            <div className="text-center text-sm font-medium text-muted-foreground">
              ・{sourceLabel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
