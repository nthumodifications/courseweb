import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { useSettings } from "@/hooks/contexts/settings";
import { Bus } from "lucide-react";

interface BusWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const BusWidget: FC<BusWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const { language } = useSettings();
  const title = language === "zh" ? "校園公車" : "Campus Bus";

  const { data, isLoading } = useQuery({
    queryKey: ["bus-schedules-current"],
    queryFn: async () => {
      const res = await client.bus["schedules"].$get({
        query: { day: "current" },
      });
      return await res.json();
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  // Show at most 5 upcoming departures
  const departures = Array.isArray(data) ? data.slice(0, 5) : [];

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
            {departures.map((dep: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Bus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-xs">
                    {dep.route ?? dep.bus_type ?? "Bus"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {dep.direction === "up"
                      ? "↑"
                      : dep.direction === "down"
                        ? "↓"
                        : ""}
                  </span>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {dep.time ?? dep.depart_time ?? ""}
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
