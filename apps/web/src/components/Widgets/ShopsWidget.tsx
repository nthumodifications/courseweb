import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { Store } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import useDining from "@/features/dining/useDining";
import type { DiningShop } from "@/features/dining/types";
import {
  checkOpen,
  getTodayKey,
  type OpenStatus,
} from "@/app/[lang]/(mods-pages)/shops/shop-hours";
import areas from "@/app/[lang]/(mods-pages)/shops/areas.json";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";

interface ShopsWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

type OpenShop = { shop: DiningShop; status: OpenStatus };

const getMessageLabel = (
  message: string | undefined,
  dict: ReturnType<typeof useDictionary>,
) =>
  message
    ?.replace("24小時營業", dict.shops.open_24h)
    .replace("開始營業", dict.shops.opens_at)
    .replace("後休息", dict.shops.closes_at);

const ShopsWidget: FC<ShopsWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const now = useTime(60_000);
  const [storedArea, setStoredArea] = useLocalStorage(
    "widget_shops_area",
    "anywhere",
  );
  const area =
    storedArea === "anywhere" || areas.includes(storedArea)
      ? storedArea
      : "anywhere";
  const { data = [], isLoading, error } = useDining();
  const today = getTodayKey();

  const openShops = useMemo<OpenShop[]>(() => {
    void now;
    return data
      .flatMap((diningArea) => diningArea.restaurants)
      .filter((shop) => area === "anywhere" || shop.area === area)
      .map((shop) => ({ shop, status: checkOpen(shop.schedule[today]) }))
      .filter(({ status }) => status[0]);
  }, [area, data, now, today]);

  const nextOpening = useMemo(() => {
    const shops = data
      .flatMap((diningArea) => diningArea.restaurants)
      .filter((shop) => area === "anywhere" || shop.area === area);
    return shops
      .map((shop) => checkOpen(shop.schedule[today]))
      .find((status) => status[1] === "即將開始" && status[2])?.[2];
  }, [area, data, now, today]);

  const title =
    dict.settings.calendar.widget_dashboard.widget_options.shops.title;
  const areaLabel = area === "anywhere" ? dict.shops.area_all : area;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        <Select value={area} onValueChange={setStoredArea}>
          <SelectTrigger
            className="h-7 w-full text-xs"
            aria-label={dict.shops.area_placeholder}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anywhere">{dict.shops.area_all}</SelectItem>
            {areas.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : error && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Store className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.load_error}</span>
          </div>
        ) : (
          <>
            {data.length > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {openShops.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dict.shops.open_now}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {areaLabel}
                </div>
              </div>
            )}
            {openShops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Store className="mb-2 h-8 w-8 opacity-40" />
                <span className="text-xs">
                  {dict.shops.no_open}
                  {nextOpening && (
                    <>
                      {` ${dict.shops.separator} `}
                      {getMessageLabel(nextOpening, dict)}
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {openShops.slice(0, 4).map(({ shop, status }) => (
                  <div
                    key={`${shop.area}-${shop.name}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{shop.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {getMessageLabel(status[2], dict)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <Link
          to={`/${language}/shops`}
          className="text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default ShopsWidget;
