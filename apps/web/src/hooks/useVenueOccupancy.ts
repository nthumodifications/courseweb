import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";

export type VenueOccupancy = {
  project_id: string;
  project_name: string;
  entry_count_now: number;
  entry_count_today: number;
};

export const useVenueOccupancy = () =>
  useQuery<VenueOccupancy[]>({
    queryKey: ["venue-occupancy"],
    queryFn: async () => {
      const res = await client.venue.occupancy.$get();
      if (!res.ok) throw new Error("Failed to fetch occupancy data");
      const data = await res.json();
      return Array.isArray(data) ? (data as VenueOccupancy[]) : [];
    },
    refetchInterval: 30_000,
  });
