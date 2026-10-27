import { describe, expect, mock, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import { bytesToBase64url } from "../push/base64url";

const endpoint = "https://fcm.googleapis.com/subscription/abc";
const p256dh = bytesToBase64url(
  Uint8Array.from([
    4, 37, 113, 178, 190, 205, 253, 227, 96, 85, 26, 175, 30, 208, 244, 205,
    54, 108, 17, 206, 190, 85, 95, 137, 188, 183, 177, 134, 165, 51, 57, 23,
    49, 104, 236, 226, 235, 224, 24, 89, 123, 211, 4, 121, 184, 110, 60, 143,
    142, 206, 213, 119, 202, 89, 24, 126, 146, 70, 153, 13, 182, 130, 0, 139,
    14,
  ]),
);
const auth = bytesToBase64url(new Uint8Array(16).fill(2));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "subscription-id",
  userId: "user-1",
  endpoint,
  p256dh,
  auth,
  failureCount: 0,
  language: "zh",
  courseChanges: true,
  announcementSources: ["source-1"],
  lastCourseChangeId: 7n,
  lastDigestDate: null,
  testWindowStartedAt: null,
  testCount: 0,
  createdAt: new Date(0),
  lastSeenAt: new Date(0),
  ...overrides,
});

const authMiddleware: MiddlewareHandler<any> = async (c, next) => {
  c.set("user", { userId: "user-1" });
  await next();
};

const noRateLimit: MiddlewareHandler<any> = async (_c, next) => await next();

test("upserts an owned subscription, initializes a new cursor, and trims old rows", async () => {
  const findUnique = mock(() => Promise.resolve(null));
  const upsert = mock(() => Promise.resolve(row()));
  const findMany = mock(() => Promise.resolve([{ id: "subscription-id" }]));
  const deleteMany = mock(() => Promise.resolve({ count: 0 }));
  const executeRaw = mock(() => Promise.resolve(0));
  const { createPushApp } = await import("./push");
  const app = createPushApp({
    auth: authMiddleware,
    rateLimit: noRateLimit,
    getVapidConfig: () => ({
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    }),
    getCurrentCourseChangeId: async () => 7n,
    db: {
      pushSubscription: {
        findUnique,
        findFirst: mock(() => Promise.resolve(row())),
        findMany,
        upsert,
        update: mock(() => Promise.resolve(row())),
        deleteMany,
      },
      $executeRaw: executeRaw,
    } as never,
  });
  const response = await app.request("http://test/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: { endpoint, keys: { p256dh, auth } },
      prefs: {
        courseChanges: true,
        announcementSources: ["source-1"],
        language: "zh",
      },
    }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    prefs: {
      courseChanges: true,
      announcementSources: ["source-1"],
      language: "zh",
    },
  });
  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ lastCourseChangeId: 7n }),
    }),
  );
  expect(deleteMany).not.toHaveBeenCalled();
  expect(executeRaw).toHaveBeenCalledTimes(1);
});

test("concurrent subscription upserts converge to ten rows with one delete statement each", async () => {
  const rows: { id: string; userId: string; lastSeenAt: Date }[] = [];
  let timestamp = 0;
  const upsert = mock(async (args: unknown) => {
    const value = args as {
      create: { endpoint: string; userId: string; lastSeenAt: Date };
    };
    await new Promise((resolve) => setTimeout(resolve, 0));
    const stored = {
      id: value.create.endpoint,
      userId: value.create.userId,
      lastSeenAt: value.create.lastSeenAt,
    };
    rows.push(stored);
    return row({
      id: stored.id,
      endpoint: stored.id,
      userId: stored.userId,
      lastSeenAt: stored.lastSeenAt,
    });
  });
  const executeRaw = mock(async (_query: unknown) => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const keep = new Set(
      rows
        .filter((item) => item.userId === "user-1")
        .sort(
          (left, right) =>
            right.lastSeenAt.getTime() - left.lastSeenAt.getTime(),
        )
        .slice(0, 10)
        .map((item) => item.id),
    );
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (!keep.has(rows[index].id)) rows.splice(index, 1);
    }
    return 0;
  });
  const { createPushApp } = await import("./push");
  const app = createPushApp({
    auth: authMiddleware,
    rateLimit: noRateLimit,
    getVapidConfig: () => ({
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    }),
    now: () => ++timestamp,
    getCurrentCourseChangeId: async () => 7n,
    db: {
      pushSubscription: {
        findUnique: mock(() => Promise.resolve(null)),
        findFirst: mock(() => Promise.resolve(row())),
        findMany: mock(async () => rows.map((item) => ({ id: item.id }))),
        upsert,
        update: mock(() => Promise.resolve(row())),
        deleteMany: mock(() => Promise.resolve({ count: 0 })),
      },
      $executeRaw: executeRaw,
    } as never,
  });
  const request = (index: number) =>
    app.request("http://test/subscription", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: `https://fcm.googleapis.com/subscription/${index}`,
          keys: { p256dh, auth },
        },
        prefs: {
          courseChanges: true,
          announcementSources: [],
          language: "zh",
        },
      }),
    });
  await Promise.all(Array.from({ length: 12 }, (_, index) => request(index)));
  expect(executeRaw).toHaveBeenCalledTimes(12);
  expect(rows).toHaveLength(10);
});

test("rejects non-push-service endpoints before upserting", async () => {
  const upsert = mock(() => Promise.resolve(row()));
  const { createPushApp } = await import("./push");
  const app = createPushApp({
    auth: authMiddleware,
    rateLimit: noRateLimit,
    getVapidConfig: () => ({
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    }),
    db: {
      pushSubscription: {
        findUnique: mock(() => Promise.resolve(null)),
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
        upsert,
        update: mock(() => Promise.resolve(row())),
        deleteMany: mock(() => Promise.resolve({ count: 0 })),
      },
    } as never,
  });
  const response = await app.request("http://test/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: {
        endpoint: "https://127.0.0.1/internal",
        keys: { p256dh, auth },
      },
      prefs: { courseChanges: true, announcementSources: [], language: "en" },
    }),
  });
  expect(response.status).toBe(400);
  expect(upsert).not.toHaveBeenCalled();
});

test("rejects a 65-byte value that is not an importable P-256 point", async () => {
  const upsert = mock(() => Promise.resolve(row()));
  const { createPushApp } = await import("./push");
  const app = createPushApp({
    auth: authMiddleware,
    rateLimit: noRateLimit,
    getVapidConfig: () => ({
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    }),
    db: {
      pushSubscription: {
        findUnique: mock(() => Promise.resolve(null)),
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
        upsert,
        update: mock(() => Promise.resolve(row())),
        deleteMany: mock(() => Promise.resolve({ count: 0 })),
      },
    } as never,
  });
  const response = await app.request("http://test/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: {
        endpoint,
        keys: { p256dh: bytesToBase64url(new Uint8Array(65)), auth },
      },
      prefs: { courseChanges: true, announcementSources: [], language: "en" },
    }),
  });
  expect(response.status).toBe(400);
  expect(upsert).not.toHaveBeenCalled();
});

test("resets delivery state when an endpoint is reassigned", async () => {
  const upsert = mock(() => Promise.resolve(row()));
  const { createPushApp } = await import("./push");
  const app = createPushApp({
    auth: authMiddleware,
    rateLimit: noRateLimit,
    getVapidConfig: () => ({
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    }),
    getCurrentCourseChangeId: async () => 42n,
    db: {
      pushSubscription: {
        findUnique: mock(() =>
          Promise.resolve(
            row({
              userId: "user-2",
              lastCourseChangeId: 9n,
              lastDigestDate: "2026-10-26",
              failureCount: 4,
              testWindowStartedAt: new Date(0),
              testCount: 3,
            }),
          ),
        ),
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
        upsert,
        update: mock(() => Promise.resolve(row())),
        deleteMany: mock(() => Promise.resolve({ count: 0 })),
      },
      $executeRaw: mock(() => Promise.resolve(0)),
    } as never,
  });
  const response = await app.request("http://test/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: { endpoint, keys: { p256dh, auth } },
      prefs: { courseChanges: true, announcementSources: [], language: "en" },
    }),
  });
  expect(response.status).toBe(200);
  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({
        lastCourseChangeId: 42n,
        lastDigestDate: null,
        failureCount: 0,
        testWindowStartedAt: null,
        testCount: 0,
      }),
    }),
  );
});

test("only exposes and tests an endpoint owned by the authenticated user", async () => {
  const findFirst = mock(() => Promise.resolve(null));
  const sendPush = mock(() => Promise.resolve({ status: 201, ok: true }));
  const { createPushApp } = await import("./push");
  const app = createPushApp({
    auth: authMiddleware,
    rateLimit: noRateLimit,
    getVapidConfig: () => ({
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    }),
    sendPush,
    db: {
      pushSubscription: {
        findUnique: mock(() => Promise.resolve(null)),
        findFirst,
        findMany: mock(() => Promise.resolve([])),
        upsert: mock(() => Promise.resolve(row())),
        update: mock(() => Promise.resolve(row())),
        deleteMany: mock(() => Promise.resolve({ count: 0 })),
      },
    } as never,
  });
  const response = await app.request(
    `/subscription?endpoint=${encodeURIComponent(endpoint)}`,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ subscribed: false });
  const testResponse = await app.request("http://test/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  expect(testResponse.status).toBe(404);
  expect(sendPush).not.toHaveBeenCalled();
});

describe("push test rate limit", () => {
  test("allows three tests across app instances and blocks the fourth", async () => {
    let claims = 0;
    const queryRaw = mock(() => {
      claims += 1;
      return Promise.resolve(claims <= 3 ? [{ id: "subscription-id" }] : []);
    });
    const { createPushApp } = await import("./push");
    const dependencies = {
      auth: authMiddleware,
      rateLimit: noRateLimit,
      getVapidConfig: () => ({
        publicKey: "public",
        privateKey: "private",
        subject: "mailto:test@nthumods.com",
      }),
      sendPush: async () => ({ status: 201, ok: true }),
      db: {
        pushSubscription: {
          findUnique: mock(() => Promise.resolve(null)),
          findFirst: mock(() => Promise.resolve(row())),
          findMany: mock(() => Promise.resolve([])),
          upsert: mock(() => Promise.resolve(row())),
          update: mock(() => Promise.resolve(row())),
          deleteMany: mock(() => Promise.resolve({ count: 0 })),
        },
        $queryRaw: queryRaw,
      },
    } as never;
    const app = createPushApp(dependencies);
    const secondApp = createPushApp(dependencies);
    const request = () =>
      app.request("http://test/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    const fourth = await secondApp.request("http://test/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    expect(fourth.status).toBe(429);
    expect(queryRaw).toHaveBeenCalledTimes(4);
  });
});
