import { describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import { createCachedUpstreamHandler } from "./cached-upstream";

const source = { name: "Test source", url: "https://example.com" };

const createApp = (fetcher: typeof fetch, cache: Cache | undefined) =>
  new Hono().get(
    "/",
    createCachedUpstreamHandler({
      upstreamUrl: "https://upstream.example/data",
      cacheKey: "https://cache.example/data",
      cacheControl: "public, max-age=60",
      requestTimeoutMs: 8_000,
      source,
      label: "test",
      fetcher,
      cache,
      emptyData: () => [] as string[],
      normalize: (payload) => (payload as { values: string[] }).values,
    }),
  );

describe("cached upstream handler", () => {
  test("fetches, normalizes, and caches a successful response", async () => {
    const fetcher = mock(async () => Response.json({ values: ["one"] }));
    let cacheWrites = 0;
    let cacheUrl = "";
    const cache = {
      match: async () => undefined,
      put: async (request: Request) => {
        cacheWrites += 1;
        cacheUrl = request.url;
      },
    } as unknown as Cache;

    const response = await createApp(
      fetcher as unknown as typeof fetch,
      cache,
    ).request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(await response.json()).toEqual({
      data: ["one"],
      source,
      error: false,
    });
    expect(cacheWrites).toBe(1);
    expect(cacheUrl).toBe("https://cache.example/data");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://upstream.example/data");
  });

  test("returns an empty flagged response without caching on failure", async () => {
    const fetcher = mock(async () => {
      throw new Error("network failure");
    });
    let cacheWrites = 0;
    const cache = {
      match: async () => undefined,
      put: async () => {
        cacheWrites += 1;
      },
    } as unknown as Cache;

    const response = await createApp(
      fetcher as unknown as typeof fetch,
      cache,
    ).request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ data: [], source, error: true });
    expect(cacheWrites).toBe(0);
  });
});
