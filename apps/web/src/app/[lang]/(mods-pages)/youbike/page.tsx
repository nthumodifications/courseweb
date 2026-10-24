import { useSettings } from "@/hooks/contexts/settings";
import { Helmet } from "react-helmet-async";
import { cn, Tabs, TabsList, TabsTrigger } from "@courseweb/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getPinnedStationIds,
  togglePinnedStationId,
  isNandaCampusStation,
  type YouBikeStation,
  type YouBikeTab,
} from "@/lib/youbike";
import { useYouBikeStations } from "@/hooks/useYouBikeStations";
import { Bike, Zap, Star, Search, MapPin } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import OpenCollectiveSponsorBanner from "@/components/Sponsorship/OpenCollectiveSponsorBanner";
import { activateOnKey } from "@/lib/activate-on-key";
import { contentLanguage } from "@/helpers/contentLanguage";
import { hasDeepLinkRequestChanged } from "@/lib/deep-links/deep-link";
import { parseYouBikeDeepLink } from "./deep-link";

export type YouBikeItemProps = {
  station: YouBikeStation;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
};

export const YouBikeListingItem = ({
  station,
  isPinned,
  onTogglePin,
}: YouBikeItemProps) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const localizeData = useLocalizedZhData();

  const isZh = contentLanguage(language) === "zh";
  const name = isZh ? localizeData(station.nameZh) : station.nameEn;
  const address = isZh ? localizeData(station.addressZh) : station.addressEn;
  const isOutOfService = station.status === 2;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;

  const handlePinClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onTogglePin(station.id);
  };

  return (
    <div
      data-youbike-station-id={station.id}
      className={cn(
        "flex flex-col gap-4 py-4",
        isOutOfService ? "opacity-30" : "",
      )}
    >
      <div className="flex flex-row items-center gap-4">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 group"
          title={dict.youbike.open_in_google_maps}
        >
          <Bike className="h-7 w-7 text-foreground group-hover:text-primary transition-colors" />
        </a>

        <div className="flex flex-1 min-w-0 flex-col gap-0.5 sm:flex-initial">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 min-w-0 max-w-full"
            title={dict.youbike.open_in_google_maps}
          >
            <h3 className="text-foreground font-bold truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <MapPin className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </a>
          {address && (
            <p className="text-sm text-muted-foreground truncate">{address}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-center justify-end gap-3 text-right font-bold whitespace-nowrap sm:flex-1">
          {isOutOfService ? (
            <span className="text-muted-foreground">
              {dict.youbike.out_of_service}
            </span>
          ) : (
            <>
              {/* Regular bikes count */}
              <div className="flex items-center gap-1">
                <Bike className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{station.regularBikes}</span>
              </div>

              {/* e-Bikes count */}
              <div className="flex items-center gap-1">
                <Zap
                  className={cn(
                    "w-4 h-4",
                    station.eBikes > 0
                      ? "text-nthu-500 fill-nthu-500"
                      : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    station.eBikes > 0 ? "text-nthu-500" : "text-foreground",
                  )}
                >
                  {station.eBikes}
                </span>
              </div>

              {/* Empty docks count */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                <span
                  className="sm:hidden"
                  aria-label={`${dict.youbike.empty_docks}: ${station.emptyDocks}`}
                >
                  ({station.emptyDocks})
                </span>
                <span className="hidden sm:inline">
                  ({dict.youbike.empty_docks}: {station.emptyDocks})
                </span>
              </div>
            </>
          )}

          {/* Pin Favorite Button */}
          <button
            type="button"
            onClick={handlePinClick}
            onKeyDown={activateOnKey(() => onTogglePin(station.id))}
            className="p-1 rounded-md hover:bg-card transition-colors shrink-0"
            title={isPinned ? dict.youbike.unpin : dict.youbike.pin}
            aria-label={isPinned ? dict.youbike.unpin : dict.youbike.pin}
          >
            <Star
              className={cn(
                "w-5 h-5 transition-transform hover:scale-110",
                isPinned
                  ? "text-amber-400 fill-amber-400"
                  : "text-muted-foreground",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

const YouBikePage = () => {
  const dict = useDictionary();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLink = useMemo(
    () => parseYouBikeDeepLink(searchParams),
    [searchParams],
  );
  const [tab, setTab] = useState<YouBikeTab>(deepLink.tab ?? "mine");
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedIdsReady, setPinnedIdsReady] = useState(false);
  const lastAppliedTab = useRef<YouBikeTab | undefined | null>(null);
  const lastAppliedStation = useRef<string | undefined | null>(null);

  useEffect(() => {
    setPinnedIds(getPinnedStationIds());
    setPinnedIdsReady(true);
  }, []);

  useEffect(() => {
    if (!hasDeepLinkRequestChanged(lastAppliedTab.current, deepLink.tab)) {
      return;
    }
    lastAppliedTab.current = deepLink.tab;
    setTab(deepLink.tab ?? "mine");
  }, [deepLink.tab]);

  const handleTogglePin = (id: string) => {
    const next = togglePinnedStationId(id);
    setPinnedIds(next);
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as YouBikeTab;
    setTab(nextTab);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("tab", nextTab);
        return next;
      },
      { replace: true },
    );
  };

  const {
    data: result = { stations: [], source: "api" as const },
    isLoading,
    error,
  } = useYouBikeStations();

  const filteredStations = useMemo(() => {
    let list = result.stations;

    // Filter by tab
    if (tab === "main") {
      list = list.filter((s) => !isNandaCampusStation(s));
    } else if (tab === "nanda") {
      list = list.filter((s) => isNandaCampusStation(s));
    } else if (tab === "mine") {
      list = list.filter((s) => pinnedIds.includes(s.id));
    }

    // Filter by search text
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.nameZh.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.addressZh.toLowerCase().includes(q) ||
          s.addressEn.toLowerCase().includes(q),
      );
    }

    return list;
  }, [result.stations, tab, search, pinnedIds]);

  useEffect(() => {
    const stationId = deepLink.stationId;
    if (!hasDeepLinkRequestChanged(lastAppliedStation.current, stationId)) {
      return;
    }
    if (!stationId) {
      lastAppliedStation.current = undefined;
      return;
    }
    if (isLoading || error || (tab === "mine" && !pinnedIdsReady)) return;

    const station = result.stations.find((item) => item.id === stationId);
    if (!station) return;

    const stationInTab =
      tab === "all" ||
      (tab === "main" && !isNandaCampusStation(station)) ||
      (tab === "nanda" && isNandaCampusStation(station)) ||
      (tab === "mine" && pinnedIds.includes(station.id));
    if (!stationInTab) {
      handleTabChange("all");
      return;
    }

    const frame = requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-youbike-station-id="${stationId}"]`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      lastAppliedStation.current = stationId;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    deepLink.stationId,
    error,
    isLoading,
    pinnedIds,
    pinnedIdsReady,
    result.stations,
    tab,
  ]);

  return (
    <div className="flex flex-col px-4 md:px-6">
      <Helmet>
        <title>{dict.youbike.title} - NTHUMods</title>
      </Helmet>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto mb-4">
          <TabsTrigger className="flex-1 shrink-0" value="mine">
            {dict.youbike.tabs.mine} ({pinnedIds.length})
          </TabsTrigger>
          <TabsTrigger className="flex-1 shrink-0" value="main">
            {dict.youbike.tabs.main}
          </TabsTrigger>
          <TabsTrigger className="flex-1 shrink-0" value="nanda">
            {dict.youbike.tabs.nanda}
          </TabsTrigger>
          <TabsTrigger className="flex-1 shrink-0" value="all">
            {dict.youbike.tabs.all}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
        <input
          type="text"
          aria-label={dict.youbike.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.youbike.search_placeholder}
          className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          Loading YouBike data...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-8 text-left text-muted-foreground text-sm">
          YouBike service temporarily unavailable.
        </div>
      )}

      {/* Empty Mine state */}
      {!isLoading &&
        !error &&
        tab === "mine" &&
        filteredStations.length === 0 && (
          <div className="py-8 text-left text-muted-foreground text-sm">
            {dict.youbike.no_my_stations}
          </div>
        )}

      {/* Empty Search state */}
      {!isLoading &&
        !error &&
        tab !== "mine" &&
        filteredStations.length === 0 && (
          <div className="py-8 text-left text-muted-foreground text-sm">
            {dict.youbike.no_stations}
          </div>
        )}

      {/* Station Listing */}
      {!isLoading && !error && filteredStations.length > 0 && (
        <div className="flex flex-col px-2 divide-y divide-border">
          {filteredStations.map((station) => (
            <YouBikeListingItem
              key={station.id}
              station={station}
              isPinned={pinnedIds.includes(station.id)}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      <div className="h-6" />
      <OpenCollectiveSponsorBanner />
    </div>
  );
};

export default YouBikePage;
