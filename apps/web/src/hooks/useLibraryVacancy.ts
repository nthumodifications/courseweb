import { useQuery } from "@tanstack/react-query";
import {
  LIBRARY_API_ENDPOINT,
  type LibraryVacancyItem,
  type LibraryVacancyResponse,
} from "@/lib/library";

export const useLibraryVacancy = () =>
  useQuery<LibraryVacancyItem[]>({
    queryKey: ["library-vacancy-status"],
    queryFn: async ({ signal }) => {
      const res = await fetch(LIBRARY_API_ENDPOINT, { signal });
      if (!res.ok) {
        throw new Error(`Failed to fetch library API (${res.status})`);
      }
      const json = (await res.json()) as LibraryVacancyResponse;
      if (
        json?.rescode !== 1 ||
        json?.resmsg !== "成功" ||
        !Array.isArray(json?.rows)
      ) {
        throw new Error(
          json?.resmsg || "Invalid or failing API response format",
        );
      }
      return json.rows;
    },
    refetchInterval: 30_000,
  });
