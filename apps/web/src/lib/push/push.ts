import type { Language } from "@/types/settings";

export type PushLanguage = Language;

export interface PushPreferences {
  courseChanges: boolean;
  announcementSources: string[];
  language: PushLanguage;
}

export interface PushConfig {
  enabled: boolean;
  publicKey?: string;
}

export interface SerializedPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ThisDeviceStatus {
  subscription: PushSubscription | null;
  subscribed: boolean;
  prefs?: PushPreferences;
}

export type PushSupportReason =
  | "supported"
  | "unsupported"
  | "ios-not-installed"
  | "permission-denied";

export interface PushSupport {
  supported: boolean;
  reason: PushSupportReason;
}

export class PushClientError extends Error {
  readonly status: number | undefined;
  readonly code: string;

  constructor(code: string, status?: number) {
    super(code);
    this.name = "PushClientError";
    this.code = code;
    this.status = status;
  }
}

const pushBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_NTHUMODS_AUTH_URL;
  if (!baseUrl) throw new Error("VITE_NTHUMODS_AUTH_URL is not defined");
  return `${baseUrl.replace(/\/$/, "")}/api/push`;
};

const request = async <T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${pushBaseUrl()}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new PushClientError("request_failed");
  }

  let payload: unknown = undefined;
  try {
    payload = await response.json();
  } catch {
    // Keep the HTTP status when the server returns no JSON body.
  }

  if (!response.ok) {
    const errorCode =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : "request_failed";
    throw new PushClientError(errorCode, response.status);
  }

  return payload as T;
};

const isIos = () => {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const isStandalone = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const iosStandalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return (
    iosStandalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
};

export const detectPushSupport = (): PushSupport => {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof PushManager === "undefined" ||
    typeof Notification === "undefined"
  ) {
    return { supported: false, reason: "unsupported" };
  }
  if (isIos() && !isStandalone()) {
    return { supported: false, reason: "ios-not-installed" };
  }
  if (Notification.permission === "denied") {
    return { supported: false, reason: "permission-denied" };
  }
  return { supported: true, reason: "supported" };
};

export const getPushConfig = () => request<PushConfig>("/config");

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const applicationServerKeyFromConfig = (publicKey: string) =>
  decodeBase64Url(publicKey);

const asBytes = (value: unknown): Uint8Array | null => {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
};

const hasSameApplicationServerKey = (
  subscription: PushSubscription,
  expected: Uint8Array,
) => {
  const actual = asBytes(
    (
      subscription.options as PushSubscriptionOptions & {
        applicationServerKey?: unknown;
      }
    )?.applicationServerKey,
  );
  if (!actual) return true;
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
};

const getRegistration = async () => {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) {
    throw new PushClientError("unsupported");
  }
  return navigator.serviceWorker.ready;
};

const getCurrentSubscription = async () => {
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
};

const serializeSubscription = (
  subscription: PushSubscription,
): SerializedPushSubscription => {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new PushClientError("invalid_subscription");
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
};

const requireToken = (token?: string): string => {
  if (!token) throw new PushClientError("unauthorized", 401);
  return token;
};

const ensurePermission = async () => {
  if (Notification.permission === "denied") {
    throw new PushClientError("permission_denied");
  }
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new PushClientError(
        permission === "denied" ? "permission_denied" : "permission_required",
      );
    }
  }
};

const putSubscription = async (
  subscription: PushSubscription,
  prefs: PushPreferences,
  token: string,
) =>
  request<{ ok: true; prefs: PushPreferences }>(
    "/subscription",
    {
      method: "PUT",
      body: JSON.stringify({
        subscription: serializeSubscription(subscription),
        prefs,
      }),
    },
    token,
  );

export const subscribeThisDevice = async (
  prefs: PushPreferences,
  token?: string,
) => {
  const accessToken = requireToken(token);
  const support = detectPushSupport();
  if (!support.supported) throw new PushClientError(support.reason);

  // Keep this call in the synchronous portion of the user's toggle handler.
  // Waiting for config first would lose the browser's transient activation.
  await ensurePermission();
  const config = await getPushConfig();
  if (!config.enabled || !config.publicKey) {
    throw new PushClientError("push_not_configured", 503);
  }

  const registration = await getRegistration();
  const applicationServerKey = applicationServerKeyFromConfig(config.publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (
    subscription &&
    !hasSameApplicationServerKey(subscription, applicationServerKey)
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  return putSubscription(subscription, prefs, accessToken);
};

export const unsubscribeThisDevice = async (token?: string) => {
  const accessToken = requireToken(token);
  const subscription = await getCurrentSubscription();
  if (!subscription) return { ok: true as const };

  await request<{ ok: true }>(
    "/subscription",
    {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    },
    accessToken,
  );
  await subscription.unsubscribe();
  return { ok: true as const };
};

export const updatePrefs = async (prefs: PushPreferences, token?: string) => {
  const accessToken = requireToken(token);
  const subscription = await getCurrentSubscription();
  if (!subscription) throw new PushClientError("not_subscribed");
  return putSubscription(subscription, prefs, accessToken);
};

export const sendTest = async (token?: string) => {
  const accessToken = requireToken(token);
  const subscription = await getCurrentSubscription();
  if (!subscription) throw new PushClientError("not_subscribed");
  return request<{ ok: true }>(
    "/test",
    {
      method: "POST",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    },
    accessToken,
  );
};

export const getThisDeviceStatus = async (token?: string) => {
  const accessToken = requireToken(token);
  const subscription = await getCurrentSubscription();
  if (!subscription) {
    return {
      subscription: null,
      subscribed: false,
      prefs: undefined,
    } satisfies ThisDeviceStatus;
  }
  const query = new URLSearchParams({ endpoint: subscription.endpoint });
  const status = await request<{
    subscribed: boolean;
    prefs?: PushPreferences;
  }>(`/subscription?${query.toString()}`, {}, accessToken);
  return { subscription, ...status } satisfies ThisDeviceStatus;
};
