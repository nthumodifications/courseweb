import { afterEach, describe, expect, mock, test } from "bun:test";

process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

import {
  detectPushSupport,
  getPushConfig,
  getThisDeviceStatus,
  sendTest,
  subscribeThisDevice,
  unsubscribeThisDevice,
  updatePrefs,
  type PushPreferences,
} from "./push";

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;
const originalNotification = globalThis.Notification;
const originalPushManager = (globalThis as { PushManager?: unknown })
  .PushManager;

const prefs: PushPreferences = {
  courseChanges: true,
  announcementSources: ["academic"],
  language: "en",
};

const publicKey = Buffer.from(new Uint8Array(65).fill(7)).toString("base64url");
const endpoint = "https://push.example.test/subscription";

const makeSubscription = (applicationServerKey: Uint8Array | null = null) => {
  const events: string[] = [];
  const subscription = {
    endpoint,
    options: { applicationServerKey },
    toJSON: () => ({
      endpoint,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    }),
    unsubscribe: mock(async () => {
      events.push("unsubscribe");
      return true;
    }),
  } as unknown as PushSubscription;
  return { subscription, events };
};

const installBrowser = (
  subscription: PushSubscription | null,
  subscribe = subscription,
) => {
  const pushManager = {
    getSubscription: mock(async () => subscription),
    subscribe: mock(async () => subscribe),
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serviceWorker: { ready: Promise.resolve({ pushManager }) },
      userAgent: "Mozilla/5.0",
      platform: "Win32",
      maxTouchPoints: 0,
    },
  });
  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      permission: "granted",
      requestPermission: mock(async () => "granted"),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      matchMedia: () => ({ matches: false }),
    },
  });
  return pushManager;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: originalNotification,
  });
  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    value: originalPushManager,
  });
});

describe("push API client", () => {
  test("recognizes iOS Safari outside an installed PWA", () => {
    installBrowser(null);
    Object.defineProperty(globalThis.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    expect(detectPushSupport()).toEqual({
      supported: false,
      reason: "ios-not-installed",
    });
  });

  test("reports a browser permission denial", () => {
    installBrowser(null);
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "denied" },
    });

    expect(detectPushSupport()).toEqual({
      supported: false,
      reason: "permission-denied",
    });
  });

  test("loads public configuration without an authorization header", async () => {
    let request: Request | undefined;
    globalThis.fetch = mock(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ enabled: false });
    });

    await expect(getPushConfig()).resolves.toEqual({ enabled: false });
    expect(request?.url).toBe("https://auth.example.test/api/push/config");
    expect(request?.headers.has("Authorization")).toBe(false);
  });

  test("requests permission from subscribe and sends the contract payload", async () => {
    const { subscription } = makeSubscription();
    const pushManager = installBrowser(null, subscription);
    const order: string[] = [];
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: mock(async () => {
          order.push("permission");
          return "granted";
        }),
      },
    });
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      const request = new Request(input, init);
      order.push("fetch");
      requests.push(request);
      return request.url.endsWith("/config")
        ? jsonResponse({ enabled: true, publicKey })
        : jsonResponse({ ok: true, prefs });
    });

    await subscribeThisDevice(prefs, "access-token");

    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(order[0]).toBe("permission");
    expect(requests.map((request) => request.url)).toEqual([
      "https://auth.example.test/api/push/config",
      "https://auth.example.test/api/push/subscription",
    ]);
    expect(requests[1]?.headers.get("Authorization")).toBe(
      "Bearer access-token",
    );
    expect(await requests[1]?.json()).toEqual({
      subscription: {
        endpoint,
        keys: { p256dh: "p256dh-value", auth: "auth-value" },
      },
      prefs,
    });
  });

  test("replaces a browser subscription created with a different VAPID key", async () => {
    const old = makeSubscription(new Uint8Array(65).fill(1));
    const replacement = makeSubscription(new Uint8Array(65).fill(7));
    const pushManager = installBrowser(
      old.subscription,
      replacement.subscription,
    );
    globalThis.fetch = mock(async (input, init) => {
      const request = new Request(input, init);
      return request.url.endsWith("/config")
        ? jsonResponse({ enabled: true, publicKey })
        : jsonResponse({ ok: true, prefs });
    });

    await subscribeThisDevice(prefs, "access-token");

    expect(old.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
  });

  test("deletes the server record before unsubscribing the browser", async () => {
    const { subscription, events } = makeSubscription();
    installBrowser(subscription);
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push(new Request(input, init));
      return jsonResponse({ ok: true });
    });

    await unsubscribeThisDevice("access-token");

    expect(requests[0]?.method).toBe("DELETE");
    expect(events).toEqual(["unsubscribe"]);
  });

  test("gets this device status with the encoded endpoint", async () => {
    const { subscription } = makeSubscription();
    installBrowser(subscription);
    let request: Request | undefined;
    globalThis.fetch = mock(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ subscribed: true, prefs });
    });

    await expect(getThisDeviceStatus("access-token")).resolves.toEqual({
      subscription,
      subscribed: true,
      prefs,
    });
    expect(request?.url).toBe(
      `https://auth.example.test/api/push/subscription?endpoint=${encodeURIComponent(endpoint)}`,
    );
    expect(request?.headers.get("Authorization")).toBe("Bearer access-token");
  });

  test("updates preferences and sends a test to the current endpoint", async () => {
    const { subscription } = makeSubscription();
    installBrowser(subscription);
    const requests: Request[] = [];
    globalThis.fetch = mock(async (input, init) => {
      requests.push(new Request(input, init));
      return jsonResponse({ ok: true, prefs });
    });

    await updatePrefs(prefs, "access-token");
    await sendTest("access-token");

    expect(requests.map((request) => request.method)).toEqual(["PUT", "POST"]);
    expect(requests[0]?.url).toEndWith("/subscription");
    expect(requests[1]?.url).toEndWith("/test");
  });
});
