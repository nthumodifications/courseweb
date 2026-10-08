import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { Bindings } from "../index";
import { rateLimitMiddleware } from "./rate-limit";

const buildApp = () =>
  new Hono<{ Bindings: Bindings }>()
    .use("*", rateLimitMiddleware({ limiter: "MCP_RATE_LIMITER" }))
    .get("/", (c) => c.text("ok"));

describe("rate limit middleware", () => {
  it("fails open when the binding is missing", async () => {
    const response = await buildApp().request("/", {}, {} as Bindings);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("fails open when the limiter call throws", async () => {
    const response = await buildApp().request("/", {}, {
      MCP_RATE_LIMITER: {
        limit: async () => {
          throw new Error("binding unavailable");
        },
      },
    } as unknown as Bindings);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("uses the client IP as the default key", async () => {
    let key = "";
    const response = await buildApp().request(
      "/",
      { headers: { "cf-connecting-ip": "203.0.113.7" } },
      {
        MCP_RATE_LIMITER: {
          limit: async (request: { key: string }) => {
            key = request.key;
            return { success: true };
          },
        },
      } as unknown as Bindings,
    );

    expect(response.status).toBe(200);
    expect(key).toBe("203.0.113.7");
  });
});
