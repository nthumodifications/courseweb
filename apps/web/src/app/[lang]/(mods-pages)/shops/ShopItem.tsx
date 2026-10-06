import React from "react";
import { Badge, Button } from "@courseweb/ui";
import { MapPin, MapPinned, Phone, Clock, Info } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getDiningMapHref } from "@/features/dining/locations";
import type { DiningShop } from "./types";
import { checkOpen, getTodayKey } from "./shop-hours";
import useDictionary from "@/dictionaries/useDictionary";

interface ShopItemProps {
  shop: DiningShop;
  filter: {
    search: string;
    open: boolean;
    area: string;
  };
}

const ShopItem: React.FC<ShopItemProps> = ({ shop, filter }) => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const mapHref = getDiningMapHref(lang, shop.area);
  const today = getTodayKey();

  let [isOpen, status, message] = checkOpen(shop.schedule[today]);

  if (
    filter?.search &&
    !shop.name.toLowerCase().includes(filter.search.toLowerCase())
  ) {
    return null;
  }

  if (filter?.open && !isOpen) {
    return null;
  }

  if (filter?.area && filter.area !== shop.area && filter.area !== "anywhere") {
    return null;
  }

  const statusLabel =
    {
      營業中: dict.shops.open_now,
      休息中: dict.shops.closed,
      今日休息: dict.shops.closed_today,
      即將開始: dict.shops.opening_soon,
      即將休息: dict.shops.closing_soon,
      無資訊: dict.shops.no_info,
    }[status] ?? status;
  const messageLabel = message
    ?.replace("24小時營業", dict.shops.open_24h)
    .replace("開始營業", dict.shops.opens_at)
    .replace("後休息", dict.shops.closes_at);

  return (
    <div className="flex min-w-0 gap-4 py-4">
      <div className="flex flex-col">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col">
          <span className="font-bold">{shop.name}</span>
          <div className="flex items-center gap-1">
            <MapPin size="14" />
            <span className="text-muted-foreground text-sm">{shop.area}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="flex gap-2 flex-col sm:items-center sm:flex-row">
              <Badge
                className="w-max"
                variant={isOpen ? "default" : "destructive"}
              >
                {statusLabel}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {messageLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="grid grid-cols-[1.5rem_auto]">
            <Phone size="14" className="self-center" />
            {shop.phone ? (
              shop.phone.split(",").map((phone, index) => (
                <span
                  key={index}
                  className={
                    "text-muted-foreground text-sm " +
                    (index ? "col-start-2" : "")
                  }
                >
                  {phone}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">
                {dict.shops.no_phone}
              </span>
            )}
          </div>
          <div className="grid grid-cols-[1.5rem_auto]">
            <Clock size="14" className="self-center" />
            <span className="text-muted-foreground text-sm">
              {shop.schedule[today] || dict.shops.closed_today}
            </span>
          </div>
          {shop.note && (
            <div className="grid grid-cols-[1.5rem_auto]">
              <Info size="14" className="mt-1" />
              <span className="text-muted-foreground text-sm">{shop.note}</span>
            </div>
          )}
        </div>
        {mapHref ? (
          <Button asChild variant="outline" size="sm" className="mt-3 min-h-11">
            <Link
              to={mapHref}
              aria-label={`${dict.shops.view_on_map} · ${shop.name}`}
            >
              <MapPinned className="mr-2 h-4 w-4" aria-hidden="true" />
              {dict.shops.view_on_map}
            </Link>
          </Button>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {dict.shops.map_unavailable}
          </p>
        )}
      </div>
    </div>
  );
};

export default ShopItem;
