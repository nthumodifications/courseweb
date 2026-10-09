import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { WashingMachine } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { useLaundryStatus } from "@/hooks/useLaundryStatus";
import {
  LAUNDRY_AREAS,
  LAUNDRY_DORMS,
  LAUNDRY_MACHINES,
  type LaundryArea,
  type LaundryDorm,
} from "@/const/laundry-machines";
import {
  selectAreaSummary,
  type LaundrySummary,
} from "@/lib/laundry-selectors";
import useDictionary from "@/dictionaries/useDictionary";

interface LaundryWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

type WidgetDorm = LaundryDorm | "all";

const sumSummary = (summaries: LaundrySummary[]): LaundrySummary =>
  summaries.reduce(
    (total, summary) => ({
      total: total.total + summary.total,
      available: total.available + summary.available,
      paying: total.paying + summary.paying,
      running: total.running + summary.running,
      paused: total.paused + summary.paused,
      pickup: total.pickup + summary.pickup,
      awaitingStart: total.awaitingStart + summary.awaitingStart,
      unavailable: total.unavailable + summary.unavailable,
    }),
    {
      total: 0,
      available: 0,
      paying: 0,
      running: 0,
      paused: 0,
      pickup: 0,
      awaitingStart: 0,
      unavailable: 0,
    },
  );

const LaundryWidget: FC<LaundryWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const now = useTime(60_000);
  const [storedDorm, setStoredDorm] = useLocalStorage<WidgetDorm>(
    "widget_laundry_dorm",
    "all",
  );
  const dorm =
    storedDorm === "all" || storedDorm in LAUNDRY_DORMS ? storedDorm : "all";
  const { statuses, connectionState } = useLaundryStatus();
  const areas = useMemo(
    () =>
      (Object.keys(LAUNDRY_AREAS) as LaundryArea[]).filter(
        (area) => dorm === "all" || LAUNDRY_AREAS[area].dorm === dorm,
      ),
    [dorm],
  );
  const summaries = useMemo(
    () =>
      areas.map((area) =>
        selectAreaSummary(LAUNDRY_MACHINES, statuses, area, now.getTime()),
      ),
    [areas, now, statuses],
  );

  const title =
    dict.settings.calendar.widget_dashboard.widget_options.laundry.title;
  const washer = sumSummary(summaries.map((summary) => summary.washer));
  const dryer = sumSummary(summaries.map((summary) => summary.dryer));
  const noStatuses = Object.keys(statuses).length === 0;
  const isLoading =
    noStatuses &&
    (connectionState === "connecting" || connectionState === "reconnecting");
  const isError = noStatuses && connectionState === "error";
  const connectionLabel =
    connectionState === "live"
      ? dict.laundry.connection_live
      : connectionState === "connecting"
        ? dict.laundry.connection_connecting
        : connectionState === "reconnecting"
          ? dict.laundry.connection_reconnecting
          : dict.laundry.connection_error;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        <select
          value={dorm}
          onChange={(event) => setStoredDorm(event.target.value as WidgetDorm)}
          aria-label={dict.laundry.my_dorm}
          className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs"
        >
          <option value="all">{dict.laundry.all_dorms}</option>
          {(Object.keys(LAUNDRY_DORMS) as LaundryDorm[]).map((value) => (
            <option key={value} value={value}>
              {LAUNDRY_DORMS[value][language]}
            </option>
          ))}
        </select>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <WashingMachine className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.laundry.load_error}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            {[
              { label: dict.laundry.washers, summary: washer },
              { label: dict.laundry.dryers, summary: dryer },
            ].map(({ label, summary }) => (
              <div className="flex items-center justify-between" key={label}>
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {summary.available}/{summary.total}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <WashingMachine className="h-3.5 w-3.5" />
          <span>{connectionLabel}</span>
        </div>
        <Link
          to={`/${language}/laundry`}
          className="text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default LaundryWidget;
