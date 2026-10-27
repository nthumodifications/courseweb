import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import prisma from "../client";
import { getVapidConfig, type VapidConfig } from "../config/push";
import { getCurrentCourseChangeId } from "../push/courseChanges";
import {
  sendPush as defaultSendPush,
  type PushDatabase,
  type PushPayload,
  type PushSendOptions,
  type PushSubscriptionRecord,
} from "../push/sender";
import { buildTestNotification } from "../push/text";
import {
  MAX_REQUEST_BODY_BYTES,
  payloadTooLarge,
  zodValidationError,
} from "../utils/payload_limits";

type PushEnv = {
  Variables: {
    user: {
      userId: string;
    };
  };
};

type PushSubscriptionRow = PushSubscriptionRecord & {
  userId: string;
  language: PushLanguage;
  courseChanges: boolean;
  announcementSources: string[];
  lastCourseChangeId: bigint;
  lastDigestDate: string | null;
  createdAt: Date;
  lastSeenAt: Date;
};

export type PushLanguage = "zh" | "en" | "zh-cn";

type PushRouteDatabase = PushDatabase & {
  pushSubscription: PushDatabase["pushSubscription"] & {
    findUnique(args: unknown): Promise<PushSubscriptionRow | null>;
    findFirst(args: unknown): Promise<PushSubscriptionRow | null>;
    findMany(args: unknown): Promise<PushSubscriptionRow[]>;
    upsert(args: unknown): Promise<PushSubscriptionRow>;
  };
};

type PushDependencies = {
  auth?: MiddlewareHandler<PushEnv>;
  rateLimit?: MiddlewareHandler<PushEnv>;
  db?: PushRouteDatabase;
  getVapidConfig?: () => VapidConfig | undefined;
  getCurrentCourseChangeId?: () => Promise<bigint>;
  sendPush?: (
    subscription: PushSubscriptionRecord,
    payload: PushPayload,
    options: PushSendOptions,
    dependencies?: { db?: PushDatabase; vapid?: VapidConfig },
  ) => Promise<{ status: number; ok: boolean }>;
  now?: () => number;
  testRateLimit?: MiddlewareHandler<PushEnv>;
};

const lazyRequireAuth = (scopes: string[]) =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return (requireAuth(scopes) as unknown as MiddlewareHandler<PushEnv>)(
      c,
      next,
    );
  }) as MiddlewareHandler<PushEnv>;

const httpsEndpoint = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "endpoint must use https");

const base64url = (length: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine((value) => {
      try {
        return Buffer.from(value, "base64url").byteLength === length;
      } catch {
        return false;
      }
    }, `must decode to ${length} bytes`);

const language = z.enum(["zh", "en", "zh-cn"]);
const subscriptionSchema = z
  .object({
    endpoint: httpsEndpoint,
    keys: z
      .object({
        p256dh: base64url(65),
        auth: base64url(16),
      })
      .strict(),
  })
  .strict();
const prefsSchema = z
  .object({
    courseChanges: z.boolean(),
    announcementSources: z.array(z.string().trim().min(1).max(200)).max(200),
    language,
  })
  .strict();
const putSchema = z
  .object({ subscription: subscriptionSchema, prefs: prefsSchema })
  .strict();
const endpointBodySchema = z.object({ endpoint: httpsEndpoint }).strict();
const endpointQuerySchema = z.object({ endpoint: httpsEndpoint }).strict();

const defaultDatabase = prisma as unknown as PushRouteDatabase;

const preferences = (
  row: Pick<
    PushSubscriptionRow,
    "courseChanges" | "announcementSources" | "language"
  >,
) => ({
  courseChanges: row.courseChanges,
  announcementSources: row.announcementSources,
  language: row.language,
});

const pushTestRateLimiter = (now: () => number): MiddlewareHandler<PushEnv> => {
  const requests = new Map<string, number[]>();
  return async (c, next) => {
    const userId = c.var.user.userId;
    const cutoff = now() - 10 * 60 * 1000;
    const recent = (requests.get(userId) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    if (recent.length >= 3) return c.json({ error: "rate_limited" }, 429);
    recent.push(now());
    requests.set(userId, recent);
    await next();
  };
};

export const createPushApp = (dependencies: PushDependencies = {}) => {
  const auth = dependencies.auth ?? lazyRequireAuth(["kv"]);
  const rateLimit = dependencies.rateLimit;
  const db = dependencies.db ?? defaultDatabase;
  const readVapid = dependencies.getVapidConfig ?? getVapidConfig;
  const getCursor =
    dependencies.getCurrentCourseChangeId ?? getCurrentCourseChangeId;
  const sendPush = dependencies.sendPush ?? defaultSendPush;
  const now = dependencies.now ?? Date.now;
  const testRateLimit = dependencies.testRateLimit ?? pushTestRateLimiter(now);

  const app = new Hono<PushEnv>()
    .get("/config", (c) => {
      const vapid = readVapid();
      return vapid
        ? c.json({ enabled: true, publicKey: vapid.publicKey })
        : c.json({ enabled: false });
    })
    .use(
      "*",
      bodyLimit({
        maxSize: MAX_REQUEST_BODY_BYTES,
        onError: payloadTooLarge,
      }),
    )
    .put(
      "/subscription",
      zValidator("json", putSchema, zodValidationError),
      auth,
      rateLimit ?? (async (_c, next) => await next()),
      async (c) => {
        const vapid = readVapid();
        if (!vapid) return c.json({ error: "push_not_configured" }, 503);
        const body = c.req.valid("json");
        const existing = await db.pushSubscription.findUnique({
          where: { endpoint: body.subscription.endpoint },
          select: { userId: true, lastCourseChangeId: true },
        });
        const sameOwner = existing?.userId === c.var.user.userId;
        const cursor =
          sameOwner && existing
            ? existing.lastCourseChangeId
            : await getCursor();
        const row = await db.pushSubscription.upsert({
          where: { endpoint: body.subscription.endpoint },
          create: {
            userId: c.var.user.userId,
            endpoint: body.subscription.endpoint,
            p256dh: body.subscription.keys.p256dh,
            auth: body.subscription.keys.auth,
            language: body.prefs.language,
            courseChanges: body.prefs.courseChanges,
            announcementSources: body.prefs.announcementSources,
            lastCourseChangeId: cursor,
            lastSeenAt: new Date(now()),
          },
          update: {
            userId: c.var.user.userId,
            p256dh: body.subscription.keys.p256dh,
            auth: body.subscription.keys.auth,
            language: body.prefs.language,
            courseChanges: body.prefs.courseChanges,
            announcementSources: body.prefs.announcementSources,
            ...(sameOwner ? {} : { lastCourseChangeId: cursor }),
            lastSeenAt: new Date(now()),
          },
        });
        const userRows = await db.pushSubscription.findMany({
          where: { userId: c.var.user.userId },
          orderBy: { lastSeenAt: "asc" },
          select: { id: true },
        });
        if (userRows.length > 10) {
          await db.pushSubscription.deleteMany({
            where: {
              id: {
                in: userRows
                  .slice(0, userRows.length - 10)
                  .map((item) => item.id),
              },
            },
          });
        }
        return c.json({ ok: true, prefs: preferences(row) });
      },
    )
    .get(
      "/subscription",
      zValidator("query", endpointQuerySchema, zodValidationError),
      auth,
      rateLimit ?? (async (_c, next) => await next()),
      async (c) => {
        const { endpoint } = c.req.valid("query");
        const row = await db.pushSubscription.findFirst({
          where: { endpoint, userId: c.var.user.userId },
        });
        return row
          ? c.json({ subscribed: true, prefs: preferences(row) })
          : c.json({ subscribed: false });
      },
    )
    .delete(
      "/subscription",
      zValidator("json", endpointBodySchema, zodValidationError),
      auth,
      rateLimit ?? (async (_c, next) => await next()),
      async (c) => {
        const { endpoint } = c.req.valid("json");
        await db.pushSubscription.deleteMany({
          where: { endpoint, userId: c.var.user.userId },
        });
        return c.json({ ok: true });
      },
    )
    .post(
      "/test",
      zValidator("json", endpointBodySchema, zodValidationError),
      auth,
      rateLimit ?? (async (_c, next) => await next()),
      testRateLimit,
      async (c) => {
        const vapid = readVapid();
        if (!vapid) return c.json({ error: "push_not_configured" }, 503);
        const { endpoint } = c.req.valid("json");
        const row = await db.pushSubscription.findFirst({
          where: { endpoint, userId: c.var.user.userId },
        });
        if (!row) return c.json({ error: "not_found" }, 404);
        const payload: PushPayload = buildTestNotification(row.language);
        const result = await sendPush(
          row,
          payload,
          { ttl: 60, now: now() },
          { db, vapid },
        );
        if (!result.ok) {
          return c.json({ error: "push_failed", status: result.status }, 502);
        }
        return c.json({ ok: true });
      },
    );

  return app;
};

export default createPushApp();
