import { FC, useMemo } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/contexts/settings";
import { Bus } from "lucide-react";
import { getAllBusData } from "@/libs/bus";
import { isWeekend } from "date-fns";
import { getTimeOnDate } from "@/helpers/bus";

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
  const { language } = useSettings();
  const title = language === "zh" ? "校園公車" : "Campus Bus";

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
            dep.line === "red"
              ? language === "zh"
                ? "紅線"
                : "Red"
              : language === "zh"
                ? "綠線"
                : "Green",
          directionIcon: "↑",
        });
      }
    }
    for (const dep of mainSchedule.toward_main_gate) {
      if (getTimeOnDate(now, dep.time) > now) {
        results.push({
          time: dep.time,
          lineLabel:
            dep.line === "red"
              ? language === "zh"
                ? "紅線"
                : "Red"
              : language === "zh"
                ? "綠線"
                : "Green",
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
              ? language === "zh"
                ? "南大2路"
                : "Nanda 2"
              : language === "zh"
                ? "南大1路"
                : "Nanda 1",
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
              ? language === "zh"
                ? "南大2路"
                : "Nanda 2"
              : language === "zh"
                ? "南大1路"
                : "Nanda 1",
          directionIcon: "↑",
        });
      }
    }

    results.sort((a, b) => a.time.localeCompare(b.time));
    return results.slice(0, 5);
  }, [data, language]);

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : departures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Bus className="h-8 w-8 mb-2 text-muted-foreground/40" />
            <span className="text-sm">
              {language === "zh" ? "今日無班次" : "No departures today"}
            </span>
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
                  <span className="text-xs font-mono font-semibold text-primary">
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
