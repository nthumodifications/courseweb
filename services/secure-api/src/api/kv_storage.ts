import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { userRateLimit } from "../middleware/userRateLimit";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { validKeys } from "./kv_storage_contract";
import {
  createUserStorageStore,
  resolveUserStorageMode,
  type UserStorageMode,
} from "../storage/userStore";
import type { Prisma } from "@prisma/client";
import {
  jsonValueSchema,
  kvKeyParamSchema,
  MAX_REQUEST_BODY_BYTES,
  payloadTooLarge,
  zodValidationError,
} from "../utils/payload_limits";

type SecureApiEnv = {
  Variables: {
    user: {
      userId: string;
    };
  };
};

type KvStorageDependencies = {
  auth?: MiddlewareHandler<SecureApiEnv>;
  rateLimit?: MiddlewareHandler<SecureApiEnv>;
  getFirebaseAdmin?: typeof getFirebaseAdmin;
  mode?: UserStorageMode;
};

const lazyRequireAuth = (scopes: string[]) =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return (requireAuth(scopes) as unknown as MiddlewareHandler<SecureApiEnv>)(
      c,
      next,
    );
  }) as MiddlewareHandler<SecureApiEnv>;

export const createKvStorageApp = ({
  auth = lazyRequireAuth(["kv"]),
  rateLimit = userRateLimit as MiddlewareHandler<SecureApiEnv>,
  getFirebaseAdmin: getAdmin = getFirebaseAdmin,
  mode: configuredMode,
}: KvStorageDependencies = {}) =>
  {
    const mode = resolveUserStorageMode(configuredMode);
    return new Hono<SecureApiEnv>()
    .use(
      "*",
      bodyLimit({
        maxSize: MAX_REQUEST_BODY_BYTES,
        onError: payloadTooLarge,
      }),
    )
    .get(
      "/:key",
      zValidator("param", kvKeyParamSchema, zodValidationError),
      auth,
      rateLimit,
      async (c) => {
        const { key } = c.req.valid("param");
        if (!validKeys.includes(key)) {
          return c.json({ error: "invalid_key" }, 400);
        }
        const store = createUserStorageStore({
          mode,
          getFirestore: () => getAdmin(c).adminFirestore,
        });
        const data = await store.get(c.var.user.userId, key);
        if (!data) {
          return c.json({ error: "Not found" }, 404);
        }
        return c.json(data);
      },
    )
    .post(
      "/:key",
      zValidator("param", kvKeyParamSchema, zodValidationError),
      zValidator(
        "json",
        z
          .object({
            value: jsonValueSchema,
            lastModified: z.number().finite(),
            updatedAt: z.number().finite().optional(),
            deviceId: z.string().optional(),
            merge: z.boolean().optional(),
          })
          .passthrough(),
        zodValidationError,
      ),
      auth,
      rateLimit,
      async (c) => {
        const { key } = c.req.valid("param");
        const {
          value,
          lastModified,
          updatedAt,
          deviceId,
          merge = false,
        } = c.req.valid("json");
        if (!validKeys.includes(key)) {
          return c.json({ error: "invalid_key" }, 400);
        }
        const store = createUserStorageStore({
          mode,
          getFirestore: () => getAdmin(c).adminFirestore,
        });
        await store.put(
          c.var.user.userId,
          key,
          {
            value: value as Prisma.JsonValue,
            lastModified,
            updatedAt,
            deviceId,
          },
          { merge },
        );
        return c.json({ success: true });
      },
    );
  };
