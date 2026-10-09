import { FC } from "react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { Dumbbell } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import { useVenueOccupancy } from "@/hooks/useVenueOccupancy";
import useDictionary from "@/dictionaries/useDictionary";

interface SportsVenuesWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const SportsVenuesWidget: FC<SportsVenuesWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [venueId, setVenueId] = useLocalStorage("widget_sports_venue", "all");
  const { data = [], isLoading, error } = useVenueOccupancy();
  const selectedVenueId = data.some((item) => item.project_id === venueId)
    ? venueId
    : "all";
  const selected =
    selectedVenueId === "all"
      ? undefined
      : data.find((item) => item.project_id === selectedVenueId);
  const current = selected
    ? selected.entry_count_now
    : data.reduce((total, item) => total + item.entry_count_now, 0);
  const today = selected
    ? selected.entry_count_today
    : data.reduce((total, item) => total + item.entry_count_today, 0);
  const title =
    dict.settings.calendar.widget_dashboard.widget_options["sports-venues"]
      .title;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        <select
          value={selectedVenueId}
          onChange={(event) => setVenueId(event.target.value)}
          aria-label={dict.sports.title}
          className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs"
        >
          <option value="all">{dict.common.all}</option>
          {data.map((item) => (
            <option key={item.project_id} value={item.project_id}>
              {item.project_name}
            </option>
          ))}
        </select>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : error && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Dumbbell className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.load_error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Dumbbell className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.no_results}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">{current}</div>
              <div className="text-xs text-muted-foreground">
                {dict.sports.occupancy_people}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{selected?.project_name ?? dict.sports.title}</div>
              <div>
                {dict.sports.entries_today}: {today}
              </div>
            </div>
          </div>
        )}
        <Link
          to={`/${language}/sports-venues`}
          className="text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default SportsVenuesWidget;
