import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toggle,
} from "@courseweb/ui";
import { Search, AlarmClockCheck, Store } from "lucide-react";
// import shops from "./shops.json"
import ShopItem from "./ShopItem";
import areas from "./areas.json";
import useDictionary from "@/dictionaries/useDictionary";
import type { DiningArea } from "./types";
import { getShopAreaDeepLinkKey, resolveShopAreaDeepLink } from "./deep-link";
import { reconcileSearchState } from "@/lib/reconcile-search-state";

const Shops = ({ data }: { data: DiningArea[] }) => {
  const shops = data.flatMap((area) => area.restaurants);
  const dict = useDictionary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialDeepLink] = useState(() =>
    resolveShopAreaDeepLink(searchParams, areas),
  );

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterArea, setFilterArea] = useState(initialDeepLink.area);
  const [filterAreas, setFilterAreas] = useState(initialDeepLink.areas);
  const deepLinkSearchKey = getShopAreaDeepLinkKey(searchParams);
  const previousDeepLinkSearchKey = useRef(deepLinkSearchKey);

  useEffect(() => {
    const previousSearchKey = previousDeepLinkSearchKey.current;
    previousDeepLinkSearchKey.current = deepLinkSearchKey;
    if (previousSearchKey === deepLinkSearchKey) return;

    const next = resolveShopAreaDeepLink(searchParams, areas);
    setFilterArea((current) =>
      reconcileSearchState(
        current,
        next.area,
        previousSearchKey,
        deepLinkSearchKey,
      ),
    );
    setFilterAreas((current) =>
      reconcileSearchState(
        current,
        next.areas,
        previousSearchKey,
        deepLinkSearchKey,
      ),
    );
  }, [deepLinkSearchKey, searchParams]);

  const handleAreaChange = (value: string) => {
    setFilterArea(value === "anywhere" ? "" : value);
    setFilterAreas(undefined);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("building");
    if (value === "anywhere") nextParams.delete("area");
    else nextParams.set("area", value);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="flex flex-col px-4">
      <div className="sticky top-0">
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-lg">
          <Search />
          <Input
            type="text"
            placeholder={dict.shops.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <div className="mt-4">
            <span>{dict.shops.search_results_prefix} </span>
            <span className="font-bold">{`"${search}"`}</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Toggle
            className="flex items-center gap-2 border bg-background"
            pressed={filterOpen}
            onPressedChange={setFilterOpen}
          >
            <AlarmClockCheck size="16" />
            {dict.shops.open_now}
          </Toggle>
          {/* <Toggle className="flex items-center gap-2 border bg-background">
            <MapPinned size="16" />
            Near me
          </Toggle> */}
          <Select value={filterArea} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Store size="16" />
                <SelectValue placeholder={dict.shops.area_placeholder} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anywhere">{dict.shops.area_all}</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border py-4">
        {shops.map((shop) => (
          <ShopItem
            key={shop.name}
            shop={shop}
            filter={{
              search: search,
              open: filterOpen,
              area: filterArea,
              areas: filterAreas,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Shops;
