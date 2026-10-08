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
});
