import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { cn } from "@courseweb/ui";
import { Dumbbell, Droplets, Drama, Users, Circle, ChevronRight, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@courseweb/ui";
import { useState } from "react";
import useTime from "@/hooks/useTime";

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

// Best-effort max capacities — used only to colour the bar
const CAPACITY_MAP: { keyword: string; capacity: number; Icon: typeof Circle }[] =
  [
    { keyword: "游泳池", capacity: 120, Icon: Droplets },
    { keyword: "羽球", capacity: 80, Icon: Drama },
    { keyword: "桌球", capacity: 60, Icon: Circle },
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
  if (ratio < 0.5) return "bg-green-500";
  if (ratio < 0.8) return "bg-yellow-500";
  return "bg-red-500";
}

function badgeColor(ratio: number) {
  if (ratio < 0.5) return "text-green-600 dark:text-green-400";
  if (ratio < 0.8) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
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

type OpenStatus =
  | { type: "open"; until: string }
  | { type: "opens"; at: string }
  | { type: "closed" };

function getOpenStatus(slots: TimeSlot[], now: Date): OpenStatus {
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

function guessCurrentSemester(semesters: string[]): string {
  const month = new Date().getMonth() + 1;
  let preferred: string;
  if (month >= 9 || month === 1) preferred = "上學期";
  else if (month === 2) preferred = "寒假";
  else if (month >= 3 && month <= 6) preferred = "下學期";
  else preferred = "暑假";
  return semesters.find((s) => s.includes(preferred)) ?? semesters[0];
}

function matchFacility(
  occupancyName: string,
  facilities: FacilitySchedule[],
): FacilitySchedule | undefined {
  // Exact match first
  let match = facilities.find((f) => f.name_zh === occupancyName);
  if (match) return match;
  // Substring match (occupancy name may be shorter)
  match = facilities.find(
    (f) =>
      f.name_zh.includes(occupancyName) ||
      occupancyName.includes(f.name_zh.slice(0, 3)),
  );
  return match;
}

const StatusBadge = ({
  slots,
  now,
}: {
  slots: TimeSlot[];
  now: Date;
}) => {
  const status = getOpenStatus(slots, now);
  if (status.type === "open") {
    return (
      <span className="text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
        OPEN TILL {status.until}
      </span>
    );
  }
  if (status.type === "opens") {
    return (
      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
        OPENS AT {status.at}
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-slate-400 dark:text-neutral-500 whitespace-nowrap">
      CLOSED TODAY
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
  const currentSemester = guessCurrentSemester(
    facility.schedules.map((s) => s.semester),
  );
  const [selectedSemester, setSelectedSemester] = useState(currentSemester);

  const schedule = facility.schedules.find(
    (s) => s.semester === selectedSemester,
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {facility.name_zh}
            {facility.name_en !== facility.name_zh && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                {facility.name_en}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Semester tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {facility.schedules.map((s) => (
            <button
              key={s.semester}
              onClick={() => setSelectedSemester(s.semester)}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                s.semester === selectedSemester
                  ? "bg-nthu-500 text-white border-nthu-500"
                  : "border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400",
              )}
            >
              {s.semester}
              {s.semester === currentSemester && " (current)"}
            </button>
          ))}
        </div>

        {/* Schedule table */}
        {schedule?.hours ? (
          <>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-neutral-800">
              {[...DAY_KEYS, "holiday" as const].map((day) => {
                const slots = schedule.hours![day] as TimeSlot[];
                return (
                  <div key={day} className="flex items-start py-3 gap-4">
                    <span className="w-16 text-sm font-medium text-slate-500 dark:text-neutral-400 shrink-0">
                      {DAY_LABELS[day]}
                    </span>
                    <div className="flex flex-col gap-1">
                      {slots.length === 0 ? (
                        <span className="text-sm text-slate-400">Closed</span>
                      ) : (
                        slots.map((slot, i) => (
                          <span
                            key={i}
                            className="text-sm text-slate-800 dark:text-neutral-100"
                          >
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
              <p className="mt-3 text-xs text-slate-400 dark:text-neutral-500">
                {schedule.hours.notes}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">Schedule not yet available.</p>
        )}
      </SheetContent>
    </Sheet>
  );
};

const SportsVenuesPage = () => {
  const now = useTime(60_000); // refresh every minute for status badges
  const [selectedFacility, setSelectedFacility] =
    useState<FacilitySchedule | null>(null);

  const { data: occupancy, dataUpdatedAt } = useQuery<OccupancyItem[]>({
    queryKey: ["venue-occupancy"],
    queryFn: async () => {
      const res = await client.venue.occupancy.$get();
      return res.json() as Promise<OccupancyItem[]>;
    },
    refetchInterval: 30_000,
  });

  const { data: openingTimes } = useQuery<OpeningTimesData>({
    queryKey: ["sports-opening-times"],
    queryFn: async () => {
      const res = await (client as any).sports["opening-times"].$get();
      return res.json() as Promise<OpeningTimesData>;
    },
    staleTime: 60 * 60 * 1000, // 1 hour — data barely changes
  });

  // Build merged list: occupancy items enriched with opening times
  const items = (occupancy ?? []).map((item) => {
    const facility = openingTimes
      ? matchFacility(item.project_name, openingTimes.facilities)
      : undefined;

    const currentSemester = facility
      ? guessCurrentSemester(facility.schedules.map((s) => s.semester))
      : null;
    const todaySlots = (() => {
      if (!facility || !currentSemester) return null;
      const schedule = facility.schedules.find(
        (s) => s.semester === currentSemester,
      );
      if (!schedule?.hours) return null;
      const dayKey = DAY_KEYS[now.getDay()];
      return schedule.hours[dayKey] as TimeSlot[];
    })();

    return { item, facility, todaySlots };
  });

  return (
    <div className="flex flex-col px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <h1 className="text-base font-semibold text-slate-800 dark:text-neutral-100">
          體育館場
        </h1>
        {dataUpdatedAt > 0 && (
          <span className="text-xs text-slate-400">
            更新於{" "}
            {new Date(dataUpdatedAt).toLocaleTimeString("zh-TW", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Venue list */}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-neutral-700">
        {items.map(({ item, facility, todaySlots }) => {
          const { capacity, Icon } = venueInfo(item.project_name);
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
                <Icon className="h-7 w-7 text-nthu-500 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-slate-800 dark:text-neutral-100 font-bold truncate">
                    {item.project_name}
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
                  {item.entry_count_now} 人
                </span>
                {facility && (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    barColor(ratio),
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Bottom row */}
              <div className="flex flex-row justify-between text-sm text-slate-500 dark:text-neutral-400">
                <span>使用率 {pct}%</span>
                <span>今日進場 {item.entry_count_today} 人</span>
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
            const currentSemester = guessCurrentSemester(
              facility.schedules.map((s) => s.semester),
            );
            const schedule = facility.schedules.find(
              (s) => s.semester === currentSemester,
            );
            const todaySlots = schedule?.hours
              ? (schedule.hours[DAY_KEYS[now.getDay()]] as TimeSlot[])
              : null;

            return (
              <div
                key={facility.name_zh}
                className="flex flex-row items-center gap-4 py-4 cursor-pointer"
                onClick={() => setSelectedFacility(facility)}
              >
                <Users className="h-7 w-7 text-nthu-500 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-slate-800 dark:text-neutral-100 font-bold truncate">
                    {facility.name_zh}
                  </h3>
                  {todaySlots !== null && (
                    <StatusBadge slots={todaySlots} now={now} />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            );
          })}
      </div>

      {/* Data source */}
      <div className="mt-4 pb-4 text-xs text-slate-400 dark:text-neutral-500">
        資料來源：
        <a
          href="https://peo178.et.nthu.edu.tw"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          aria-label="國立清華大學體育中心 (opens in new tab)"
        >
          國立清華大學體育中心
        </a>
      </div>

      {/* Schedule sheet */}
      {selectedFacility && (
        <ScheduleSheet
          facility={selectedFacility}
          open={!!selectedFacility}
          onClose={() => setSelectedFacility(null)}
        />
      )}
    </div>
  );
};

export default SportsVenuesPage;
