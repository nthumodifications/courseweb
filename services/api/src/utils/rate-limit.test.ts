import { afterEach, describe, expect, it } from "bun:test";
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

  describe("on routes that must not run unmetered", () => {
    const buildGuardedApp = () => {
      let handled = 0;
      const app = new Hono<{ Bindings: Bindings }>()
        .use(
          "*",
          rateLimitMiddleware({
            limiter: "AI_RATE_LIMITER",
            whenUnavailable: "block",
          }),
        )
        .post("/", (c) => {
          handled += 1;
          return c.text("ok");
        });
      return { app, handled: () => handled };
    };

    const originalNodeEnv = process.env.NODE_ENV;
    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("refuses the request when the limiter call throws", async () => {
      const { app, handled } = buildGuardedApp();

      const response = await app.request("/", { method: "POST" }, {
        AI_RATE_LIMITER: {
          limit: async () => {
            throw new Error("binding unavailable");
          },
        },
      } as unknown as Bindings);

      expect(response.status).toBe(503);
      expect(response.headers.get("Retry-After")).toBe("60");
      expect(handled()).toBe(0);
    });

    it("refuses the request in production when the binding is missing", async () => {
      process.env.NODE_ENV = "production";
      const { app, handled } = buildGuardedApp();

      const response = await app.request(
        "/",
        { method: "POST" },
        {} as Bindings,
      );

      expect(response.status).toBe(503);
      expect(handled()).toBe(0);
    });

    it("still runs without a binding outside production", async () => {
      process.env.NODE_ENV = "development";
      const { app, handled } = buildGuardedApp();

      const response = await app.request(
        "/",
        { method: "POST" },
        {} as Bindings,
      );

      expect(response.status).toBe(200);
      expect(handled()).toBe(1);
    });

    it("lets a request through when the limiter allows it", async () => {
      const { app, handled } = buildGuardedApp();

      const response = await app.request("/", { method: "POST" }, {
        AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
      } as unknown as Bindings);

      expect(response.status).toBe(200);
      expect(handled()).toBe(1);
    });
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
