import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";

export interface LostAndFoundItem {
  id: string;
  date: string;
  location: string;
  description: string;
  type: string;
}

export interface LibraryLostAndFoundResponse {
  data: LostAndFoundItem[];
  source: { name: string; url: string };
  error: boolean;
}

export const fetchLibraryLostAndFound = async (
  signal?: AbortSignal,
): Promise<LibraryLostAndFoundResponse> => {
  const librariesClient = client as unknown as {
    libraries: {
      "lost-and-found": {
        $get: (options?: { init?: RequestInit }) => Promise<Response>;
      };
    };
  };
  const response = await librariesClient.libraries["lost-and-found"].$get({
    init: { signal },
  });
  if (!response.ok) throw new Error("Failed to load lost-and-found items");
  return response.json() as Promise<LibraryLostAndFoundResponse>;
};

export const useLibraryLostAndFound = () =>
  useQuery({
    queryKey: ["library-lost-and-found"],
    queryFn: ({ signal }) => fetchLibraryLostAndFound(signal),
    staleTime: 15 * 60 * 1000,
  });
