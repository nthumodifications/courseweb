import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";

export interface DirectoryUnit {
  id: string;
  name: string;
  parentName: string | null;
  url: string | null;
  phone: string | null;
  extension: string | null;
  email: string | null;
  website: string | null;
}

export interface DirectoryResponse {
  data: DirectoryUnit[];
  source: { name: string; url: string };
  error: boolean;
}

export const fetchDirectory = async (
  signal?: AbortSignal,
): Promise<DirectoryResponse> => {
  const directoryClient = client as unknown as {
    directory: {
      $get: (
        input?: undefined,
        options?: { init?: RequestInit },
      ) => Promise<Response>;
    };
  };
  const response = await directoryClient.directory.$get(undefined, {
    init: { signal },
  });
  if (!response.ok) throw new Error("Failed to load directory");
  return response.json() as Promise<DirectoryResponse>;
};

export const useDirectory = () =>
  useQuery({
    queryKey: ["directory"],
    queryFn: ({ signal }) => fetchDirectory(signal),
    staleTime: 15 * 60 * 1000,
  });
