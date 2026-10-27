import prisma from "../client";
import { getVapidConfig, type VapidConfig } from "../config/push";
import { base64urlToBytes, bytesToBase64url } from "./base64url";
import { isAllowedPushEndpoint } from "./endpoint";
import { encryptWebPushPayload } from "./encryption";
import { createVapidJwt } from "./vapid";

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failureCount: number;
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type PushSendOptions = {
  ttl: number;
  topic?: string;
  now?: number;
};

export type PushSendResult = {
  status: number;
  ok: boolean;
};

export type PushDatabase = {
  pushSubscription: {
    update(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
};

export type PushSenderDependencies = {
  db?: PushDatabase;
  vapid?: VapidConfig;
  fetcher?: typeof fetch;
};

const defaultDatabase = prisma as unknown as PushDatabase;

const recordFailure = async (
  subscription: PushSubscriptionRecord,
  db: PushDatabase,
) => {
  try {
    const result = (await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { failureCount: { increment: 1 } },
      select: { failureCount: true },
    })) as { failureCount?: unknown };
    if (
      typeof result.failureCount === "number" &&
      result.failureCount >= 5
    ) {
      await db.pushSubscription.deleteMany({
        where: { id: subscription.id },
      });
    }
  } catch (error) {
    console.error("Failed to record push delivery failure", error);
  }
};

export const isRetriablePushResult = (result: PushSendResult) =>
  result.status === 0 ||
  result.status === 429 ||
  (result.status >= 500 && result.status <= 599);

const recordSuccess = async (
  subscription: PushSubscriptionRecord,
  db: PushDatabase,
) => {
  try {
    await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { failureCount: 0 },
    });
  } catch (error) {
    console.error("Failed to reset push delivery failure count", error);
  }
};

export const sendPush = async (
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
  options: PushSendOptions,
  dependencies: PushSenderDependencies = {},
): Promise<PushSendResult> => {
  const db = dependencies.db ?? defaultDatabase;
  const vapid = dependencies.vapid ?? getVapidConfig();
  if (!vapid) return { status: 503, ok: false };

  let endpoint: URL;
  try {
    endpoint = new URL(subscription.endpoint);
    if (!isAllowedPushEndpoint(subscription.endpoint))
      throw new Error("Endpoint is not an allowed push service");
  } catch {
    return { status: 400, ok: false };
  }

  try {
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const body = await encryptWebPushPayload(subscription, plaintext);
    const vapidJwt = await createVapidJwt(vapid, endpoint.origin, options.now);
    const headers = new Headers({
      Authorization: `vapid t=${vapidJwt.token}, k=${bytesToBase64url(
        base64urlToBytes(vapid.publicKey),
      )}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(options.ttl),
      Urgency: "normal",
    });
    if (options.topic && /^[A-Za-z0-9_-]{1,32}$/.test(options.topic)) {
      headers.set("Topic", options.topic);
    }

    const response = await (dependencies.fetcher ?? fetch)(endpoint, {
      method: "POST",
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const result = { status: response.status, ok: response.ok };
    if (response.status === 404 || response.status === 410) {
      try {
        await db.pushSubscription.deleteMany({
          where: { id: subscription.id },
        });
      } catch (error) {
        console.error(
          "Failed to remove gone push subscription",
          error instanceof Error ? error.message : error,
        );
      }
    } else if (response.ok) {
      await recordSuccess(subscription, db);
    } else {
      await recordFailure(subscription, db);
    }
    return result;
  } catch (error) {
    console.error(
      "Push delivery failed",
      error instanceof Error ? error.message : error,
    );
    await recordFailure(subscription, db);
    return { status: 0, ok: false };
  }
};
