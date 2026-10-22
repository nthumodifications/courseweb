import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import type { AnnouncementsData } from "./announcements-core";

export * from "./announcements-core";

export const fetchAnnouncements = async (
  signal?: AbortSignal,
): Promise<AnnouncementsData> => {
  // The checked-in api-types build can lag behind the source workspace during
  // local development; keep the runtime client shared with other API pages.
  const announcementsClient = client as unknown as {
    announcements: {
      $get: (
        input?: undefined,
        options?: { init?: RequestInit },
      ) => Promise<Response>;
    };
  };
  const response = await announcementsClient.announcements.$get(undefined, {
    init: { signal },
  });
  if (!response.ok) throw new Error("Failed to load announcements");
  return response.json() as Promise<AnnouncementsData>;
};

export const useAnnouncements = () =>
  useQuery({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => fetchAnnouncements(signal),
    staleTime: 15 * 60 * 1000,
  });
