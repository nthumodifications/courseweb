import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { userRateLimit } from "../middleware/userRateLimit";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { mergeSyncedValue, validKeys } from "./kv_storage_contract";
import {
  jsonValueSchema,
  kvKeyParamSchema,
  MAX_REQUEST_BODY_BYTES,
  payloadTooLarge,
  zodValidationError,
} from "../utils/payload_limits";

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
}: KvStorageDependencies = {}) =>
  new Hono<SecureApiEnv>()
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
        const { adminFirestore } = getAdmin(c);
        // Fetch data from Firestore
        const data = await adminFirestore
          .collection("users")
          .doc(c.var.user.userId)
          .collection("storage")
          .doc(key)
          .get();
        if (!data.exists) {
          return c.json({ error: "Not found" }, 404);
        }
        return c.json(data.data());
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
        const { adminFirestore } = getAdmin(c);
        const storageRef = adminFirestore
          .collection("users")
          .doc(c.var.user.userId)
          .collection("storage")
          .doc(key);
        const incomingUpdatedAt = updatedAt ?? lastModified;

        // The transaction makes initial course/favourite reconciliation safe when two
        // devices sign in at the same time. Normal writes remain last-write-wins so
        // an intentional local deletion is not immediately undone by a union.
        await adminFirestore.runTransaction(async (transaction) => {
          const existing = await transaction.get(storageRef);
          const existingData = existing.exists ? existing.data() : undefined;
          const existingUpdatedAt = asNumber(
            existingData?.["updatedAt"],
            asNumber(existingData?.["lastModified"], -1),
          );
          const existingDeviceId =
            typeof existingData?.["deviceId"] === "string"
              ? existingData["deviceId"]
              : "";
          const incomingIsNewer =
            incomingUpdatedAt > existingUpdatedAt ||
            (incomingUpdatedAt === existingUpdatedAt &&
              (deviceId ?? "") >= existingDeviceId);

          if (!merge && existing.exists && !incomingIsNewer) return;

          const nextValue = merge
            ? mergeSyncedValue(key, existingData?.["value"], value)
            : value;
          const nextUpdatedAt = Math.max(existingUpdatedAt, incomingUpdatedAt);
          const nextLastModified = Math.max(
            asNumber(existingData?.["lastModified"], -1),
            lastModified,
            nextUpdatedAt,
          );
          const nextDeviceId = incomingIsNewer
            ? deviceId
            : existingDeviceId || undefined;

          transaction.set(storageRef, {
            value: nextValue,
            lastModified: nextLastModified,
            updatedAt: nextUpdatedAt,
            ...(nextDeviceId ? { deviceId: nextDeviceId } : {}),
          });
        });
        return c.json({ success: true });
      },
    );

export const app = createKvStorageApp();

export default app;
