import { Hono } from "hono";
import { z } from "zod";
import {
  createCachedUpstreamHandler,
  getDefaultCache,
  type CachedUpstreamResponse,
} from "./utils/cached-upstream";

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

const lostAndFoundPayloadSchema = z.array(z.unknown());

export interface LostAndFoundItem {
  id: string;
  date: string;
  location: string;
  description: string;
  type: string;
}

export type LibrariesResponse = CachedUpstreamResponse<
  LostAndFoundItem[],
  typeof LOST_AND_FOUND_SOURCE
>;

export const getLostAndFoundType = (description: string): string =>
  description.trim().split(/\s+/)[0] ?? "";

export const normalizeLostAndFound = (payload: unknown): LostAndFoundItem[] => {
  const entries = lostAndFoundPayloadSchema.parse(payload);

  return entries.flatMap((entry) => {
    const parsed = lostAndFoundItemSchema.safeParse(entry);
    if (!parsed.success) return [];

    const item = parsed.data;
    return [
      {
        id: item.序號,
        date: item.拾獲時間,
        location: item.拾獲地點,
        description: item.描述,
        type: getLostAndFoundType(item.描述),
      },
    ];
  });
};

export const createLibrariesApp = (
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = getDefaultCache(),
) =>
  new Hono().get(
    "/lost-and-found",
    createCachedUpstreamHandler({
      upstreamUrl: UPSTREAM_URL,
      cacheKey: CACHE_KEY,
      cacheControl: CACHE_CONTROL,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      source: LOST_AND_FOUND_SOURCE,
      label: "lost-and-found",
      fetcher,
      cache,
      emptyData: (): LostAndFoundItem[] => [],
      normalize: normalizeLostAndFound,
    }),
  );

const libraries = createLibrariesApp();

export default libraries;
