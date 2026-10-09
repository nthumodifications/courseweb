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

    let result: readonly [unknown, unknown, boolean, boolean] | undefined;
    const Probe = () => {
      result = useSyncedStorage("grades", { theme: "default" });
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
    for (let attempt = 0; attempt < 10 && !result?.[3]; attempt += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

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
      await queryClient.refetchQueries({ queryKey: ["kv"] });
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if ((result?.[0] as { theme?: string } | undefined)?.theme === "remote") {
        break;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(result?.[0]).toEqual({ theme: "remote" });
    expect(result?.[2]).toBe(true);
    expect(post).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    queryClient.clear();
    dom.window.close();
  });

  test("keeps the initial merge after a failed first GET", async () => {
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
    let result: readonly [unknown, unknown, boolean, boolean] | undefined;
    const Probe = () => {
      result = useSyncedStorage("courses", {}, mergeCourseStorage);
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
    for (let attempt = 0; attempt < 10 && !result?.[3]; attempt += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

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
      await queryClient.refetchQueries({ queryKey: ["kv"] });
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (JSON.stringify(result?.[0]) === JSON.stringify(expected)) {
        break;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(result?.[0]).toEqual(expected);

    await act(async () => root.unmount());
    queryClient.clear();
    dom.window.close();
  });

  test("persists the primary before a quota-failing backup", async () => {
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
    let result: readonly [unknown, unknown, boolean, boolean] | undefined;
    const Probe = () => {
      result = useSyncedStorage("grades", { theme: "default" });
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
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if ((result?.[0] as { theme?: string } | undefined)?.theme === "remote") {
        break;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(result?.[0]).toEqual({ theme: "remote" });
    expect(JSON.parse(originalStorage.getItem(storageKey)!)).toMatchObject({
      value: { theme: "remote" },
    });
    expect(calls).toEqual([storageKey, getSyncedStorageBackupKey(storageKey)]);

    await act(async () => root.unmount());
    queryClient.clear();
    dom.window.close();
  });
});
