import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import type { DiningArea } from "./types";

const DINING_REFRESH_MS = 5 * 60 * 1_000;

/**
 * Shared by the shops page and campus cards.
 * The main API proxies https://api.nthusa.tw/dining/ to avoid browser CORS limits.
 * Refresh visible lists without polling while the app is in the background.
 */
export default function useDining() {
  return useQuery<DiningArea[]>({
    queryKey: ["dining"],
    staleTime: DINING_REFRESH_MS,
    refetchInterval: DINING_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await client.dining.$get(undefined, {
        init: { signal },
      });
      if (!response.ok) throw new Error("Failed to fetch dining data");
      return (await response.json()) as DiningArea[];
    },
  });
}
