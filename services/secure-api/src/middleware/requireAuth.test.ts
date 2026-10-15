import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

const tokenFindFirst = mock();
const userFindUnique = mock();

mock.module("@prisma/client", () => ({
  PrismaClient: class {
    token = {
      findFirst: tokenFindFirst,
    };
    user = {
      findUnique: userFindUnique,
    };
  },
}));

const { requireAuth } = await import("./requireAuth");

describe("requireAuth", () => {
  beforeEach(() => {
    tokenFindFirst.mockReset();
    userFindUnique.mockReset();
  });

  test("only accepts access tokens for resource APIs", async () => {
    tokenFindFirst.mockResolvedValueOnce(null);

    const app = new Hono().get("/private", requireAuth(), (c) =>
      c.json({ ok: true }),
    );

    const response = await app.request("/private", {
      headers: {
        Authorization: "Bearer refresh-token",
      },
    });

    expect(response.status).toBe(401);
    expect(tokenFindFirst).toHaveBeenCalledWith({
      where: { token: "refresh-token", type: "ACCESS" },
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  test("rejects a missing token", async () => {
    const app = new Hono().get("/private", requireAuth(), (c) =>
      c.json({ ok: true }),
    );
    const response = await app.request("/private");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "unauthorized",
      error_description: "Access token required",
    });
  });

  test("rejects an expired access token", async () => {
    tokenFindFirst.mockResolvedValueOnce({
      token: "expired-token",
      type: "ACCESS",
      userId: "user-id",
      scopes: [],
      expiresAt: new Date(Date.now() - 60_000),
    });
    const app = new Hono().get("/private", requireAuth(), (c) =>
      c.json({ ok: true }),
    );
    const response = await app.request("/private", {
      headers: { Authorization: "Bearer expired-token" },
    });
    expect(response.status).toBe(401);
  });

  test("accepts a valid unexpired access token", async () => {
    tokenFindFirst.mockResolvedValueOnce({
      token: "access-token",
      type: "ACCESS",
      userId: "user-id",
      scopes: [],
      expiresAt: new Date(Date.now() + 60_000),
    });
    userFindUnique.mockResolvedValueOnce({
      userId: "user-id",
      name: "Test User",
    });

    const app = new Hono().get("/private", requireAuth(), (c) =>
      c.json({ userId: c.var.user.userId }),
    );

    const response = await app.request("/private", {
      headers: {
        Authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ userId: "user-id" });
  });

  test("returns 403 when a valid access token belongs to a banned user", async () => {
    tokenFindFirst.mockResolvedValueOnce({
      token: "access-token",
      type: "ACCESS",
      userId: "user-id",
      scopes: [],
      expiresAt: new Date(Date.now() + 60_000),
    });
    userFindUnique.mockResolvedValueOnce({
      userId: "user-id",
      name: "Test User",
      banned: true,
    });

    const app = new Hono().get("/private", requireAuth(), (c) =>
      c.json({ ok: true }),
    );

    const response = await app.request("/private", {
      headers: {
        Authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "account_suspended",
      error_description: "This account has been suspended",
    });
  });

  test("allows banned users through when requested", async () => {
    tokenFindFirst.mockResolvedValueOnce({
      token: "access-token",
      type: "ACCESS",
      userId: "user-id",
      scopes: [],
      expiresAt: new Date(Date.now() + 60_000),
    });
    userFindUnique.mockResolvedValueOnce({
      userId: "user-id",
      name: "Test User",
      banned: true,
    });
    const app = new Hono().get("/private", requireAuth([], { allowBanned: true }), (c) =>
      c.json({ ok: true }),
    );
    const response = await app.request("/private", {
      headers: { Authorization: "Bearer access-token" },
    });
    expect(response.status).toBe(200);
  });

  test("accepts a present scope from the verified token without a second lookup", async () => {
    tokenFindFirst.mockResolvedValueOnce({
      token: "access-token",
      type: "ACCESS",
      userId: "user-id",
      scopes: ["reviews:write"],
      expiresAt: new Date(Date.now() + 60_000),
    });
    userFindUnique.mockResolvedValueOnce({ userId: "user-id", name: "Test User" });
    const app = new Hono().get("/private", requireAuth(["reviews:write"]), (c) =>
      c.json({ ok: true }),
    );
    const response = await app.request("/private", {
      headers: { Authorization: "Bearer access-token" },
    });
    expect(response.status).toBe(200);
    expect(tokenFindFirst).toHaveBeenCalledTimes(1);
  });

  test("rejects when a required scope is missing", async () => {
    tokenFindFirst.mockResolvedValueOnce({
      token: "access-token",
      type: "ACCESS",
      userId: "user-id",
      scopes: ["reviews:read"],
      expiresAt: new Date(Date.now() + 60_000),
    });
    userFindUnique.mockResolvedValueOnce({ userId: "user-id", name: "Test User" });
    const app = new Hono().get("/private", requireAuth(["reviews:write"]), (c) =>
      c.json({ ok: true }),
    );
    const response = await app.request("/private", {
      headers: { Authorization: "Bearer access-token" },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "insufficient_scope",
      error_description: "Required scopes: reviews:write",
    });
  });
});
