import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";
import { afterEach, describe, expect, mock, test } from "bun:test";

process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";
process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";

const authState = {
  isAuthenticated: true,
  user: { access_token: "access-token", expired: false },
};
const settingsState = { language: "zh" as const };
const publicKey = Buffer.from(new Uint8Array(65).fill(7)).toString("base64url");
const announcementsState: {
  data: { sources: { id: string }[]; articles: unknown[] } | undefined;
  error: Error | undefined;
} = { data: undefined, error: undefined };

const actualOidcContext = await import("react-oidc-context");
const actualSettings = await import("@/hooks/contexts/settings");
const actualAnnouncements = await import("@/lib/announcements");

mock.module("react-oidc-context", () => ({
  useAuth: () => authState,
}));
mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => settingsState,
}));
mock.module("@/lib/announcements", () => ({
  ...actualAnnouncements,
  useAnnouncements: () => announcementsState,
  getEffectiveFollowIds: (_storedIds: unknown, sources: { id: string }[]) =>
    sources.map((source) => source.id),
}));

const { usePushAnnouncementPreferences, usePushNotifications } =
  await import("./usePushNotifications");

mock.module("react-oidc-context", () => actualOidcContext);
mock.module("@/hooks/contexts/settings", () => actualSettings);
mock.module("@/lib/announcements", () => actualAnnouncements);

type HookResult = ReturnType<typeof usePushNotifications>;
type SourceState = { sources: string[]; loaded: boolean };

const globalKeys = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "PushManager",
  "Notification",
  "IS_REACT_ACT_ENVIRONMENT",
] as const;
const originalGlobals = new Map(
  globalKeys.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);
const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const restoreGlobals = () => {
  for (const key of globalKeys) {
    const descriptor = originalGlobals.get(key);
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
};

const waitFor = async (predicate: () => boolean, attempts = 40) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  }
  expect(predicate()).toBe(true);
};

const setup = () => {
  const browserWindow = parseHTML(
    "<!doctype html><html><body></body></html>",
  ).window;
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size;
    },
  };
  let subscription: PushSubscription | null = null;
  const endpoint = "https://push.example.test/subscription";
  const pushSubscription = {
    endpoint,
    options: { applicationServerKey: null },
    toJSON: () => ({
      endpoint,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    }),
    unsubscribe: mock(async () => {
      subscription = null;
      return true;
    }),
  } as unknown as PushSubscription;
  const pushManager = {
    getSubscription: mock(async () => subscription),
    subscribe: mock(async () => {
      subscription = pushSubscription;
      return pushSubscription;
    }),
  };
  const registration = {
    pushManager,
    update: mock(async () => undefined),
  };
  const browserNavigator = {
    serviceWorker: { ready: Promise.resolve(registration) },
    userAgent: "Mozilla/5.0",
    platform: "Win32",
    maxTouchPoints: 0,
  };
  Object.defineProperty(browserWindow, "navigator", {
    configurable: true,
    value: browserNavigator,
  });
  Object.defineProperties(globalThis, {
    window: { configurable: true, writable: true, value: browserWindow },
    document: {
      configurable: true,
      writable: true,
      value: browserWindow.document,
    },
    localStorage: { configurable: true, writable: true, value: localStorage },
    IS_REACT_ACT_ENVIRONMENT: {
      configurable: true,
      writable: true,
      value: true,
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: browserNavigator,
  });
  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: { permission: "granted" },
  });

  const requests: Request[] = [];
  let storedPrefs = {
    courseChanges: true,
    announcementSources: [],
    language: "zh" as const,
  };
  globalThis.fetch = mock(async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    if (request.url.endsWith("/config")) {
      return jsonResponse({ enabled: true, publicKey });
    }
    if (request.method === "GET") {
      return jsonResponse({
        subscribed: subscription !== null,
        prefs: storedPrefs,
      });
    }
    if (request.method === "PUT") {
      storedPrefs = (await request.clone().json()).prefs;
      return jsonResponse({ ok: true, prefs: storedPrefs });
    }
    throw new Error(`Unexpected request: ${request.method} ${request.url}`);
  });

  let result: HookResult | undefined;
  let activeSourceState: SourceState = { sources: [], loaded: false };
  const Probe = ({ sourceState }: { sourceState: SourceState }) => {
    result = usePushNotifications();
    usePushAnnouncementPreferences(
      sourceState.sources,
      "zh",
      sourceState.loaded,
    );
    return null;
  };
  const root = createRoot(document.createElement("div"));

  const render = async (sourceState: SourceState = activeSourceState) => {
    activeSourceState = sourceState;
    await act(async () => {
      root.render(createElement(Probe, { sourceState }));
    });
  };

  return {
    window: browserWindow,
    root,
    requests,
    getResult: () => result,
    render,
  };
};

afterEach(async () => {
  announcementsState.data = undefined;
  announcementsState.error = undefined;
  if (active) {
    await act(async () => active?.root.unmount());
    active = undefined;
  }
  globalThis.fetch = originalFetch;
  restoreGlobals();
});

let active: ReturnType<typeof setup> | undefined;

describe("push notification preference synchronization", () => {
  test("enables with course changes by default while announcement sources are unavailable", async () => {
    announcementsState.error = new Error("announcements unavailable");
    active = setup();
    await active.render();
    await waitFor(() => active?.getResult()?.status === "ready");

    await act(async () => {
      await active?.getResult()?.subscribe();
    });

    const subscriptionPut = active.requests.find(
      (request) => request.method === "PUT",
    );
    expect(subscriptionPut).toBeDefined();
    expect(await subscriptionPut?.json()).toMatchObject({
      prefs: {
        courseChanges: true,
        announcementSources: [],
      },
    });
  });

  test("syncs effective follows once announcement sources load", async () => {
    announcementsState.error = new Error("announcements unavailable");
    active = setup();
    await active.render();
    await waitFor(() => active?.getResult()?.status === "ready");
    await act(async () => {
      await active?.getResult()?.subscribe();
    });

    announcementsState.error = undefined;
    announcementsState.data = { sources: [{ id: "academic" }], articles: [] };
    await active.render({ sources: ["academic"], loaded: true });
    await waitFor(
      () =>
        active?.requests.filter((request) => request.method === "PUT")
          .length === 2,
    );

    const puts = active.requests.filter((request) => request.method === "PUT");
    expect(puts).toHaveLength(2);
    expect(await puts[1]?.json()).toMatchObject({
      prefs: {
        courseChanges: true,
        announcementSources: ["academic"],
      },
    });
  });
});
