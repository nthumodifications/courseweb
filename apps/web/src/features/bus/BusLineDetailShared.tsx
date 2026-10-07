import { Button, cn } from "@courseweb/ui";
import { Bus, ChevronLeft, Star } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import useDictionary from "@/dictionaries/useDictionary";

export enum BusStationState {
  UNAVAILABLE,
  ARRIVING,
  AT_STATION,
  LEFT,
}

export type BusTimelineItem = {
  station: string;
  time: string;
  state: BusStationState;
  lineIcon?: ReactNode;
  id?: string;
  onSelect?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type BusLineHeaderProps = {
  returnUrl: string;
  title: string;
  icon: ReactNode;
  subtitle?: string;
  pinned?: boolean;
  onTogglePin?: () => void;
};

export function BusLineHeader({
  returnUrl,
  title,
  icon,
  subtitle,
  pinned,
  onTogglePin,
}: BusLineHeaderProps) {
  const dict = useDictionary();

  return (
    <div className="flex flex-row items-center px-2 gap-4">
      <Button variant={"ghost"} asChild>
        <Link to={returnUrl} aria-label={dict.bus.back_to_bus}>
          <ChevronLeft className="w-4 h-4 mr-2" />
        </Link>
      </Button>
      <div className="flex flex-row gap-4 items-center">
        {icon}
        {subtitle ? (
          <div className="min-w-0">
            <h3 className="text-foreground font-bold">{title}</h3>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>
        ) : (
          <h3 className="text-foreground font-bold">{title}</h3>
        )}
      </div>
      {onTogglePin && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto min-h-11 min-w-11"
          aria-label={pinned ? dict.bus.remove_bus : dict.bus.add_bus}
          onClick={onTogglePin}
        >
          <Star
            className={cn(
              "h-4 w-4",
              pinned ? "text-nthu-500" : "text-muted-foreground",
            )}
            fill={pinned ? "currentColor" : "none"}
          />
        </Button>
      )}
    </div>
  );
}

function InteractiveRow({
  item,
  children,
}: {
  item: BusTimelineItem;
  children: ReactNode;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      item.onSelect?.();
    }
  };

  return item.onSelect ? (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col"
      onClick={item.onSelect}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  ) : (
    <>{children}</>
  );
}

export function BusStopTimeline({
  items,
  activeId,
}: {
  items: BusTimelineItem[];
  activeId?: string;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeId) activeRef.current?.scrollIntoView({ block: "center" });
  }, [activeId]);

  return (
    <div className="w-full items-start inline-flex px-4">
      <div className="w-full p-2 flex-col justify-start inline-flex">
        {items.map((m, i) => {
          const row = (
            <div key={i} className={cn("items-stretch gap-4 inline-flex")}>
              <div className="h-auto relative w-5">
                <div className="absolute top-0 left-[calc(50%-2px)] w-1 h-1/2 bg-border z-10" />
                {m.state == BusStationState.ARRIVING && (
                  <div className="absolute top-[calc(-10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                    <Bus className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {m.state == BusStationState.AT_STATION && (
                  <div className="absolute top-[calc(50%-10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                    <Bus className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {m.state == BusStationState.LEFT && (
                  <div className="absolute top-[calc(100%+10px)] w-5 h-5 bg-nthu-500 rounded-full z-20 grid place-items-center">
                    <Bus className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="absolute left-[calc(50%-6px)] top-[calc(50%-6px)] w-3 h-3 bg-border rounded-full z-10" />
                {i != items.length - 1 && (
                  <div className="absolute top-1/2 left-[calc(50%-2px)] w-1 h-1/2 bg-border z-10" />
                )}
              </div>
              <div
                ref={m.id === activeId ? activeRef : undefined}
                className={cn(
                  "flex-1 py-4 justify-start items-center gap-2 flex border-b border-border",
                  m.state > BusStationState.AT_STATION ? "opacity-30" : "",
                )}
              >
                <div className="text-foreground text-base font-bold">
                  {m.station}
                </div>
                {m.lineIcon ? (
                  <div className="flex-1 text-right flex items-center justify-end gap-2">
                    <div className="text-foreground">{m.lineIcon}</div>
                    {m.action && (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-nthu-500"
                        onClick={(event) => {
                          event.stopPropagation();
                          m.action?.onClick();
                        }}
                      >
                        {m.action.label}
                      </button>
                    )}
                    <div
                      className={cn(
                        "text-base font-bold",
                        m.state == BusStationState.AT_STATION
                          ? "text-nthu-500"
                          : "text-muted-foreground",
                      )}
                    >
                      {m.time}
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex-1 text-right text-base font-bold",
                      m.state == BusStationState.AT_STATION
                        ? "text-nthu-500"
                        : "text-muted-foreground",
                    )}
                  >
                    {m.action && (
                      <button
                        type="button"
                        className="mr-2 text-xs font-medium text-nthu-500"
                        onClick={(event) => {
                          event.stopPropagation();
                          m.action?.onClick();
                        }}
                      >
                        {m.action.label}
                      </button>
                    )}
                    {m.time}
                  </div>
                )}
              </div>
            </div>
          );

          return (
            <InteractiveRow item={m} key={i}>
              {row}
            </InteractiveRow>
          );
        })}
      </div>
    </div>
  );
}
