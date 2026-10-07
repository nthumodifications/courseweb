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
  compactMeta?: boolean;
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
  compactMeta = false,
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

  return (
    <div
      className={cn(
        "flex flex-col py-3",
        arrival === dict.bus.service_over ? "opacity-30" : "",
      )}
    >
      <div
        className="flex cursor-pointer flex-row items-start gap-3"
        onClick={handleItemClick}
      >
        <div className="shrink-0 pt-1">
          {leading ?? (Icon ? <Icon className="h-7 w-7" /> : null)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 flex-1 break-words font-bold text-foreground">
              <span>{title}</span>
              {destination && <span>-{destination}</span>}
            </h3>
            <div className="flex shrink-0 flex-col items-end text-right">
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
            <div className="flex shrink-0 items-center">
              {pin && onTogglePin && (
                <button
                  type="button"
                  aria-label={isPinned ? dict.bus.unpin : dict.bus.pin}
                  className="grid min-h-11 min-w-9 place-items-center rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-nthu-500"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePin(pin);
                  }}
                >
                  <Star
                    className="h-4 w-4"
                    fill={isPinned ? "currentColor" : "none"}
                  />
                </button>
              )}
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
          {compactMeta ? (
            <div className="flex flex-row flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
              {sourceLabel && <span>{sourceLabel}</span>}
            </div>
          ) : (
            <div className="flex flex-row flex-wrap items-center gap-2">
              <div
                className="inline-flex cursor-pointer items-center gap-2"
                onClick={() =>
                  line === "city" && detailLine
                    ? handleItemClick()
                    : navigate(`/${language}/bus/${route}`)
                }
              >
                <Timer className="h-4 w-4" />
                <div className="text-sm font-medium leading-relaxed">
                  {dict.bus.schedule}
                </div>
              </div>
              {notes.map((note) => (
                <div className="inline-flex items-center gap-2" key={note}>
                  <div className="text-sm font-medium leading-relaxed">
                    ・{note}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
