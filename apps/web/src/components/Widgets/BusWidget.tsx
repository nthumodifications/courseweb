import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQuery } from "@tanstack/react-query";
import { Bus } from "lucide-react";
import { getAllBusData } from "@/libs/bus";
import { isWeekend } from "date-fns";
import { getTimeOnDate } from "@/helpers/bus";
import useDictionary from "@/dictionaries/useDictionary";
import { EmptyState, Skeleton } from "@courseweb/ui";

interface BusWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

interface WidgetDeparture {
  time: string;
  lineLabel: string;
  directionIcon: string;
}

const BusWidget: FC<BusWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const title = dict.widgets.bus_title;

  const { data, isLoading } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  const departures: WidgetDeparture[] = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const schedule = isWeekend(now) ? "weekend" : "weekday";
    const results: WidgetDeparture[] = [];

    const mainSchedule = data.main[schedule];
    for (const dep of mainSchedule.toward_TSMC_building) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.line === "red" ? dict.bus.red_line : dict.bus.green_line,
          directionIcon: "↑",
        });
      }
    }
    for (const dep of mainSchedule.toward_main_gate) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.line === "red" ? dict.bus.red_line : dict.bus.green_line,
          directionIcon: "↓",
        });
      }
    }

    const nandaSchedule = data.nanda[schedule];
    for (const dep of nandaSchedule.toward_south_campus) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.type === "route2"
              ? dict.widgets.nanda_two
              : dict.widgets.nanda_one,
          directionIcon: "↓",
        });
      }
    }
    for (const dep of nandaSchedule.toward_main_campus) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.type === "route2"
              ? dict.widgets.nanda_two
              : dict.widgets.nanda_one,
          directionIcon: "↑",
        });
      }
    }

    results.sort((a, b) => a.time.localeCompare(b.time));
    return results.slice(0, 5);
  }, [data, dict.bus, dict.widgets]);

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        ) : departures.length === 0 ? (
          <EmptyState
            icon={Bus}
            title={dict.widgets.no_departures}
            description={dict.widgets.no_departures_description}
            size="sm"
          />
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
                  <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                    {dep.time}
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
