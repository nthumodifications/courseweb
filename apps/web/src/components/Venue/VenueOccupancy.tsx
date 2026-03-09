import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";

type OccupancyItem = {
  project_id: string;
  project_name: string;
  entry_count_now: number;
  entry_count_today: number;
};

const MAX_CAPACITY: Record<string, number> = {
  游泳池: 100,
  羽球館: 80,
  桌球館: 60,
  健身房: 50,
  網球場: 40,
};

function getCapacity(name: string): number {
  for (const [key, cap] of Object.entries(MAX_CAPACITY)) {
    if (name.includes(key)) return cap;
  }
  return 100;
}

function occupancyColor(ratio: number): string {
  if (ratio < 0.5) return "bg-green-500";
  if (ratio < 0.8) return "bg-yellow-500";
  return "bg-red-500";
}

const VenueOccupancy = () => {
  const { data, isLoading, error, dataUpdatedAt } = useQuery<OccupancyItem[]>({
    queryKey: ["venue-occupancy"],
    queryFn: async () => {
      const res = await client.venue.occupancy.$get();
      return res.json() as Promise<OccupancyItem[]>;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-6 text-gray-400 text-sm">
        Loading occupancy...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid place-items-center py-6 text-red-400 text-sm">
        Failed to load occupancy data.
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">場館使用人數 Live</h2>
        {dataUpdatedAt > 0 && (
          <span className="text-xs text-gray-400">
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {data.map((item) => {
          const capacity = getCapacity(item.project_name);
          const ratio = Math.min(item.entry_count_now / capacity, 1);
          const pct = Math.round(ratio * 100);
          return (
            <div
              key={item.project_id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1"
            >
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{item.project_name}</span>
                <span className="text-gray-500 text-xs">
                  {item.entry_count_now} 人 · 今日 {item.entry_count_today} 人
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${occupancyColor(ratio)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 text-right">{pct}% 使用率</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VenueOccupancy;
