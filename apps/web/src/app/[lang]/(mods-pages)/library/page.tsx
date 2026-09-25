import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  BookOpen,
  ChevronRight,
  Clock,
  DoorClosed,
  ExternalLink,
  Headphones,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { Button, cn, ErrorState, Skeleton } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import {
  formatZoneName,
  getBranchFromItem,
  getBranchOpenStatus,
  getCategoryFromItem,
  getLocalizedSpaceTypeName,
  getTaipeiDate,
  getZoneCapacity,
  LIBRARY_API_ENDPOINT,
  LIBRARY_BOOKING_URL,
  type LibraryBranch,
  type LibraryVacancyItem,
  type LibraryVacancyResponse,
  type SpaceCategory,
} from "@/lib/library";

function getCategoryIcon(category: SpaceCategory) {
  switch (category) {
    case "moonlight":
      return Moon;
    case "discussion":
      return Users;
    case "carrel":
      return DoorClosed;
    case "workstation":
      return Monitor;
    case "av":
      return Headphones;
    case "group":
      return Users;
    default:
      return BookOpen;
  }
}

function getProgressColor(ratio: number) {
  if (ratio > 0.5) return "bg-emerald-600";
  if (ratio > 0.15) return "bg-amber-500";
  if (ratio > 0) return "bg-rose-500";
  return "bg-muted-foreground/30";
}

function getBadgeColor(count: number, isClosed: boolean) {
  if (isClosed || count === 0) return "text-muted-foreground";
  if (count > 10) return "text-foreground font-bold";
  return "text-foreground font-bold";
}

const LibraryPage = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const now = useTime(60_000); // refresh time check every minute

  const [selectedBranch, setSelectedBranch] = useState<LibraryBranch>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<SpaceCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, dataUpdatedAt, isLoading, isFetching, error, refetch } =
    useQuery<LibraryVacancyItem[]>({
      queryKey: ["library-vacancy-status"],
      queryFn: async () => {
        const res = await fetch(LIBRARY_API_ENDPOINT);
        if (!res.ok) {
          throw new Error(`Failed to fetch library API (${res.status})`);
        }
        const json = (await res.json()) as LibraryVacancyResponse;
        if (
          !json ||
          json.rescode !== 1 ||
          json.resmsg !== "成功" ||
          !Array.isArray(json.rows)
        ) {
          throw new Error(
            json?.resmsg || "Invalid or failing API response format",
          );
        }
        return json.rows;
      },
      refetchInterval: 30_000,
    });

  const items = useMemo(() => data ?? [], [data]);

  // Overall statistics calculations - respect operating hours
  const stats = useMemo(() => {
    let totalAvailable = 0;
    let moonlightSeats = 0;
    let discussionAndCarrels = 0;
    let pcWorkstations = 0;

    for (const item of items) {
      const branch = getBranchFromItem(item);
      const branchStatus = getBranchOpenStatus(branch, now);
      const isClosed = branchStatus.status === "closed";
      const count = isClosed ? 0 : item.count;

      totalAvailable += count;
      const cat = getCategoryFromItem(item);
      if (cat === "moonlight") moonlightSeats += count;
      if (cat === "discussion" || cat === "carrel") {
        discussionAndCarrels += count;
      }
      if (cat === "workstation") pcWorkstations += count;
    }

    return {
      totalAvailable,
      moonlightSeats,
      discussionAndCarrels,
      pcWorkstations,
    };
  }, [items, now]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const branch = getBranchFromItem(item);
      const category = getCategoryFromItem(item);

      if (selectedBranch !== "all" && branch !== selectedBranch) {
        return false;
      }
      if (selectedCategory !== "all" && category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const formattedName = formatZoneName(
          item.zonename,
          language,
        ).toLowerCase();
        const rawName = item.zonename.toLowerCase();
        const matchName =
          formattedName.includes(query) || rawName.includes(query);
        const localizedType = getLocalizedSpaceTypeName(
          item,
          dict,
        ).toLowerCase();
        const rawType = item.spacetypename.toLowerCase();
        const matchType =
          localizedType.includes(query) || rawType.includes(query);
        if (!matchName && !matchType) return false;
      }
      return true;
    });
  }, [items, selectedBranch, selectedCategory, searchQuery, language, dict]);

  const mainStatus = getBranchOpenStatus("main", now);

  const taipeiNow = getTaipeiDate(now);
  const taipeiDay = taipeiNow.getDay();
  const isWeekend = taipeiDay === 0 || taipeiDay === 6;

  const title = dict.library.title;
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | NTHUMods`,
    url: `https://nthumods.com/${language}/library`,
    inLanguage: language === "en" ? "en-US" : "zh-TW",
    isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
  };

  if (error && items.length === 0) {
    return (
      <>
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(pageJsonLd)}
          </script>
        </Helmet>
        <div className="flex flex-col px-4 py-8">
          <ErrorState
            title={dict.library.load_error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                {dict.library.try_again}
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{dict.library.meta_title} | NTHUMods</title>
        <meta name="description" content={dict.library.meta_description} />
        <script type="application/ld+json">{JSON.stringify(pageJsonLd)}</script>
      </Helmet>

      <div className="flex flex-col px-4">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground">{title}</h1>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
              {dict.applist.beta}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {dataUpdatedAt > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {dict.library.updated_at}{" "}
                {new Date(dataUpdatedAt).toLocaleTimeString(
                  language === "en" ? "en-US" : "zh-TW",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  },
                )}
              </span>
            )}
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              title={dict.library.refresh}
              aria-label={dict.library.refresh}
              className="p-1 text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
            <a
              href={LIBRARY_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span>{dict.library.booking_portal_short}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Overview Stats Row */}
        <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4 border-b border-border">
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">
              {dict.library.stats_total_available}
            </span>
            <span className="text-xl font-bold text-primary">
              {stats.totalAvailable}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Moon className="h-3.5 w-3.5 text-primary" />
                {dict.library.stats_moonlight_seats}
              </span>
              <span className="rounded bg-primary/10 px-1 text-[10px] font-bold text-primary">
                24H
              </span>
            </div>
            <span className="text-xl font-bold text-foreground">
              {stats.moonlightSeats}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              {dict.library.stats_discussion_rooms}
            </span>
            <span className="text-xl font-bold text-foreground">
              {stats.discussionAndCarrels}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5 text-primary" />
              {dict.library.stats_pc_workstations}
            </span>
            <span className="text-xl font-bold text-foreground">
              {stats.pcWorkstations}
            </span>
          </div>
        </div>

        {/* Operating Hours Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>
              {isWeekend
                ? `${dict.library.branch_main_short}: 09:00–17:00`
                : dict.library.hours_info_main}{" "}
              ・ {dict.library.hours_info_moonlight}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium">
              🌙 {dict.library.branch_moonlight_short} {dict.library.open_24h}
            </span>
            {mainStatus.status === "open" ? (
              <span>
                {dict.library.branch_main_short}{" "}
                {dict.library.open_until.replace("{time}", mainStatus.openTill)}
              </span>
            ) : mainStatus.status === "closed" && mainStatus.isHoliday ? (
              <span>
                {dict.library.branch_main_short} {dict.library.closed_holiday}
              </span>
            ) : (
              <span>
                {dict.library.branch_main_short} {dict.library.closed}
              </span>
            )}
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col gap-2 py-3 border-b border-border">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={dict.library.search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Branch selector */}
            <select
              aria-label={dict.library.filter_branch_all}
              value={selectedBranch}
              onChange={(e) =>
                setSelectedBranch(e.target.value as LibraryBranch)
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              <option value="all">{dict.library.filter_branch_all}</option>
              <option value="moonlight">
                {dict.library.filter_branch_moonlight}
              </option>
              <option value="main">{dict.library.filter_branch_main}</option>
              <option value="hss">{dict.library.filter_branch_hss}</option>
              <option value="ctm">{dict.library.filter_branch_ctm}</option>
            </select>

            {/* Category selector */}
            <select
              aria-label={dict.library.filter_cat_all}
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as SpaceCategory)
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              <option value="all">{dict.library.filter_cat_all}</option>
              <option value="moonlight">
                {dict.library.filter_cat_moonlight}
              </option>
              <option value="discussion">
                {dict.library.filter_cat_discussion}
              </option>
              <option value="carrel">{dict.library.filter_cat_carrel}</option>
              <option value="workstation">
                {dict.library.filter_cat_workstation}
              </option>
              <option value="av">{dict.library.filter_cat_av}</option>
              <option value="group">{dict.library.filter_cat_group}</option>
            </select>
          </div>
        </div>

        {/* Vacancy List */}
        {isLoading ? (
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-4 py-4">
                <div className="flex flex-row items-center gap-4">
                  <Skeleton className="h-7 w-7 rounded shrink-0" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-left text-sm text-muted-foreground">
            {dict.library.no_results}・{dict.library.no_results_desc}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filteredItems.map((item) => {
              const category = getCategoryFromItem(item);
              const branch = getBranchFromItem(item);
              const branchStatus = getBranchOpenStatus(branch, now);
              const isClosed = branchStatus.status === "closed";
              const isHoliday =
                branchStatus.status === "closed" &&
                Boolean(branchStatus.isHoliday);
              const effectiveCount = isClosed ? 0 : item.count;

              const capacity = getZoneCapacity(item);
              const Icon = getCategoryIcon(category);
              const ratio =
                capacity !== null && capacity > 0 && !isClosed
                  ? Math.min(effectiveCount / capacity, 1)
                  : 0;
              const pct = Math.round(ratio * 100);

              const isMoonlight = category === "moonlight";
              const isRoom =
                category === "discussion" ||
                category === "carrel" ||
                category === "group";

              const unitLabel = isRoom
                ? dict.library.units_room
                : dict.library.units_seat;

              const branchShortName =
                branch === "moonlight"
                  ? dict.library.branch_moonlight_short
                  : branch === "hss"
                    ? dict.library.branch_hss_short
                    : branch === "ctm"
                      ? dict.library.branch_ctm_short
                      : dict.library.branch_main_short;

              const displayName = formatZoneName(item.zonename, language);

              return (
                <div
                  key={item.zoneid || item.zonename}
                  className={cn(
                    "flex flex-col gap-3 py-4 transition-colors",
                    (isClosed || effectiveCount === 0) && "opacity-40",
                  )}
                >
                  {/* Main row: Icon + Zone Name -> Answer on right */}
                  <div className="flex flex-row items-center gap-4">
                    <Icon className="h-7 w-7 text-primary shrink-0" />

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground truncate">
                          {displayName}
                        </h3>
                        {isMoonlight && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            24H
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {branchShortName}・
                        {getLocalizedSpaceTypeName(item, dict)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      {isClosed ? (
                        <span className="font-bold whitespace-nowrap text-sm text-muted-foreground">
                          {isHoliday
                            ? dict.library.closed_holiday
                            : dict.library.closed}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "font-bold whitespace-nowrap text-base",
                            getBadgeColor(effectiveCount, isClosed),
                          )}
                        >
                          {effectiveCount} {unitLabel} {dict.library.available}
                        </span>
                      )}
                      <a
                        href={LIBRARY_BOOKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title={dict.library.booking_portal_short}
                        aria-label={`${dict.library.booking_portal_short} - ${displayName}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Vacancy Progress Bar */}
                  <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        getProgressColor(ratio),
                      )}
                      style={{
                        width: `${capacity !== null && !isClosed && effectiveCount > 0 ? Math.max(pct, 5) : pct}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          {dict.library.data_source}{" "}
          <a
            href={LIBRARY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            {dict.library.source_name}
          </a>
        </div>

        <div className="h-6" />
      </div>
    </>
  );
};

export default LibraryPage;
