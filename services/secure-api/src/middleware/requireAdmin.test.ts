import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { AdminRole, User } from "@prisma/client";

const userFindUnique = mock();

mock.module("@prisma/client", () => ({
  PrismaClient: class {
    user = {
      findUnique: userFindUnique,
    };
  },
}));

const { hasAtLeastRole, requireAdmin } = await import("./requireAdmin");

type AdminEnv = {
  Variables: {
    user: User;
  };
};

const makeUser = (role: AdminRole, banned = false) =>
  ({
    userId: "user-id",
    role,
    banned,
  }) as User;

const appFor = (user: User | undefined, minimum: AdminRole = "ADMIN") => {
  const app = new Hono<AdminEnv>();

  if (user) {
    app.use("*", async (c, next) => {
      c.set("user", user);
      await next();
    });
  }

  app.get("/private", requireAdmin(minimum), (c) => c.json({ ok: true }));
  return app;
};

describe("hasAtLeastRole", () => {
  test("ranks user below admin and superuser", () => {
    expect(hasAtLeastRole("USER", "USER")).toBe(true);
    expect(hasAtLeastRole("USER", "ADMIN")).toBe(false);
    expect(hasAtLeastRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasAtLeastRole("ADMIN", "SUPERUSER")).toBe(false);
    expect(hasAtLeastRole("SUPERUSER", "ADMIN")).toBe(true);
    expect(hasAtLeastRole("SUPERUSER", "SUPERUSER")).toBe(true);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    userFindUnique.mockReset();
  });

  test("returns 401 when there is no authenticated user", async () => {
    const response = await appFor(undefined).request("/private");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "unauthorized",
      error_description: "Access token required",
    });
  });

  test("returns 403 for a regular user", async () => {
    const response = await appFor(makeUser("USER")).request("/private");

    expect(response.status).toBe(403);
  });

  test("returns 403 for a banned superuser", async () => {
    const response = await appFor(makeUser("SUPERUSER", true)).request(
      "/private",
    );

    expect(response.status).toBe(403);
  });

  test("allows an admin at the default minimum", async () => {
    const response = await appFor(makeUser("ADMIN")).request("/private");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("allows a superuser at the default minimum", async () => {
    const response = await appFor(makeUser("SUPERUSER")).request("/private");

    expect(response.status).toBe(200);
  });

  test("refuses an admin when superuser access is required", async () => {
    const response = await appFor(makeUser("ADMIN"), "SUPERUSER").request(
      "/private",
    );

    expect(response.status).toBe(403);
  });
});
