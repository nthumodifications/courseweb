import { useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/config/api";
import { Button, EmptyState, PageHeader, PageShell, cn } from "@courseweb/ui";
import {
  Dumbbell,
  Droplets,
  Drama,
  Users,
  Circle,
  ChevronRight,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@courseweb/ui";
import { useState } from "react";
import useTime from "@/hooks/useTime";
import { semesterInfo } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import ErrorState from "@/components/Pages/ErrorState";

type OccupancyItem = {
  project_id: string;
  project_name: string;
  entry_count_now: number;
  entry_count_today: number;
};

interface TimeSlot {
  open: string;
  close: string;
}

interface DaySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  holiday: TimeSlot[];
  notes: string | null;
}

interface FacilitySchedule {
  name_zh: string;
  name_en: string;
  schedules: {
    semester: string;
    pdf_url: string;
    hours: DaySchedule | null;
  }[];
}

interface OpeningTimesData {
  facilities: FacilitySchedule[];
  lastUpdated: string;
}

// Maps occupancy API project_name → canonical display name used in the opening-times data
const OCCUPANCY_NAME_ALIASES: Record<string, string> = {
  體能訓練室: "重訓室",
};

// Best-effort max capacities — used only to colour the bar
const CAPACITY_MAP: {
  keyword: string;
  capacity: number;
  Icon: typeof Circle;
}[] = [
  { keyword: "游泳池", capacity: 120, Icon: Droplets },
  { keyword: "羽球", capacity: 80, Icon: Drama },
  { keyword: "桌球", capacity: 60, Icon: Circle },
  { keyword: "重訓", capacity: 100, Icon: Dumbbell },
  { keyword: "健身", capacity: 50, Icon: Dumbbell },
  { keyword: "網球", capacity: 40, Icon: Circle },
];

function venueInfo(name: string): { capacity: number; Icon: typeof Circle } {
  for (const entry of CAPACITY_MAP) {
    if (name.includes(entry.keyword))
      return { capacity: entry.capacity, Icon: entry.Icon };
  }
  return { capacity: 100, Icon: Users };
}

function barColor(ratio: number) {
  if (ratio < 0.5) return "bg-success";
  if (ratio < 0.8) return "bg-warning";
  return "bg-destructive";
}

function badgeColor(ratio: number) {
  if (ratio < 0.5) return "text-success";
  if (ratio < 0.8) return "text-warning";
  return "text-destructive";
}

const DAY_KEYS: (keyof Omit<DaySchedule, "notes">)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS: Record<string, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  holiday: "Holiday",
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function ensureTimeSlotArray(v: unknown): TimeSlot[] {
  return Array.isArray(v) ? (v as TimeSlot[]) : [];
}

type OpenStatus =
  | { type: "open"; until: string }
  | { type: "opens"; at: string }
  | { type: "closed" };

function getOpenStatus(slots: TimeSlot[], now: Date): OpenStatus {
  if (slots.length === 0) return { type: "closed" };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Check if currently inside a slot
  for (const slot of slots) {
    const openMin = toMinutes(slot.open);
    const closeMin = toMinutes(slot.close);
    if (nowMin >= openMin && nowMin < closeMin) {
      return { type: "open", until: slot.close };
    }
  }
  // Check for next upcoming slot today
  const upcoming = slots
    .filter((s) => toMinutes(s.open) > nowMin)
    .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
  if (upcoming.length > 0) {
    return { type: "opens", at: upcoming[0].open };
  }
  return { type: "closed" };
}

/** Returns the semester name that corresponds to today's date using actual semester dates. */
function getCurrentSemesterLabel(): string {
  const now = new Date();
  const active = semesterInfo.find((s) => now >= s.begins && now <= s.ends);
  if (active) return active.semester === 1 ? "上學期" : "下學期";

  const past = semesterInfo.filter((s) => now > s.ends);
  if (past.length === 0) return "上學期";
  const lastEnded = past[past.length - 1];
  const next = semesterInfo.find((s) => s.begins > now);
  if (!next) return "暑假";
  return lastEnded.semester === 1 ? "寒假" : "暑假";
}

/**
 * Returns the best available semester from the list.
 * Prefers the actual current semester; falls back to the first entry if unavailable.
 */
function getBestAvailableSemester(semesters: string[]): string {
  const preferred = getCurrentSemesterLabel();
  return semesters.find((s) => s.includes(preferred)) ?? semesters[0];
}

function matchFacility(
  occupancyName: string,
  facilities: FacilitySchedule[],
): FacilitySchedule | undefined {
  const name = OCCUPANCY_NAME_ALIASES[occupancyName] ?? occupancyName;
  // Exact match first
  let match = facilities.find((f) => f.name_zh === name);
  if (match) return match;
  // Substring match (occupancy name may be shorter)
  match = facilities.find(
    (f) => f.name_zh.includes(name) || name.includes(f.name_zh.slice(0, 3)),
  );
  return match;
}

const StatusBadge = ({ slots, now }: { slots: TimeSlot[]; now: Date }) => {
  const dict = useDictionary();
  const status = getOpenStatus(slots, now);
  if (status.type === "open") {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-success">
        {dict.sports.open_until.replace("{time}", status.until)}
      </span>
    );
  }
  if (status.type === "opens") {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-warning">
        {dict.sports.opens_at.replace("{time}", status.at)}
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
      {dict.sports.closed_today}
    </span>
  );
};

const ScheduleSheet = ({
  facility,
  open,
  onClose,
}: {
  facility: FacilitySchedule;
  open: boolean;
  onClose: () => void;
}) => {
  const dict = useDictionary();
  const currentSemesterLabel = getCurrentSemesterLabel();
  const bestAvailable = getBestAvailableSemester(
    facility.schedules.map((s) => s.semester),
  );
  const [selectedSemester, setSelectedSemester] = useState(bestAvailable);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const schedule = facility.schedules.find(
    (s) => s.semester === selectedSemester,
  );

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const params = selectedSemester
        ? `?semester=${encodeURIComponent(selectedSemester)}`
        : "";
      const res = await fetch(
        `${import.meta.env.VITE_COURSEWEB_API_URL}/sports/refresh${params}`,
        { method: "POST" },
      );
      // 200 = already up-to-date (debounce hit but data exists), 202 = background sync started
      if (res.ok || res.status === 202) {
        // Re-poll after 30s to pick up the background sync result
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["sports-opening-times"] });
        }, 30_000);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {facility.name_zh}
            {facility.name_en !== facility.name_zh && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {facility.name_en}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Semester tabs + refresh button */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {facility.schedules.map((s) => (
            <button
              key={s.semester}
              onClick={() => setSelectedSemester(s.semester)}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                s.semester === selectedSemester
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {s.semester}
              {s.semester.includes(currentSemesterLabel) &&
                ` ${dict.sports.current}`}
            </button>
          ))}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title={dict.sports.refresh_cache}
            className="ml-auto p-1 text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Schedule table */}
        {schedule?.hours ? (
          <>
            <div className="flex flex-col divide-y divide-border">
              {[...DAY_KEYS, "holiday" as const].map((day) => {
                const slots = ensureTimeSlotArray(schedule.hours![day]);
                return (
                  <div key={day} className="flex items-start py-3 gap-4">
                    <span className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
                      {DAY_LABELS[day]}
                    </span>
                    <div className="flex flex-col gap-1">
                      {slots.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {dict.sports.closed}
                        </span>
                      ) : (
                        slots.map((slot, i) => (
                          <span key={i} className="text-sm text-foreground">
                            {slot.open} – {slot.close}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {schedule.hours.notes && (
              <p className="mt-3 text-xs text-muted-foreground">
                {schedule.hours.notes}
              </p>
            )}
            {schedule.pdf_url && (
              <a
                href={schedule.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {dict.sports.view_original_pdf}
              </a>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {dict.sports.schedule_unavailable}
            </p>
            {schedule?.pdf_url && (
              <a
                href={schedule.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {dict.sports.view_original_pdf}
              </a>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const SportsVenuesPage = () => {
  const now = useTime(60_000); // refresh every minute for status badges
  const dict = useDictionary();
  const { language } = useSettings();
  const [selectedFacility, setSelectedFacility] =
    useState<FacilitySchedule | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleGlobalRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_COURSEWEB_API_URL}/sports/refresh`,
        { method: "POST" },
      );
      if (res.ok || res.status === 202) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["sports-opening-times"] });
        }, 30_000);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const {
    data: occupancy,
    dataUpdatedAt,
    isLoading: occupancyLoading,
    error: occupancyError,
    refetch: refetchOccupancy,
  } = useQuery<OccupancyItem[]>({
    queryKey: ["venue-occupancy"],
    queryFn: async () => {
      const res = await client.venue.occupancy.$get();
      if (!res.ok) throw new Error("Failed to fetch occupancy data");
      const data = await res.json();
      return Array.isArray(data) ? (data as OccupancyItem[]) : [];
    },
    refetchInterval: 30_000,
  });

  const {
    data: openingTimes,
    isLoading: openingTimesLoading,
    error: openingTimesError,
    refetch: refetchOpeningTimes,
  } = useQuery<OpeningTimesData | null>({
      queryKey: ["sports-opening-times"],
      queryFn: async () => {
        const res = await (client as any).sports["opening-times"].$get();
        if (res.status === 202) return null; // sync in progress, retry shortly
        return res.json() as Promise<OpeningTimesData>;
      },
      staleTime: 60 * 60 * 1000, // 1 hour — data barely changes
      // Keep retrying every 10s until data is ready (first load triggers background sync)
      refetchInterval: (query) => (query.state.data == null ? 10_000 : false),
    });

  // Build merged list: occupancy items enriched with opening times
  const items = (occupancy ?? []).map((item) => {
    const facility = openingTimes?.facilities
      ? matchFacility(item.project_name, openingTimes.facilities)
      : undefined;

    const currentSemester = facility
      ? getBestAvailableSemester(facility.schedules.map((s) => s.semester))
      : null;
    const todaySlots = (() => {
      if (!facility || !currentSemester) return null;
      const schedule = facility.schedules.find(
        (s) => s.semester === currentSemester,
      );
      if (!schedule?.hours) return null;
      const dayKey = DAY_KEYS[now.getDay()];
      return ensureTimeSlotArray(schedule.hours[dayKey]);
    })();

    return { item, facility, todaySlots };
  });

  const noResults =
    !occupancyLoading &&
    !openingTimesLoading &&
    openingTimes !== null &&
    items.length === 0 &&
    (openingTimes?.facilities.length ?? 0) === 0;

  if (occupancyError || openingTimesError) {
    return (
      <PageShell width="app">
        <PageHeader title={dict.sports.title} />
        <ErrorState
          title={dict.sports.load_error_title}
          description={dict.sports.load_error_description}
          retryLabel={dict.common.try_again}
          onRetry={() => {
            void Promise.all([refetchOccupancy(), refetchOpeningTimes()]);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="app">
      <PageHeader
        title={dict.sports.title}
        description={
          <>
            {dict.sports.data_source}{" "}
            <a
              href="https://peo178.et.nthu.edu.tw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
              aria-label={dict.sports.source_aria}
            >
              {dict.sports.source_name}
            </a>
          </>
        }
        actions={
          <>
            {dataUpdatedAt > 0 && (
              <span className="text-xs text-muted-foreground">
                {dict.sports.updated_at}{" "}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGlobalRefresh}
              disabled={refreshing}
              title={dict.sports.refresh_cache}
              aria-label={dict.sports.refresh_cache}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </>
        }
      />

      {/* Venue list */}
      <div className="flex flex-col divide-y divide-border">
        {noResults && (
          <EmptyState
            icon={Dumbbell}
            title={dict.sports.empty_title}
            description={dict.sports.empty_description}
          />
        )}
        {items.map(({ item, facility, todaySlots }) => {
          const displayName =
            OCCUPANCY_NAME_ALIASES[item.project_name] ?? item.project_name;
          const { capacity, Icon } = venueInfo(displayName);
          const ratio = Math.min(item.entry_count_now / capacity, 1);
          const pct = Math.round(ratio * 100);

          return (
            <div key={item.project_id} className="flex flex-col gap-3 py-4">
              {/* Top row */}
              <div
                className={cn(
                  "flex flex-row items-center gap-4",
                  facility ? "cursor-pointer" : "",
                )}
                onClick={() => facility && setSelectedFacility(facility)}
              >
                <Icon className="h-7 w-7 text-primary shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-foreground font-bold truncate">
                    {displayName}
                  </h3>
                  {todaySlots !== null && (
                    <StatusBadge slots={todaySlots} now={now} />
                  )}
                </div>
                <span
                  className={cn(
                    "font-bold whitespace-nowrap",
                    badgeColor(ratio),
                  )}
                >
                  {item.entry_count_now} {dict.sports.occupancy_people}
                </span>
                {facility && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    barColor(ratio),
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Bottom row */}
              <div className="flex flex-row justify-between text-sm text-muted-foreground">
                <span>
                  {dict.sports.utilization} {pct}%
                </span>
                <span>
                  {dict.sports.entries_today} {item.entry_count_today}{" "}
                  {dict.sports.occupancy_people}
                </span>
              </div>
            </div>
          );
        })}

        {/* Facilities with opening times but no occupancy data */}
        {openingTimes?.facilities
          .filter(
            (f) =>
              !(occupancy ?? []).some((o) =>
                matchFacility(o.project_name, [f]),
              ),
          )
          .map((facility) => {
            const currentSemester = getBestAvailableSemester(
              facility.schedules.map((s) => s.semester),
            );
            const schedule = facility.schedules.find(
              (s) => s.semester === currentSemester,
            );
            const rawTodaySlots = schedule?.hours?.[DAY_KEYS[now.getDay()]];
            const todaySlots = schedule?.hours
              ? ensureTimeSlotArray(rawTodaySlots)
              : null;

            return (
              <div
                key={facility.name_zh}
                className="flex flex-row items-center gap-4 py-4 cursor-pointer"
                onClick={() => setSelectedFacility(facility)}
              >
                <Users className="h-7 w-7 text-primary shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-foreground font-bold truncate">
                    {facility.name_zh}
                  </h3>
                  {todaySlots !== null && (
                    <StatusBadge slots={todaySlots} now={now} />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
      </div>

      {/* Schedule sheet */}
      {selectedFacility && (
        <ScheduleSheet
          facility={selectedFacility}
          open={!!selectedFacility}
          onClose={() => setSelectedFacility(null)}
        />
      )}
    </PageShell>
  );
};

export default SportsVenuesPage;
