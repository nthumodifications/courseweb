import { afterEach, describe, expect, it, mock } from "bun:test";
import shortlink from "./shortlink";

const originalFetch = globalThis.fetch;
const env = {
  CLOUDFLARE_WORKER_ACCOUNT_ID: "account",
  CLOUDFLARE_KV_SHORTLINKS_NAMESPACE: "namespace",
  CLOUDFLARE_KV_API_TOKEN: "token",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("shortlink creation abuse controls", () => {
  it("stores a same-origin HTTPS URL", async () => {
    const fetchMock = mock(async () => Response.json({ success: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const response = await shortlink.request(
      "/?url=https%3A%2F%2Fnthumods.com%2Fzh%2Ftimetable%3Fsemester%3D11510",
      { method: "PUT" },
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/^https:\/\/nthumods\.com\/l\//);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      "https://nthumods.com/zh/timetable?semester=11510",
    );
  });

  it("rejects other origins and oversized URLs before storage", async () => {
    const fetchMock = mock(async () => Response.json({ success: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const external = await shortlink.request(
      "/?url=https%3A%2F%2Fattacker.example%2Fphishing",
      { method: "PUT" },
      env,
    );
    const oversized = await shortlink.request(
      `/?url=${encodeURIComponent(`https://nthumods.com/${"x".repeat(8200)}`)}`,
      { method: "PUT" },
      env,
    );

    expect(external.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits creation but never lookups", async () => {
    const fetchMock = mock(async () =>
      Response.json({ success: true, result: "x" }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const exhausted = {
      ...env,
      SHORTLINK_RATE_LIMITER: { limit: async () => ({ success: false }) },
    };

    const create = await shortlink.request(
      "/?url=https%3A%2F%2Fnthumods.com%2Fzh%2Ftimetable",
      { method: "PUT" },
      exhausted,
    );
    const lookup = await shortlink.request("/abc", {}, exhausted);

    expect(create.status).toBe(429);
    expect(lookup.status).not.toBe(429);
  });

  it("returns a safe upstream error when KV creation fails", async () => {
    globalThis.fetch = mock(
      async () => new Response("not json", { status: 500 }),
    ) as unknown as typeof fetch;

    const response = await shortlink.request(
      "/?url=https%3A%2F%2Fnthumods.com%2Fzh%2Ftimetable",
      { method: "PUT" },
      env,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Short link service unavailable",
    });
  });

  it("does not serve a non-OK KV response as redirect content", async () => {
    globalThis.fetch = mock(
      async () => new Response("upstream failure", { status: 500 }),
    ) as unknown as typeof fetch;

    const response = await shortlink.request("/abc", {}, env);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Short link service unavailable",
    });
  });

  it("keeps an upstream 404 as a missing link", async () => {
    globalThis.fetch = mock(
      async () => new Response("missing", { status: 404 }),
    ) as unknown as typeof fetch;

    const response = await shortlink.request("/abc", {}, env);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { message: "Link does not exist" },
    });
  });

  it("preserves a successful KV lookup response", async () => {
    globalThis.fetch = mock(
      async () => new Response("https://nthumods.com/zh/timetable"),
    ) as unknown as typeof fetch;

    const response = await shortlink.request("/abc", {}, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("https://nthumods.com/zh/timetable");
  });

  it("rejects oversized shortlink keys before KV access", async () => {
    const fetchMock = mock(async () => new Response("https://nthumods.com"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const response = await shortlink.request(`/${"x".repeat(129)}`, {}, env);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not found for an empty KV value", async () => {
    globalThis.fetch = mock(
      async () => new Response(""),
    ) as unknown as typeof fetch;

    const response = await shortlink.request("/abc", {}, env);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { message: "Link does not exist" },
    });
  });
});
