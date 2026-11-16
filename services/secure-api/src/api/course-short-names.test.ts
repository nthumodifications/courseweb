import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { User } from "@prisma/client";
import { requireAdmin } from "../middleware/requireAdmin";

const shortNameFindMany = mock();
const shortNameFindUnique = mock();
const shortNameCreate = mock();
const shortNameUpdate = mock();
const shortNameUpdateMany = mock();
const revisionCount = mock();
const revisionCreate = mock();
const revisionFindFirst = mock();
const executeRaw = mock();
const audit = mock(() => Promise.resolve());

const db = {
  courseShortName: {
    findMany: shortNameFindMany,
    findUnique: shortNameFindUnique,
    create: shortNameCreate,
    update: shortNameUpdate,
    updateMany: shortNameUpdateMany,
  },
  courseShortNameRevision: {
    count: revisionCount,
    create: revisionCreate,
    findFirst: revisionFindFirst,
  },
  $executeRaw: executeRaw,
  $transaction: async (callback: (tx: typeof db) => unknown) => callback(db),
};

mock.module("../client", () => ({ default: db }));
mock.module("../../client", () => ({ default: db }));
mock.module("../utils/adminAudit", () => ({ recordAdminAction: audit }));
mock.module("../../utils/adminAudit", () => ({ recordAdminAction: audit }));

const { createCourseShortNamesApp, COURSE_SHORT_NAME_DAILY_LIMIT } =
  await import("./course-short-names");
const { default: adminShortNamesApp } = await import(
  "./admin/course-short-names"
);

const editor = { userId: "student-1", role: "USER", banned: false } as User;
const admin = { userId: "admin-1", role: "ADMIN", banned: false } as User;
let requestUser = editor;
const auth = async (c: any, next: () => Promise<void>) => {
  c.set("user", requestUser);
  await next();
};
const authenticatedApp = createCourseShortNamesApp({ writeAuth: auth });

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "00000000-0000-4000-8000-000000000001",
  identityType: "MODULE",
  identityKey: "CS:2104",
  language: "EN",
  shortName: "Intro II",
  locked: false,
  updatedById: editor.userId,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  ...overrides,
});

const request = (app: Hono, path: string, init?: RequestInit) =>
  app.request(path, init);
const put = (body: unknown): RequestInit => ({
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const validEdit = {
  moduleKey: " cs : 2104 ",
  language: "en",
  shortName: "  <b>I2P2</b>\n ",
};

const adminRequest = (path: string, init?: RequestInit, user = admin) => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.use("/", requireAdmin());
  app.route("/", adminShortNamesApp);
  return request(app, path, init);
};

describe("course short names", () => {
  beforeEach(() => {
    requestUser = editor;
    for (const fn of [
      shortNameFindMany,
      shortNameFindUnique,
      shortNameCreate,
      shortNameUpdate,
      shortNameUpdateMany,
      revisionCount,
      revisionCreate,
      revisionFindFirst,
      executeRaw,
      audit,
    ])
      fn.mockReset();
    shortNameFindMany.mockResolvedValue([entry()]);
    shortNameFindUnique.mockResolvedValue(null);
    shortNameCreate.mockResolvedValue(entry({ shortName: "I2P2" }));
    shortNameUpdate.mockResolvedValue(entry({ shortName: "I2P2" }));
    shortNameUpdateMany.mockResolvedValue({ count: 1 });
    revisionCount.mockResolvedValue(0);
    revisionCreate.mockResolvedValue({ id: "revision-1" });
    revisionFindFirst.mockResolvedValue({ shortName: "Intro II" });
    executeRaw.mockResolvedValue(0);
    audit.mockResolvedValue(undefined);
  });

  test("public reads are cacheable and omit editor identity", async () => {
    const response = await request(authenticatedApp, "/");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public");
    expect(body.entries[0]).toMatchObject({
      identityType: "module",
      identityKey: "CS:2104",
      language: "en",
      shortName: "Intro II",
    });
    expect(body.entries[0].updatedById).toBeUndefined();
  });

  test("requires authentication for edits and validates sanitized length", async () => {
    const unauthenticated = createCourseShortNamesApp({
      writeAuth: async (c) => c.json({ error: "unauthorized" }, 401),
    });
    expect((await request(unauthenticated, "/", put(validEdit))).status).toBe(
      401,
    );

    const invalidLanguage = await request(
      authenticatedApp,
      "/",
      put({ ...validEdit, language: "jp" }),
    );
    const tooLong = await request(
      authenticatedApp,
      "/",
      put({ ...validEdit, shortName: "字".repeat(33) }),
    );
    expect(invalidLanguage.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(shortNameCreate).not.toHaveBeenCalled();
  });

  test("banned signed-in users cannot edit names", async () => {
    requestUser = { ...editor, banned: true };
    const response = await request(authenticatedApp, "/", put(validEdit));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "banned" });
    expect(shortNameCreate).not.toHaveBeenCalled();
  });

  test("normalizes module identity, sanitizes the name, and appends editor history", async () => {
    const response = await request(authenticatedApp, "/", put(validEdit));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      entry: {
        identityType: "module",
        identityKey: "CS:2104",
        language: "en",
        shortName: "I2P2",
      },
    });
    expect(shortNameCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityType: "MODULE",
          identityKey: "CS:2104",
          updatedById: editor.userId,
        }),
      }),
    );
    expect(revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entryId: entry().id,
        editorId: editor.userId,
        shortName: "I2P2",
        action: "EDIT",
      }),
    });
  });

  test("rejects locked entries and enforces the daily write limit", async () => {
    shortNameFindUnique.mockResolvedValueOnce(entry({ locked: true }));
    expect((await request(authenticatedApp, "/", put(validEdit))).status).toBe(
      409,
    );
    expect(revisionCreate).not.toHaveBeenCalled();

    shortNameFindUnique.mockResolvedValueOnce(null);
    revisionCount.mockResolvedValueOnce(COURSE_SHORT_NAME_DAILY_LIMIT);
    expect((await request(authenticatedApp, "/", put(validEdit))).status).toBe(
      429,
    );
    expect(shortNameCreate).not.toHaveBeenCalled();
  });

  test("admin lock and revert are gated, audited, and add an immutable revert revision", async () => {
    const denied = await adminRequest("/", undefined, {
      ...admin,
      role: "USER",
    } as User);
    expect(denied.status).toBe(403);

    const lockResponse = await adminRequest(`/${entry().id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: true, reason: "Abuse reports" }),
    });
    expect(lockResponse.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "course_short_name.lock",
        actorId: admin.userId,
        targetId: entry().id,
      }),
    );

    shortNameFindUnique.mockResolvedValue(entry({ shortName: "I2P2" }));
    const revertResponse = await adminRequest(`/${entry().id}/revert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revisionId: "00000000-0000-4000-8000-000000000002",
        reason: "Restore accepted name",
      }),
    });
    expect(revertResponse.status).toBe(200);
    expect(shortNameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shortName: "Intro II",
          updatedById: admin.userId,
        }),
      }),
    );
    expect(revisionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "REVERT",
          editorId: admin.userId,
        }),
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "course_short_name.revert" }),
    );
  });
});
