import { FC, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bike, Star } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import { useYouBikeStations } from "@/hooks/useYouBikeStations";
import { getPinnedStationIds, togglePinnedStationId } from "@/lib/youbike";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";

interface YouBikeWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const YouBikeWidget: FC<YouBikeWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [stationToAdd, setStationToAdd] = useState("");
  const { data: result, isLoading, error } = useYouBikeStations();

  useEffect(() => {
    setPinnedIds(getPinnedStationIds());
  }, []);

  const stations = result?.stations ?? [];
  const pinnedStations = useMemo(
    () =>
      stations.filter((station) => pinnedIds.includes(station.id)).slice(0, 4),
    [pinnedIds, stations],
  );
  const availableToAdd = stations.filter(
    (station) => !pinnedIds.includes(station.id),
  );
  const title =
    dict.settings.calendar.widget_dashboard.widget_options.youbike.title;

  const toggleStation = (id: string) => {
    setPinnedIds(togglePinnedStationId(id));
  };

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        {availableToAdd.length > 0 && (
          <Select
            value={stationToAdd}
            onValueChange={(id) => {
              setStationToAdd("");
              if (id) toggleStation(id);
            }}
          >
            <SelectTrigger
              className="h-7 w-full text-xs"
              aria-label={dict.youbike.pin}
            >
              <SelectValue placeholder={dict.youbike.pin} />
            </SelectTrigger>
            <SelectContent>
              {availableToAdd.map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  {language === "zh" ? station.nameZh : station.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : error && stations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Bike className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.load_error}</span>
          </div>
        ) : pinnedStations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Bike className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.youbike.no_my_stations}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pinnedStations.map((station) => (
              <div
                key={station.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {language === "zh" ? station.nameZh : station.nameEn}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {station.availableBikes} {dict.youbike.available_bikes} ·{" "}
                    {station.emptyDocks} {dict.youbike.empty_docks}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleStation(station.id)}
                    aria-label={dict.youbike.unpin}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          to={`/${language}/youbike`}
          className="text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default YouBikeWidget;
