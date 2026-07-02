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
    expect(await response.json()).toEqual({ userId: "user-id" });
  });
});
