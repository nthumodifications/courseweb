import type { Context } from "hono";
import { fetchUpstream } from "./upstream";

export type CachedUpstreamResponse<TData, TSource> = {
  data: TData;
  source: TSource;
  error: boolean;
};

export type CachedUpstreamOptions<TData, TSource> = {
  upstreamUrl: string;
  cacheKey: string;
  cacheControl: string;
  requestTimeoutMs: number;
  source: TSource;
  label: string;
  fetcher: typeof fetch;
  cache: Cache | undefined;
  emptyData: () => TData;
  normalize: (payload: unknown) => TData;
};

export const getDefaultCache = (): Cache | undefined => {
  try {
    return typeof caches === "undefined" ? undefined : caches.default;
  } catch {
    return undefined;
  }
};

const readCache = async (
  cache: Cache,
  key: Request,
  label: string,
): Promise<Response | undefined> => {
  try {
    return await cache.match(key);
  } catch (error) {
    console.error(`Failed to read ${label} cache`, error);
    return undefined;
  }
};

const writeCache = (
  context: Context,
  response: Response,
  cache: Cache,
  key: Request,
  label: string,
): void => {
  try {
    const write = cache.put(key, response.clone());
    const guardedWrite = write.catch((error) => {
      console.error(`Failed to write ${label} cache`, error);
    });
    try {
      context.executionCtx.waitUntil(guardedWrite);
    } catch {
      void guardedWrite;
    }
  } catch {
    console.error(`Failed to start ${label} cache write`);
  }
};

export const createCachedUpstreamHandler = <TData, TSource>(
  options: CachedUpstreamOptions<TData, TSource>,
): ((context: Context) => Promise<Response>) => {
  const {
    upstreamUrl,
    cacheKey,
    cacheControl,
    requestTimeoutMs,
    source,
    label,
    fetcher,
    cache,
    emptyData,
    normalize,
  } = options;
  const key = new Request(cacheKey);

  return async (context) => {
    const cached = cache ? await readCache(cache, key, label) : undefined;
    if (cached) return cached;

    let data = emptyData();
    let error = false;
    try {
      const response = await fetchUpstream(
        upstreamUrl,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(requestTimeoutMs),
        },
        { fetcher },
      );
      data = normalize(await response.json());
    } catch (caught) {
      error = true;
      console.error(`Failed to fetch ${label} data`, caught);
    }

    const response = context.json<CachedUpstreamResponse<TData, TSource>>(
      { data, source, error },
      200,
      { "Cache-Control": error ? "no-store" : cacheControl },
    );

    if (!error && cache) {
      writeCache(context, response, cache, key, label);
    }
    return response;
  };
};
