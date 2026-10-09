import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import {
  getSyncedStorageBackupKey,
  getSyncedStorageKey,
  mergeCourseStorage,
  reconcileSyncedData,
} from "./syncedStorage";

const get = mock(
  async () =>
    new Response(JSON.stringify({ error: "key unavailable" }), { status: 400 }),
);
const post = mock(async () => new Response(null, { status: 200 }));
const user = {
  access_token: "test-access-token",
  expires_at: 1,
  profile: { name: "Test User", sub: "account-a" },
};
const actualOidcContext = await import("react-oidc-context");

type HookResult = readonly [unknown, unknown, boolean, boolean];

const setupDom = () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    StorageEvent: dom.window.StorageEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  return dom;
};

const renderSyncedStorage = async (hook: () => HookResult) => {
  let result: HookResult | undefined;
  const Probe = () => {
    result = hook();
    return null;
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const root = createRoot(document.createElement("div"));

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Probe),
      ),
    );
  });

  return {
    getResult: () => result,
    queryClient,
    root,
  };
};

const waitForResult = async (
  getResult: () => HookResult | undefined,
  predicate: (result: HookResult | undefined) => boolean = (result) =>
    Boolean(result?.[3]),
) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (predicate(getResult())) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
};

const cleanupSyncedStorage = async ({
  root,
  queryClient,
}: Awaited<ReturnType<typeof renderSyncedStorage>>) => {
  await act(async () => root.unmount());
  queryClient.clear();
};

mock.module("react-oidc-context", () => ({
  useAuth: () => ({ isAuthenticated: true, user }),
}));
mock.module("@/config/auth", () => ({
  default: { api: { kv: { ":key": { $get: get, $post: post } } } },
}));

describe("useSyncedStorage remote read states", () => {
  afterAll(() => {
    mock.module("react-oidc-context", () => actualOidcContext);
    mock.module("@/config/auth", () => ({ default: {} }));
  });

  afterEach(() => {
    get.mockReset();
    post.mockReset();
    get.mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: "key unavailable" }), {
          status: 400,
        }),
    );
    post.mockImplementation(async () => new Response(null, { status: 200 }));
  });

  test("settles local data after a GET error without POST, then reconciles after success", async () => {
    setupDom();
    const { default: useSyncedStorage } = await import("./useSyncedStorage");
    window.localStorage.setItem("nthumods_device_id", "device-a");
    window.localStorage.setItem(
      getSyncedStorageKey("grades", user.profile.sub),
      JSON.stringify({
        value: { theme: "local" },
        lastModified: 100,
        updatedAt: 100,
        deviceId: "device-a",
      }),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("grades", { theme: "default" }),
    );
    await waitForResult(rendered.getResult);
    const result = rendered.getResult();

    expect(result?.[0]).toEqual({ theme: "local" });
    expect([result?.[2], result?.[3], get.mock.calls.length]).toEqual([
      true,
      true,
      1,
    ]);
    expect(post).not.toHaveBeenCalled();

    get.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            value: { theme: "remote" },
            lastModified: 200,
            updatedAt: 200,
            deviceId: "device-b",
          }),
          { status: 200 },
        ),
    );
    await act(async () => {
      await rendered.queryClient.refetchQueries({ queryKey: ["kv"] });
    });
    await waitForResult(
      rendered.getResult,
      (nextResult) =>
        (nextResult?.[0] as { theme?: string } | undefined)?.theme === "remote",
    );

    expect(rendered.getResult()?.[0]).toEqual({ theme: "remote" });
    expect(rendered.getResult()?.[2]).toBe(true);
    expect(post).not.toHaveBeenCalled();

    await cleanupSyncedStorage(rendered);
  });

  test("keeps the initial merge after a failed first GET", async () => {
    setupDom();
    const local = {
      value: { "11410": ["A"] },
      lastModified: 100,
      updatedAt: 100,
      deviceId: "device-a",
    };
    const remote = {
      value: { "11410": ["B"] },
      lastModified: 200,
      updatedAt: 200,
      deviceId: "device-b",
    };
    window.localStorage.setItem("nthumods_device_id", "device-a");
    window.localStorage.setItem(
      getSyncedStorageKey("courses", user.profile.sub),
      JSON.stringify(local),
    );

    const { default: useSyncedStorage } = await import("./useSyncedStorage");
    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(rendered.getResult);

    const expected = reconcileSyncedData({
      local,
      remote,
      mergeData: mergeCourseStorage,
      initial: true,
      deviceId: "device-a",
    }).data.value;
    get.mockImplementationOnce(
      async () => new Response(JSON.stringify(remote), { status: 200 }),
    );
    await act(async () => {
      await rendered.queryClient.refetchQueries({ queryKey: ["kv"] });
    });
    await waitForResult(
      rendered.getResult,
      (nextResult) =>
        JSON.stringify(nextResult?.[0]) === JSON.stringify(expected),
    );

    expect(rendered.getResult()?.[0]).toEqual(expected);

    await cleanupSyncedStorage(rendered);
  });

  test("persists the primary before a quota-failing backup", async () => {
    setupDom();
    const storageKey = getSyncedStorageKey("grades", user.profile.sub);
    window.localStorage.setItem("nthumods_device_id", "device-a");
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        value: { theme: "local" },
        lastModified: 100,
        updatedAt: 100,
        deviceId: "device-a",
      }),
    );
    const originalStorage = window.localStorage;
    const calls: string[] = [];
    const throwingStorage = {
      get length() {
        return originalStorage.length;
      },
      clear: () => originalStorage.clear(),
      getItem: (key: string) => originalStorage.getItem(key),
      key: (index: number) => originalStorage.key(index),
      removeItem: (key: string) => originalStorage.removeItem(key),
      setItem: (key: string, value: string) => {
        calls.push(key);
        if (key === getSyncedStorageBackupKey(storageKey)) {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        }
        originalStorage.setItem(key, value);
      },
    } as Storage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: throwingStorage,
    });
    get.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            value: { theme: "remote" },
            lastModified: 200,
            updatedAt: 200,
            deviceId: "device-b",
          }),
          { status: 200 },
        ),
    );

    const { default: useSyncedStorage } = await import("./useSyncedStorage");
    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("grades", { theme: "default" }),
    );
    await waitForResult(
      rendered.getResult,
      (result) =>
        (result?.[0] as { theme?: string } | undefined)?.theme === "remote",
    );

    expect(rendered.getResult()?.[0]).toEqual({ theme: "remote" });
    expect(JSON.parse(originalStorage.getItem(storageKey)!)).toMatchObject({
      value: { theme: "remote" },
    });
    expect(calls).toEqual([storageKey, getSyncedStorageBackupKey(storageKey)]);

    await cleanupSyncedStorage(rendered);
  });
});
