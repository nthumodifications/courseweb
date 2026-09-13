import { afterEach, describe, expect, it, mock } from "bun:test";
import dining from "./dining";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("dining proxy", () => {
  it("returns and caches successful upstream data", async () => {
    const upstreamData = [
      {
        building: "小吃部",
        restaurants: [{ name: "Example restaurant" }],
      },
    ];
    const fetchMock = mock(async () => Response.json(upstreamData));
    globalThis.fetch = fetchMock;

    const response = await dining.request("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(upstreamData);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.nthusa.tw/dining/");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Accept: "application/json" },
    });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 502 when the upstream responds with an error", async () => {
    globalThis.fetch = mock(async () =>
      Response.json({ error: "upstream failure" }, { status: 503 }),
    );

    const response = await dining.request("/");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Dining service is unavailable",
    });
  });

  it("returns 502 when the upstream request fails", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("network failure");
    });

    const response = await dining.request("/");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Dining service is unavailable",
    });
  });
});
