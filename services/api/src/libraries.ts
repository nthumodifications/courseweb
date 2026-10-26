import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { fetchUpstream } from "./utils/upstream";

const UPSTREAM_URL = "https://api.nthusa.tw/libraries/lost-and-found";
const CACHE_KEY = "https://api.nthumods.com/internal/libraries/lost-and-found";
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";
const REQUEST_TIMEOUT_MS = 8_000;

export const LOST_AND_FOUND_SOURCE = {
  name: "NTHU Library Lost and Found",
  url: "https://adage.lib.nthu.edu.tw/find",
} as const;

const lostAndFoundItemSchema = z
  .object({
    序號: z.string().trim().min(1),
    拾獲時間: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    拾獲地點: z.string().trim().min(1),
    描述: z.string().trim().min(1),
  })
  .passthrough();

const lostAndFoundSchema = z.array(lostAndFoundItemSchema);

export interface LostAndFoundItem {
  id: string;
  date: string;
  location: string;
  description: string;
  type: string;
}

export interface LibrariesResponse {
  data: LostAndFoundItem[];
  source: typeof LOST_AND_FOUND_SOURCE;
  error: boolean;
}

export const getLostAndFoundType = (description: string): string =>
  description.trim().split(/\s+/)[0] ?? "";

export const normalizeLostAndFound = (payload: unknown): LostAndFoundItem[] =>
  lostAndFoundSchema.parse(payload).map((item) => ({
    id: item.序號,
    date: item.拾獲時間,
    location: item.拾獲地點,
    description: item.描述,
    type: getLostAndFoundType(item.描述),
  }));

const getCache = (): Cache | undefined => {
  try {
    return typeof caches === "undefined" ? undefined : caches.default;
  } catch {
    return undefined;
  }
};

const readCache = async (cache: Cache): Promise<Response | undefined> => {
  try {
    return await cache.match(new Request(CACHE_KEY));
  } catch (error) {
    console.error("Failed to read lost-and-found cache", error);
    return undefined;
  }
};

const writeCache = (c: Context, response: Response, cache: Cache): void => {
  try {
    const write = cache.put(new Request(CACHE_KEY), response.clone());
    const guardedWrite = write.catch((error) => {
      console.error("Failed to write lost-and-found cache", error);
    });
    try {
      c.executionCtx.waitUntil(guardedWrite);
    } catch {
      void guardedWrite;
    }
  } catch {
    console.error("Failed to start lost-and-found cache write");
  }
};

const fetchLostAndFound = async (
  fetcher: typeof fetch,
): Promise<LostAndFoundItem[]> => {
  const response = await fetchUpstream(
    UPSTREAM_URL,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
    { fetcher },
  );
  return normalizeLostAndFound(await response.json());
};

export const createLibrariesApp = (
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = getCache(),
) =>
  new Hono().get("/lost-and-found", async (c) => {
    const cached = cache ? await readCache(cache) : undefined;
    if (cached) return cached;

    let data: LostAndFoundItem[] = [];
    let error = false;
    try {
      data = await fetchLostAndFound(fetcher);
    } catch (caught) {
      error = true;
      console.error("Failed to fetch lost-and-found data", caught);
    }

    const response = c.json<LibrariesResponse>(
      { data, source: LOST_AND_FOUND_SOURCE, error },
      200,
      { "Cache-Control": CACHE_CONTROL },
    );

    if (!error && cache) {
      writeCache(c, response, cache);
    }
    return response;
  });

const libraries = createLibrariesApp();

export default libraries;
