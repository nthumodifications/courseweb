import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toggle,
} from "@courseweb/ui";
import { AlarmClockCheck, Dices, Search, Store, X } from "lucide-react";
// import shops from "./shops.json"
import ShopItem from "./ShopItem";
import useDictionary from "@/dictionaries/useDictionary";
import type { DiningArea } from "./types";
import {
  getShopAreaDeepLinkKey,
  resolveShopAreaDeepLink,
  SHOP_AREAS,
} from "./deep-link";
import { reconcileSearchState } from "@/lib/deep-links/reconcile-search-state";
import {
  getPickActionState,
  getPickRow,
  getShopKey,
  pickCandidates,
  pickRandom,
} from "./pick";

const HIDDEN_STORAGE_KEY = "shops_pick_hidden";
const INCLUDE_SNACKS_STORAGE_KEY = "shops_pick_include_snacks";

const readHiddenPlaces = () => {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(HIDDEN_STORAGE_KEY) ?? "null",
    );
    return Array.isArray(value) &&
      value.every((item) => typeof item === "string")
      ? value
      : [];
  } catch {
    return [];
  }
};

const readIncludeSnacks = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INCLUDE_SNACKS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

type PickSelection = {
  shop: DiningArea["restaurants"][number] | null;
  count: number;
};

const Shops = ({ data }: { data: DiningArea[] }) => {
  const shops = useMemo(() => data.flatMap((area) => area.restaurants), [data]);
  const dict = useDictionary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialDeepLink] = useState(() =>
    resolveShopAreaDeepLink(searchParams, SHOP_AREAS),
  );

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterArea, setFilterArea] = useState(initialDeepLink.area);
  const [filterAreas, setFilterAreas] = useState(initialDeepLink.areas);
  const [hidden, setHidden] = useState<string[]>(readHiddenPlaces);
  const [includeSnacks, setIncludeSnacks] = useState(readIncludeSnacks);
  const [pick, setPick] = useState<PickSelection | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleCandidates, setShuffleCandidates] = useState<typeof shops>([]);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const shuffleTimer = useRef<number | null>(null);
  const previousShops = useRef(shops);
  const deepLinkSearchKey = getShopAreaDeepLinkKey(searchParams);
  const previousDeepLinkSearchKey = useRef(deepLinkSearchKey);

  const stopShuffle = useCallback(() => {
    if (shuffleTimer.current !== null) {
      window.clearInterval(shuffleTimer.current);
      shuffleTimer.current = null;
    }
  }, []);

  useEffect(() => () => stopShuffle(), [stopShuffle]);

  useEffect(() => {
    const previousSearchKey = previousDeepLinkSearchKey.current;
    previousDeepLinkSearchKey.current = deepLinkSearchKey;
    if (previousSearchKey === deepLinkSearchKey) return;

    const next = resolveShopAreaDeepLink(searchParams, SHOP_AREAS);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(hidden));
    } catch {
      // Storage may be unavailable in private browsing or embedded contexts.
    }
  }, [hidden]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        INCLUDE_SNACKS_STORAGE_KEY,
        String(includeSnacks),
      );
    } catch {
      // Storage may be unavailable in private browsing or embedded contexts.
    }
  }, [includeSnacks]);

  const drawPick = useCallback(
    (
      previous: (typeof shops)[number] | null = null,
      hiddenOverride = hidden,
      includeSnacksOverride = includeSnacks,
      areaOverride = filterArea,
    ) => {
      stopShuffle();
      setShuffleCandidates([]);
      const candidates = pickCandidates(shops, {
        now: new Date(),
        area: areaOverride,
        includeSnacks: includeSnacksOverride,
        hidden: hiddenOverride,
      });
      setPick({ shop: null, count: candidates.length });

      if (candidates.length === 0) {
        setIsShuffling(false);
        setShuffleCandidates([]);
        setShuffleIndex(0);
        return;
      }

      const nextCandidates =
        previous && candidates.length > 1
          ? candidates.filter(
              (candidate) => getShopKey(candidate) !== getShopKey(previous),
            )
          : candidates;
      const selected = pickRandom(nextCandidates) ?? candidates[0];
      if (!selected) return;
      setPick({ shop: selected, count: candidates.length });

      if (candidates.length === 1 || prefersReducedMotion()) {
        setIsShuffling(false);
        setShuffleCandidates([]);
        setShuffleIndex(0);
        return;
      }

      const cycle = [
        selected,
        ...Array.from({ length: 7 }, () => pickRandom(candidates) ?? selected),
      ];
      setShuffleCandidates(cycle);
      setShuffleIndex(0);
      setIsShuffling(true);
      let index = 0;
      shuffleTimer.current = window.setInterval(() => {
        index += 1;
        if (index >= cycle.length) {
          stopShuffle();
          setIsShuffling(false);
          setShuffleIndex(0);
          return;
        }
        setShuffleIndex(index);
      }, 80);
    },
    [filterArea, hidden, includeSnacks, shops, stopShuffle],
  );

  useEffect(() => {
    if (previousShops.current === shops) return;
    previousShops.current = shops;
    if (pick) drawPick(pick.shop);
  }, [drawPick, pick, shops]);

  const handleAreaChange = (value: string) => {
    const area = value === "anywhere" ? "" : value;
    setFilterArea(area);
    setFilterAreas(undefined);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("building");
    if (area === "") nextParams.delete("area");
    else nextParams.set("area", area);
    setSearchParams(nextParams, { replace: true });
    if (pick) drawPick(pick.shop, hidden, includeSnacks, area);
  };

  const handleIncludeSnacksChange = (checked: boolean) => {
    setIncludeSnacks(checked);
    if (pick) drawPick(pick.shop, hidden, checked);
  };

  const handleHide = () => {
    const action = getPickActionState(pick?.shop ?? null, isShuffling);
    if (!action.shop) return;
    const nextHidden = [...hidden, getShopKey(action.shop)];
    setHidden(nextHidden);
    drawPick(action.shop, nextHidden);
  };

  const handleResetHidden = () => {
    setHidden([]);
    if (pick) drawPick(pick.shop, [], includeSnacks);
  };

  const handleClosePick = () => {
    stopShuffle();
    setPick(null);
    setIsShuffling(false);
    setShuffleCandidates([]);
    setShuffleIndex(0);
  };

  const pickActionState = getPickActionState(pick?.shop ?? null, isShuffling);

  const shopList = (
    <div className="flex flex-col divide-y divide-border py-4">
      {shops.map((shop) => (
        <ShopItem
          key={getShopKey(shop)}
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
  );

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

        <div className="mt-4 flex flex-nowrap gap-2">
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
            <SelectTrigger className="w-[180px] shrink-0">
              <div className="flex items-center gap-2">
                <Store size="16" />
                <SelectValue placeholder={dict.shops.area_placeholder} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anywhere">{dict.shops.area_all}</SelectItem>
              {SHOP_AREAS.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border bg-background"
            aria-label={dict.shops.pick_for_me}
            disabled={isShuffling}
            onClick={() => drawPick(pick?.shop ?? null)}
          >
            <Dices aria-hidden="true" />
          </Button>
        </div>
      </div>

      {pick ? (
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-2 py-4">
            {pick.shop ? (
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">
                  {dict.shops.pick_summary.replace(
                    "{count}",
                    String(pick.count),
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-10 min-w-10 shrink-0 px-2"
                    disabled={pickActionState.disabled}
                    onClick={() => {
                      if (pickActionState.shop) drawPick(pickActionState.shop);
                    }}
                  >
                    {dict.shops.pick_again}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-10 min-w-10 shrink-0 px-2"
                    disabled={pickActionState.disabled}
                    onClick={handleHide}
                  >
                    {dict.shops.pick_hide}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label={dict.shops.pick_close}
                    onClick={handleClosePick}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 flex-1">
                  {filterArea && filterArea !== "anywhere"
                    ? dict.shops.pick_no_open_area.replace("{area}", filterArea)
                    : dict.shops.pick_no_open}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={dict.shops.pick_close}
                  onClick={handleClosePick}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            )}

            <label
              className="flex min-h-10 items-center gap-2 text-sm"
              htmlFor="shops-pick-include-snacks"
            >
              <Checkbox
                id="shops-pick-include-snacks"
                checked={includeSnacks}
                onCheckedChange={(checked) =>
                  handleIncludeSnacksChange(checked === true)
                }
              />
              <span>{dict.shops.pick_include_snacks}</span>
            </label>

            {hidden.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10 min-w-10 w-max px-2"
                onClick={handleResetHidden}
              >
                {dict.shops.pick_reset_hidden.replace(
                  "{count}",
                  String(hidden.length),
                )}
              </Button>
            )}

            {pick.shop &&
              (() => {
                const pickRow = getPickRow(
                  pick.shop,
                  shuffleCandidates,
                  shuffleIndex,
                );
                return (
                  <div
                    className={
                      pickRow.shops.length > 1 ? "grid min-w-0" : "min-w-0"
                    }
                  >
                    {pickRow.shops.map((shop, index) => (
                      <div
                        className={`${
                          index === pickRow.visibleIndex ? "" : "invisible "
                        }${
                          pickRow.shops.length > 1
                            ? "col-start-1 row-start-1"
                            : ""
                        }`}
                        aria-hidden={index !== pickRow.visibleIndex}
                        key={`${getShopKey(shop)}-${index}`}
                      >
                        <ShopItem
                          shop={shop}
                          filter={{ search: "", open: false, area: "" }}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
          {shopList}
        </div>
      ) : (
        shopList
      )}
    </div>
  );
};

export default Shops;
