import { afterEach, describe, expect, it, mock } from "bun:test";
import ai from "./index";

const originalFetch = globalThis.fetch;

describe("AI endpoint rate limiting", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses the shared AI limiter for every AI endpoint", async () => {
    const keys: string[] = [];
    const response = await ai.request(
      "/status",
      { headers: { "cf-connecting-ip": "198.51.100.20" } },
      {
        AI_RATE_LIMITER: {
          limit: async ({ key }: { key: string }) => {
            keys.push(key);
            return { success: false };
          },
        },
      },
    );

    expect(response.status).toBe(429);
    expect(keys).toEqual(["198.51.100.20"]);
    expect(await response.json()).toMatchObject({
      error: "Too many AI requests. Please try again in a minute.",
    });
  });

  it("fails open when the optional AI limiter binding is absent", async () => {
    const response = await ai.request("/status", {}, {});

    expect(response.status).toBe(200);
  });

  it("rejects malformed test-key JSON with a client error", async () => {
    const response = await ai.request("/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
  });

  it("rejects a JSON null test-key body with a client error", async () => {
    const response = await ai.request("/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });

    expect(response.status).toBe(400);
  });

  it("preserves the web client's valid test-key response", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("test upstream unavailable");
    }) as unknown as typeof fetch;

    const response = await ai.request("/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "client-key" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: false,
      code: "unavailable",
    });
  });
});
