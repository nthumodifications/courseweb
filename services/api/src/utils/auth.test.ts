import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "./auth";

// Under Bun, hono/adapter's env() reads process.env; only workerd reads c.env.
const ENV = {
  NTHUMODS_AUTH_INTROSPECTION_URL: "https://auth.example.com/introspect",
  NTHUMODS_AUTH_CLIENT_ID: "client",
  NTHUMODS_AUTH_CLIENT_SECRET: "secret",
};

const realFetch = globalThis.fetch;
const realEnv = { ...process.env };

beforeEach(() => {
  Object.assign(process.env, ENV);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(ENV)) {
    if (key in realEnv) process.env[key] = realEnv[key];
    else delete process.env[key];
  }
});

/** Stubs the token introspection endpoint with a fixed response. */
const stubIntrospection = (response: Response) => {
  globalThis.fetch = mock(async () => response) as unknown as typeof fetch;
};

const activeToken = (scope: string) =>
  new Response(JSON.stringify({ active: true, username: "u1", scope }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const buildApp = (scopes?: string[], handler?: () => never) =>
  new Hono().get("/protected", auth(scopes), (c) =>
    handler ? handler() : c.json({ ok: true }),
  );

const call = (app: Hono, headers: Record<string, string> = {}) =>
  app.request("/protected", { headers });

describe("auth middleware status codes", () => {
  it("returns 401, not 500, when the Authorization header is missing", async () => {
    const res = await call(buildApp());
    expect(res.status).toBe(401);
  });

  it("returns 401, not 500, when the scheme is not Bearer", async () => {
    const res = await call(buildApp(), { Authorization: "Basic abc" });
    expect(res.status).toBe(401);
  });

  it("returns 401, not 500, when introspection rejects the token", async () => {
    stubIntrospection(new Response("nope", { status: 401 }));
    const res = await call(buildApp(), { Authorization: "Bearer bad" });
    expect(res.status).toBe(401);
  });

  it("returns 401, not 500, when the token is inactive", async () => {
    stubIntrospection(
      new Response(JSON.stringify({ active: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await call(buildApp(), { Authorization: "Bearer expired" });
    expect(res.status).toBe(401);
  });

  it("returns 403, not 500, when the token lacks the required scope", async () => {
    stubIntrospection(activeToken("profile"));
    const res = await call(buildApp(["calendar"]), {
      Authorization: "Bearer ok",
    });
    expect(res.status).toBe(403);
  });

  it("allows a token whose scope matches", async () => {
    stubIntrospection(activeToken("calendar"));
    const res = await call(buildApp(["calendar"]), {
      Authorization: "Bearer ok",
    });
    expect(res.status).toBe(200);
  });

  it("accepts a base scope for a namespaced requirement", async () => {
    stubIntrospection(activeToken("user"));
    const res = await call(buildApp(["user:read"]), {
      Authorization: "Bearer ok",
    });
    expect(res.status).toBe(200);
  });

  it("returns 500 when introspection itself fails unexpectedly", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const res = await call(buildApp(), { Authorization: "Bearer ok" });
    expect(res.status).toBe(500);
  });

  it("does not rewrite a downstream handler's status as an auth failure", async () => {
    stubIntrospection(activeToken("calendar"));
    const app = buildApp(["calendar"], () => {
      throw new HTTPException(404, { message: "Not Found" });
    });
    const res = await call(app, { Authorization: "Bearer ok" });
    expect(res.status).toBe(404);
  });
});
