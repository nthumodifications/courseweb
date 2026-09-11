import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { mergeSyncedValue, validKeys } from "./kv_storage_contract";

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const app = new Hono()
  .get(
    "/:key",
    zValidator(
      "param",
      z.object({
        key: z.string(),
      }),
    ),
    requireAuth(["kv"]),
    async (c) => {
      const { key } = c.req.valid("param");
      if (!validKeys.includes(key)) {
        return c.json({ error: "Invalid key" }, 400);
      }
      const { adminFirestore } = getFirebaseAdmin(c);
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
    zValidator(
      "param",
      z.object({
        key: z.string(),
      }),
    ),
    zValidator(
      "json",
      z.object({
        value: z.any(),
        lastModified: z.number(),
        updatedAt: z.number().optional(),
        deviceId: z.string().optional(),
        merge: z.boolean().optional(),
      }),
    ),
    requireAuth(["kv"]),
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
        return c.json({ error: "Invalid key" }, 400);
      }
      const { adminFirestore } = getFirebaseAdmin(c);
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

export default app;
