import { useQuery } from "@tanstack/react-query";
import { getYouBikeStations } from "@/lib/youbike";

export const useYouBikeStations = () =>
  useQuery({
    queryKey: ["youbike_stations"],
    queryFn: getYouBikeStations,
    staleTime: 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.source === "api" ? 60 * 1000 : false,
  });
