import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { cn } from "@courseweb/ui";
import { Dumbbell, Droplets, Drama, Users, Circle } from "lucide-react";

type OccupancyItem = {
  project_id: string;
  project_name: string;
  entry_count_now: number;
  entry_count_today: number;
};

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

const SportsVenuesPage = () => {
  const { data, isLoading, error, dataUpdatedAt } = useQuery<OccupancyItem[]>({
    queryKey: ["venue-occupancy"],
    queryFn: async () => {
      const res = await client.venue.occupancy.$get();
      return res.json() as Promise<OccupancyItem[]>;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nthu-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-red-500">
          Failed to load occupancy data. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <h1 className="text-base font-semibold text-slate-800 dark:text-neutral-100">
          即時使用人數
        </h1>
        {dataUpdatedAt > 0 && (
          <span className="text-xs text-slate-400">
            更新於 {new Date(dataUpdatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      {/* Venue list */}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-neutral-700">
        {data.map((item) => {
          const { capacity, Icon } = venueInfo(item.project_name);
          const ratio = Math.min(item.entry_count_now / capacity, 1);
          const pct = Math.round(ratio * 100);

          return (
            <div key={item.project_id} className="flex flex-col gap-3 py-4">
              {/* Top row */}
              <div className="flex flex-row items-center gap-4">
                <Icon className="h-7 w-7 text-nthu-500 shrink-0" />
                <h3 className="text-slate-800 dark:text-neutral-100 font-bold flex-1">
                  {item.project_name}
                </h3>
                <span
                  className={cn(
                    "font-bold whitespace-nowrap",
                    badgeColor(ratio),
                  )}
                >
                  {item.entry_count_now} 人
                </span>
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
      </div>
    </div>
  );
};

export default SportsVenuesPage;
