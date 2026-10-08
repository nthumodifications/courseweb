import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Bindings } from "../index";
import chat from "./index";

const authEnv = {
  NTHUMODS_AUTH_INTROSPECTION_URL: "https://auth.example.com/introspect",
  NTHUMODS_AUTH_CLIENT_ID: "client",
  NTHUMODS_AUTH_CLIENT_SECRET: "secret",
};
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(authEnv)) {
    if (key in originalEnv) process.env[key] = originalEnv[key];
    else delete process.env[key];
  }
});

describe("chat endpoint guardrails", () => {
  it("uses the authenticated user as the AI limiter key", async () => {
    Object.assign(process.env, authEnv);
    globalThis.fetch = mock(async () =>
      Response.json({ active: true, username: "user-1", scope: "" }),
    ) as unknown as typeof fetch;
    const keys: string[] = [];

    const response = await chat.request(
      "/",
      { headers: { Authorization: "Bearer test-token" } },
      {
        AI_RATE_LIMITER: {
          limit: async ({ key }: { key: string }) => {
            keys.push(key);
            return { success: false };
          },
        },
      } as unknown as Bindings,
    );

    expect(response.status).toBe(429);
    expect(keys).toEqual(["user-1"]);
  });
});
