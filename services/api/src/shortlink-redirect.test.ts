import { afterEach, describe, expect, it, mock } from "bun:test";
import shortlinkRedirect from "./shortlink-redirect";

const originalFetch = globalThis.fetch;
const env = {
  CLOUDFLARE_WORKER_ACCOUNT_ID: "account",
  CLOUDFLARE_KV_SHORTLINKS_NAMESPACE: "namespace",
  CLOUDFLARE_KV_API_TOKEN: "token",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("shortlink redirect", () => {
  it("redirects only to the registered site origin", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response("https://nthumods.com/zh/timetable", { status: 200 }),
    ) as unknown as typeof fetch;

    const response = await shortlinkRedirect.request("/trusted", {}, env);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://nthumods.com/zh/timetable",
    );
  });

  it("rejects an external redirect target", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response("https://attacker.example/phishing", { status: 200 }),
    ) as unknown as typeof fetch;

    const response = await shortlinkRedirect.request("/external", {}, env);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { message: "Invalid redirect URL" },
    });
  });
});
