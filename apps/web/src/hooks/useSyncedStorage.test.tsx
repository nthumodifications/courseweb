import {
  act,
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";
import {
  getSyncedStorageBackupKey,
  getSyncedStorageKey,
  mergeCourseStorage,
  mergeStringArray,
  reconcileSyncedData,
} from "./syncedStorage";

process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

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
const actualAuth = await import("@/config/auth");
const actualUsehooksTs = await import("usehooks-ts");

const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "StorageEvent",
  "IS_REACT_ACT_ENVIRONMENT",
]);
let activeDom: JSDOM | undefined;

type HookResult = readonly [unknown, unknown, boolean, boolean];

const setupDom = () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  activeDom = dom;
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

const readLocalValue = <T,>(key: string, fallback: () => T): T => {
  if (typeof window === "undefined") return fallback();
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback();
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
};

mock.module("react-oidc-context", () => ({
  useAuth: () => ({ isAuthenticated: true, user }),
}));
mock.module("@/config/auth", () => ({
  default: { api: { kv: { ":key": { $get: get, $post: post } } } },
}));

const useTestLocalStorage = <T,>(
  key: string,
  initialValue: T,
): [T, (next: T | ((previous: T) => T)) => void] => {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const read = () => readLocalValue(key, () => initialValueRef.current);
  const [value, setValue] = useState(read);
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const nextValue =
        typeof next === "function"
          ? (next as (previous: T) => T)(read())
          : next;
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      window.dispatchEvent(new window.StorageEvent("local-storage", { key }));
      setValue(nextValue);
    },
    [key],
  );
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== key) return;
      setValue(read());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("local-storage", handleStorage);
    setValue(read());
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local-storage", handleStorage);
    };
  }, [key]);
  return [value, update];
};

mock.module("usehooks-ts", () => ({
  ...actualUsehooksTs,
  useLocalStorage: useTestLocalStorage,
}));

const { default: useSyncedStorage } = await import("./useSyncedStorage");
mock.module("usehooks-ts", () => actualUsehooksTs);

describe("useSyncedStorage remote read states", () => {
  afterAll(() => {
    mock.module("react-oidc-context", () => actualOidcContext);
    mock.module("@/config/auth", () => actualAuth);
  });

  afterEach(() => {
    activeDom?.window.close();
    activeDom = undefined;
    restoreGlobals();
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

  test("uses a newer remote course clear without uploading local data back", async () => {
    setupDom();
    window.localStorage.setItem("nthumods_device_id", "device-a");
    const storageKey = getSyncedStorageKey("courses", user.profile.sub);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        value: { "11410": ["LOCAL-COURSE"] },
        lastModified: 100,
        updatedAt: 100,
        deviceId: "device-a",
      }),
    );
    get.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            value: {},
            lastModified: 200,
            updatedAt: 200,
            deviceId: "device-b",
          }),
          { status: 200 },
        ),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(
      rendered.getResult,
      (result) => JSON.stringify(result?.[0]) === JSON.stringify({}),
    );

    expect(rendered.getResult()?.[0]).toEqual({});
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(post).not.toHaveBeenCalled();

    await cleanupSyncedStorage(rendered);
  });

  test("uses a newer remote favourites clear without uploading local data back", async () => {
    setupDom();
    window.localStorage.setItem("nthumods_device_id", "device-a");
    window.localStorage.setItem(
      getSyncedStorageKey("course_favourites", user.profile.sub),
      JSON.stringify({
        value: ["LOCAL-FAVOURITE"],
        lastModified: 100,
        updatedAt: 100,
        deviceId: "device-a",
      }),
    );
    get.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            value: [],
            lastModified: 200,
            updatedAt: 200,
            deviceId: "device-b",
          }),
          { status: 200 },
        ),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("course_favourites", [], mergeStringArray),
    );
    await waitForResult(
      rendered.getResult,
      (result) => JSON.stringify(result?.[0]) === JSON.stringify([]),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(rendered.getResult()?.[0]).toEqual([]);
    expect(post).not.toHaveBeenCalled();

    await cleanupSyncedStorage(rendered);
  });

  test("uploads a signed-in edit to the account record", async () => {
    setupDom();
    window.localStorage.setItem("nthumods_device_id", "device-a");
    const accountStorageKey = getSyncedStorageKey("courses", user.profile.sub);
    window.localStorage.setItem(
      accountStorageKey,
      JSON.stringify({
        value: {},
        lastModified: -1,
        updatedAt: -1,
        deviceId: "device-a",
      }),
    );
    window.localStorage.setItem(
      "courses",
      JSON.stringify({
        value: { "11410": ["LEGACY-COURSE"] },
        lastModified: 100,
      }),
    );
    window.localStorage.setItem(
      getSyncedStorageKey("courses"),
      JSON.stringify({
        value: { "11410": ["ANONYMOUS-COURSE"] },
        lastModified: 100,
        updatedAt: 100,
        deviceId: "device-a",
      }),
    );
    get.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(rendered.getResult);

    expect(rendered.getResult()?.[0]).toEqual({});
    const updateData = rendered.getResult()?.[1] as (
      value: Record<string, string[]>,
    ) => void;
    await act(async () => {
      updateData({ "11410": ["ACCOUNT-COURSE"] });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const storedAccountData = JSON.parse(
      window.localStorage.getItem(accountStorageKey)!,
    );
    expect(storedAccountData).toMatchObject({
      value: { "11410": ["ACCOUNT-COURSE"] },
    });
    expect(storedAccountData.updatedAt).toBeGreaterThan(-1);
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ param: { key: "courses" } }),
      expect.anything(),
    );

    await cleanupSyncedStorage(rendered);
  });

  test("does not write on an idle load with an unchanged remote snapshot", async () => {
    setupDom();
    window.localStorage.setItem("nthumods_device_id", "device-a");
    const storageKey = getSyncedStorageKey("courses", user.profile.sub);
    const snapshot = {
      value: { "11410": ["UNCHANGED-COURSE"] },
      lastModified: 100,
      updatedAt: 100,
      deviceId: "device-a",
    };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    get.mockImplementationOnce(
      async () => new Response(JSON.stringify(snapshot), { status: 200 }),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(rendered.getResult);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(rendered.getResult()?.[0]).toEqual({
      "11410": ["UNCHANGED-COURSE"],
    });
    expect(post).toHaveBeenCalledTimes(0);

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
