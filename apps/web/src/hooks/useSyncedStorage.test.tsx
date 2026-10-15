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
import { afterEach, describe, expect, mock, test } from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";
import {
  nextStorageValue,
  persistStorageValue,
  subscribeToStorageEvents,
} from "@/test-utils/storage-events";
import {
  getCourseBackupKey,
  getSyncedStorageNamespace,
  listCourseBackups,
  restoreCourseBackup,
  saveCourseBackup,
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
const authState: {
  isAuthenticated: boolean;
  user: typeof user | undefined;
} = { isAuthenticated: true, user };
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

mock.module("react-oidc-context", () => ({
  useAuth: () => authState,
}));
mock.module("@/config/auth", () => ({
  default: { api: { kv: { ":key": { $get: get, $post: post } } } },
}));

const readLocalValue = <T,>(
  key: string,
  fallback: () => T,
  deserialize: (value: string) => T = JSON.parse,
): T => {
  if (typeof window === "undefined") return fallback();
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback();
  }
  if (!raw) return fallback();
  try {
    return deserialize(raw);
  } catch {
    return fallback();
  }
};

const useTestLocalStorage = <T,>(
  key: string,
  initialValue: T,
  options?: { deserializer?: (value: string) => T },
): [T, (next: T | ((previous: T) => T)) => void] => {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const read = () =>
    readLocalValue(key, () => initialValueRef.current, options?.deserializer);
  const [value, setValue] = useState(read);
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const nextValue = nextStorageValue(next, read);
      persistStorageValue(key, nextValue);
      window.dispatchEvent(new window.StorageEvent("local-storage", { key }));
      setValue(nextValue);
    },
    [key],
  );
  useEffect(() => subscribeToStorageEvents(key, read, setValue), [key]);
  return [value, update];
};

mock.module("usehooks-ts", () => ({
  ...actualUsehooksTs,
  useLocalStorage: useTestLocalStorage,
}));

const { default: useSyncedStorage } = await import("./useSyncedStorage");
mock.module("usehooks-ts", () => actualUsehooksTs);
mock.module("react-oidc-context", () => actualOidcContext);
mock.module("@/config/auth", () => actualAuth);

describe("useSyncedStorage remote read states", () => {
  afterEach(() => {
    authState.isAuthenticated = true;
    authState.user = user;
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

  test("upgrades a raw anonymous courses record while retaining all semesters", async () => {
    setupDom();
    authState.isAuthenticated = false;
    authState.user = undefined;
    const legacyCourses = {
      "11310": ["11310-COURSE"],
      "11410": ["11410-COURSE"],
      "11510": ["11510-COURSE"],
    };
    window.localStorage.setItem("courses", JSON.stringify(legacyCourses));

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(
      rendered.getResult,
      (result) =>
        Object.keys((result?.[0] as Record<string, string[]>) ?? {}).length ===
        3,
    );

    expect(rendered.getResult()?.[0]).toEqual(legacyCourses);
    expect(window.localStorage.getItem("courses")).toBe(
      JSON.stringify(legacyCourses),
    );

    await cleanupSyncedStorage(rendered);
  });

  test("upgrades a raw anonymous favourites record without deleting it", async () => {
    setupDom();
    authState.isAuthenticated = false;
    authState.user = undefined;
    const legacyFavourites = ["COURSE-A", "COURSE-B"];
    window.localStorage.setItem(
      "course_favourites",
      JSON.stringify(legacyFavourites),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("course_favourites", [], mergeStringArray),
    );
    await waitForResult(
      rendered.getResult,
      (result) => (result?.[0] as string[] | undefined)?.length === 2,
    );

    expect(rendered.getResult()?.[0]).toEqual(legacyFavourites);
    expect(window.localStorage.getItem("course_favourites")).toBe(
      JSON.stringify(legacyFavourites),
    );

    await cleanupSyncedStorage(rendered);
  });

  test("does not adopt a raw record while signed in, but retains it for recovery", async () => {
    setupDom();
    const legacyCourses = { "11410": ["LEGACY-COURSE"] };
    window.localStorage.setItem("courses", JSON.stringify(legacyCourses));

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(rendered.getResult);

    expect(rendered.getResult()?.[0]).toEqual({});
    expect(window.localStorage.getItem("courses")).toBe(
      JSON.stringify(legacyCourses),
    );
    expect(
      window.localStorage.getItem(
        getSyncedStorageKey("courses", user.profile.sub),
      ),
    ).toBeNull();

    await cleanupSyncedStorage(rendered);
  });

  test("does not adopt a raw favourites record while signed in", async () => {
    setupDom();
    const legacyFavourites = ["LEGACY-COURSE"];
    window.localStorage.setItem(
      "course_favourites",
      JSON.stringify(legacyFavourites),
    );

    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("course_favourites", [], mergeStringArray),
    );
    await waitForResult(rendered.getResult);

    expect(rendered.getResult()?.[0]).toEqual([]);
    expect(window.localStorage.getItem("course_favourites")).toBe(
      JSON.stringify(legacyFavourites),
    );
    expect(
      window.localStorage.getItem(
        getSyncedStorageKey("course_favourites", user.profile.sub),
      ),
    ).toBeNull();

    await cleanupSyncedStorage(rendered);
  });

  test("writes only distinct non-empty course backups and restores by listed index", () => {
    setupDom();
    const namespace = "nthumods-storage-anonymous";
    const values = [
      { "11410": ["COURSE-C"] },
      { "11410": ["COURSE-B"] },
      { "11410": ["COURSE-A"] },
      { "11410": ["COURSE-OLD"] },
    ];

    saveCourseBackup(namespace, values[0]);
    saveCourseBackup(namespace, values[0]);
    saveCourseBackup(namespace, values[1]);
    saveCourseBackup(namespace, values[2]);
    saveCourseBackup(namespace, values[3]);

    const backups = listCourseBackups(namespace);
    expect(backups).toHaveLength(3);
    expect(backups.map((backup) => backup.value)).toEqual([
      values[3],
      values[2],
      values[1],
    ]);
    expect(restoreCourseBackup(namespace, 0)).toEqual(values[3]);
    expect(restoreCourseBackup(namespace, 3)).toBeUndefined();
    expect(
      window.localStorage.getItem(getCourseBackupKey(namespace)),
    ).toBeTruthy();
  });

  test("removes older backups with the same serialized value", () => {
    setupDom();
    const namespace = "nthumods-storage-anonymous";
    const first = { "11410": ["COURSE-A"] };
    const second = { "11410": ["COURSE-B"] };

    saveCourseBackup(namespace, first);
    saveCourseBackup(namespace, second);
    saveCourseBackup(namespace, first);

    expect(listCourseBackups(namespace).map((backup) => backup.value)).toEqual([
      first,
      second,
    ]);
  });

  test("prunes oldest backups to keep the rolling array within 32 KB", () => {
    setupDom();
    const namespace = "nthumods-storage-anonymous";
    const makeValue = (character: string) => ({
      "11410": [character.repeat(12 * 1024)],
    });
    const first = makeValue("a");
    const second = makeValue("b");
    const third = makeValue("c");

    saveCourseBackup(namespace, first);
    saveCourseBackup(namespace, second);
    saveCourseBackup(namespace, third);

    expect(listCourseBackups(namespace).map((backup) => backup.value)).toEqual([
      third,
      second,
    ]);

    const oversizedNamespace = "nthumods-storage-oversized";
    saveCourseBackup(oversizedNamespace, {
      "11410": ["x".repeat(33 * 1024)],
    });
    expect(listCourseBackups(oversizedNamespace)).toEqual([]);
  });

  test("skips empty and over-sized course backups", () => {
    setupDom();
    const namespace = "nthumods-storage-anonymous";

    saveCourseBackup(namespace, {});
    expect(listCourseBackups(namespace)).toEqual([]);

    saveCourseBackup(namespace, { "11410": ["x".repeat(210 * 1024)] });
    expect(listCourseBackups(namespace)).toEqual([]);
  });

  test("keeps local courses render-ready after a persistent 401 without publishing", async () => {
    setupDom();
    window.localStorage.setItem("nthumods_device_id", "device-a");
    window.localStorage.setItem(
      getSyncedStorageKey("courses", user.profile.sub),
      JSON.stringify({
        value: { "11410": ["LOCAL-COURSE"] },
        lastModified: 100,
        updatedAt: 100,
        deviceId: "device-a",
      }),
    );

    get.mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
        }),
    );
    const rendered = await renderSyncedStorage(() =>
      useSyncedStorage("courses", {}, mergeCourseStorage),
    );
    await waitForResult(rendered.getResult);
    const result = rendered.getResult();

    expect(result?.[0]).toEqual({ "11410": ["LOCAL-COURSE"] });
    expect([result?.[2], result?.[3], get.mock.calls.length]).toEqual([
      true,
      true,
      1,
    ]);
    expect(post).not.toHaveBeenCalled();

    await cleanupSyncedStorage(rendered);
  });

  test("treats a successful pull after a later read error as initial again", async () => {
    setupDom();
    window.localStorage.setItem("nthumods_device_id", "device-a");
    window.localStorage.setItem(
      getSyncedStorageKey("courses", user.profile.sub),
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
            value: { "11410": ["FIRST-REMOTE-COURSE"] },
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
      (result) =>
        (result?.[0] as Record<string, string[]> | undefined)?.[
          "11410"
        ]?.includes("FIRST-REMOTE-COURSE") ?? false,
    );

    get.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ error: "failed" }), { status: 503 }),
    );
    await act(async () => {
      await rendered.queryClient.refetchQueries({ queryKey: ["kv"] });
    });
    await waitForResult(rendered.getResult, (result) => result?.[3] === true);
    expect(rendered.getResult()?.[2]).toBe(true);

    get.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            value: { "11510": ["RECOVERED-REMOTE-COURSE"] },
            lastModified: 300,
            updatedAt: 300,
            deviceId: "device-c",
          }),
          { status: 200 },
        ),
    );
    await act(async () => {
      await rendered.queryClient.refetchQueries({ queryKey: ["kv"] });
    });
    await waitForResult(
      rendered.getResult,
      (result) =>
        (result?.[0] as Record<string, string[]> | undefined)?.[
          "11510"
        ]?.includes("RECOVERED-REMOTE-COURSE") ?? false,
    );

    expect(rendered.getResult()?.[0]).toEqual({
      "11410": ["LOCAL-COURSE", "FIRST-REMOTE-COURSE"],
      "11510": ["RECOVERED-REMOTE-COURSE"],
    });

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
    expect(
      listCourseBackups(getSyncedStorageNamespace(user.profile.sub))[0]?.value,
    ).toEqual({ "11410": ["ACCOUNT-COURSE"] });
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
