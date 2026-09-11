import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { AdminRole, User } from "@prisma/client";
import type { AdminEnv } from "./env";

const userFindUnique = mock();
const userFindMany = mock();
const userCount = mock();
const userUpdate = mock();
const tokenDeleteMany = mock();
const authSessionsDeleteMany = mock();
const adminAuditCreate = mock();

mock.module("@prisma/client", () => ({
  PrismaClient: class {
    user = {
      findUnique: userFindUnique,
      findMany: userFindMany,
      count: userCount,
      update: userUpdate,
    };
    token = {
      deleteMany: tokenDeleteMany,
    };
    authSessions = {
      deleteMany: authSessionsDeleteMany,
    };
    adminAuditLog = {
      create: adminAuditCreate,
    };
  },
}));

const { default: usersApp } = await import("./users");

const jsonHeaders = { "Content-Type": "application/json" };

const makeUser = (overrides: Partial<User> = {}) =>
  ({
    id: "user-row-id",
    userId: "user-id",
    name: "Test User",
    nameEn: "Test User",
    email: "test@example.com",
    inschool: true,
    cid: null,
    lmsid: null,
    role: "USER" as AdminRole,
    banned: false,
    bannedReason: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  }) as User;

const requestAs = (actor: User, path: string, init?: RequestInit) => {
  const app = new Hono<AdminEnv>();
  app.use("*", async (c, next) => {
    c.set("user", actor);
    await next();
  });
  app.route("/", usersApp);
  return app.request(path, init);
};

const patchJson = (body: unknown): RequestInit => ({
  method: "PATCH",
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

describe("admin users API", () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userFindMany.mockReset();
    userCount.mockReset();
    userUpdate.mockReset();
    tokenDeleteMany.mockReset();
    authSessionsDeleteMany.mockReset();
    adminAuditCreate.mockReset();
  });

  test("refuses changing your own role", async () => {
    const actor = makeUser({ userId: "actor-id", role: "SUPERUSER" });
    const response = await requestAs(
      actor,
      "/actor-id/role",
      patchJson({ role: "ADMIN" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "You cannot change your own role",
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  test("refuses demoting a bootstrap superuser", async () => {
    const actor = makeUser({ userId: "actor-id", role: "SUPERUSER" });
    const response = await requestAs(
      actor,
      "/111060062/role",
      patchJson({ role: "ADMIN" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description:
        "This account is a bootstrap superuser and cannot be demoted",
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  test("refuses banning yourself", async () => {
    const actor = makeUser({ userId: "actor-id", role: "ADMIN" });
    const response = await requestAs(
      actor,
      "/actor-id/ban",
      patchJson({ banned: true, reason: "testing" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      error_description: "You cannot ban yourself",
    });
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  test("prevents an admin from banning another admin", async () => {
    const actor = makeUser({ userId: "actor-id", role: "ADMIN" });
    userFindUnique.mockResolvedValueOnce(
      makeUser({ userId: "target-id", role: "ADMIN" }),
    );

    const response = await requestAs(
      actor,
      "/target-id/ban",
      patchJson({ banned: true }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "forbidden",
      error_description: "Only a superuser can suspend an administrator",
    });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(tokenDeleteMany).not.toHaveBeenCalled();
    expect(authSessionsDeleteMany).not.toHaveBeenCalled();
  });

  test("allows a superuser to ban an admin and revoke both sessions and tokens", async () => {
    const actor = makeUser({ userId: "actor-id", role: "SUPERUSER" });
    userFindUnique.mockResolvedValueOnce(
      makeUser({ userId: "target-id", role: "ADMIN" }),
    );
    userUpdate.mockResolvedValueOnce(
      makeUser({
        userId: "target-id",
        role: "ADMIN",
        banned: true,
        bannedReason: "policy violation",
      }),
    );
    tokenDeleteMany.mockResolvedValueOnce({ count: 2 });
    authSessionsDeleteMany.mockResolvedValueOnce({ count: 1 });

    const response = await requestAs(
      actor,
      "/target-id/ban",
      patchJson({ banned: true, reason: "policy violation" }),
    );

    expect(response.status).toBe(200);
    expect(tokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "target-id" },
    });
    expect(authSessionsDeleteMany).toHaveBeenCalledWith({
      where: { userId: "target-id" },
    });
  });

  test("unban clears the banned reason", async () => {
    const actor = makeUser({ userId: "actor-id", role: "ADMIN" });
    userFindUnique.mockResolvedValueOnce(
      makeUser({
        userId: "target-id",
        banned: true,
        bannedReason: "temporary",
      }),
    );
    userUpdate.mockResolvedValueOnce(
      makeUser({ userId: "target-id", banned: false, bannedReason: null }),
    );

    const response = await requestAs(
      actor,
      "/target-id/ban",
      patchJson({ banned: false }),
    );

    expect(response.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "target-id" },
        data: { banned: false, bannedReason: null },
      }),
    );
    expect(tokenDeleteMany).not.toHaveBeenCalled();
    expect(authSessionsDeleteMany).not.toHaveBeenCalled();
  });

  test("searches all user identity fields and paginates the result", async () => {
    const actor = makeUser({ userId: "actor-id", role: "ADMIN" });
    userCount.mockResolvedValueOnce(41);
    userFindMany.mockResolvedValueOnce([]);

    const response = await requestAs(actor, "/?q=alice&page=3&pageSize=10");

    expect(response.status).toBe(200);

    const expectedWhere = {
      OR: [
        { userId: { contains: "alice", mode: "insensitive" } },
        { name: { contains: "alice", mode: "insensitive" } },
        { nameEn: { contains: "alice", mode: "insensitive" } },
        { email: { contains: "alice", mode: "insensitive" } },
      ],
    };
    expect(userCount).toHaveBeenCalledWith({ where: expectedWhere });
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 20,
        take: 10,
      }),
    );
  });
});
