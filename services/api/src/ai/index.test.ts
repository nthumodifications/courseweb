import { afterEach, describe, expect, it } from "bun:test";
import ai from "./index";

describe("AI endpoint rate limiting", () => {
  afterEach(() => {
    // Keep the test explicit that no network call is needed for /status.
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
});
