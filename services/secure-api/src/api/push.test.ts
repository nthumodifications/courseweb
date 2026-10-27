import { describe, expect, mock, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import { bytesToBase64url } from "../push/base64url";

const endpoint = "https://push.example.test/subscription/abc";
const p256dh = bytesToBase64url(
  new Uint8Array([4, ...new Uint8Array(64).fill(1)]),
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
  test("allows three tests and blocks the fourth in ten minutes", async () => {
    const { createPushApp } = await import("./push");
    const app = createPushApp({
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
      } as never,
    });
    const request = () =>
      app.request("http://test/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429);
  });
});
