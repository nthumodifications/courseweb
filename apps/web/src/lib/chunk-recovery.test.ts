import { act, Component, createElement, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, jest, spyOn, test } from "bun:test";

const STORAGE_KEY = "nthumods:chunk-recovery-attempted";
const RECOVERY_WINDOW_MS = 5 * 60 * 1000;

type Listener = (event: any) => void;

type BrowserOptions = {
  online?: boolean;
  storage?: Map<string, string>;
  storageThrows?: boolean;
  updateThrows?: boolean;
  updateRejects?: boolean;
  pauseUpdate?: boolean;
};

function installBrowser(options: BrowserOptions = {}) {
  const previous = new Map(
    ["window", "document", "navigator", "IS_REACT_ACT_ENVIRONMENT"].map(
      (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ),
  );
  const storage = options.storage ?? new Map<string, string>();
  const listeners = new Map<string, Listener[]>();
  let reloadCount = 0;
  let updateCount = 0;
  let releaseUpdate: (() => void) | undefined;
  let resolveUpdateStarted!: () => void;
  const updateStarted = new Promise<void>((resolve) => {
    resolveUpdateStarted = resolve;
  });

  const storageApi = {
    getItem(key: string) {
      if (options.storageThrows) throw new Error("storage denied");
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options.storageThrows) throw new Error("storage denied");
      storage.set(key, value);
    },
  };

  const fakeWindow = {
    location: { reload: () => reloadCount++ },
    sessionStorage: storageApi,
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    dispatchEvent(type: string, event: any = {}) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
  };
  const fakeNavigator = {
    onLine: options.online ?? true,
    serviceWorker: {
      getRegistration: async () => {
        if (options.updateThrows) throw new Error("update denied");
        return {
          update: async () => {
            updateCount++;
            if (options.pauseUpdate) {
              resolveUpdateStarted();
              await new Promise<void>((resolve) => {
                releaseUpdate = resolve;
              });
            }
            if (options.updateRejects) throw new Error("update denied");
          },
        };
      },
    },
  };

  Object.defineProperties(globalThis, {
    window: { configurable: true, value: fakeWindow },
    navigator: { configurable: true, value: fakeNavigator },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });

  return {
    storage,
    fakeWindow,
    reloadCount: () => reloadCount,
    updateCount: () => updateCount,
    updateStarted: () => updateStarted,
    releaseUpdate: () => releaseUpdate?.(),
    setOnline: (online: boolean) => {
      fakeNavigator.onLine = online;
    },
    attachDocument(document: Document) {
      const browserWindow = document.defaultView;
      if (browserWindow) {
        Object.defineProperty(browserWindow, "sessionStorage", {
          configurable: true,
          value: storageApi,
        });
        Object.defineProperty(browserWindow, "navigator", {
          configurable: true,
          value: fakeNavigator,
        });
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: browserWindow,
        });
      }
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: document,
      });
    },
    restore() {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

type LoadFailureOptions = {
  query: string;
  browser?: BrowserOptions;
  error?: Error;
  expectedReloads: number;
  expectedUpdates?: number;
  expectedStorage?: false | string;
  systemTime?: Date;
};

async function expectLoadFailure({
  query,
  browser,
  error = new Error("Failed to fetch dynamically imported module"),
  expectedReloads,
  expectedUpdates,
  expectedStorage,
  systemTime,
}: LoadFailureOptions) {
  jest.useFakeTimers();
  if (systemTime) jest.setSystemTime(systemTime);
  const fake = installBrowser(browser);
  try {
    const { loadWithRetry } = await import(`./chunk-recovery?${query}`);

    await expect(loadWithRetry(async () => Promise.reject(error))).rejects.toBe(
      error,
    );
    expect(fake.reloadCount()).toBe(expectedReloads);
    if (expectedUpdates !== undefined) {
      expect(fake.updateCount()).toBe(expectedUpdates);
    }
    if (expectedStorage === false) {
      expect(fake.storage.has(STORAGE_KEY)).toBe(false);
    } else if (expectedStorage !== undefined) {
      expect(fake.storage.get(STORAGE_KEY)).toBe(expectedStorage);
    }
  } finally {
    fake.restore();
  }
}

function installReactTestBrowser() {
  jest.useFakeTimers();
  const fake = installBrowser({
    storage: new Map([[STORAGE_KEY, String(Date.now())]]),
  });
  jest.useRealTimers();
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  fake.attachDocument(dom.window.document);
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  return {
    fake,
    dom,
    root: createRoot(container),
    container,
  };
}

async function cleanupReactTestBrowser(
  browser: ReturnType<typeof installReactTestBrowser>,
) {
  await act(async () => browser.root.unmount());
  browser.dom.window.close();
  browser.fake.restore();
}

afterEach(() => {
  jest.useRealTimers();
});

describe("loadWithRetry", () => {
  test("returns a successful import without recovery", async () => {
    jest.useFakeTimers();
    const fake = installBrowser();
    try {
      const { loadWithRetry } = await import("./chunk-recovery?success");

      await expect(loadWithRetry(async () => "loaded")).resolves.toBe("loaded");
      expect(fake.reloadCount()).toBe(0);
    } finally {
      fake.restore();
    }
  });

  test("recovers only load failures, not evaluation errors", async () => {
    await expectLoadFailure({
      query: "evaluation-error",
      error: new TypeError("real component runtime bug"),
      expectedReloads: 0,
    });
  });

  test("does not reload while offline", async () => {
    await expectLoadFailure({
      query: "offline",
      browser: { online: false },
      expectedReloads: 0,
      expectedStorage: false,
    });
  });

  test("fails closed when session storage is unavailable", async () => {
    jest.useFakeTimers();
    const fake = installBrowser({ storageThrows: true });
    try {
      const first = await import("./chunk-recovery?storage-denied-first");
      const second = await import("./chunk-recovery?storage-denied-second");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        first.loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      await expect(
        second.loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(0);
    } finally {
      fake.restore();
    }
  });

  test("coalesces several same-tick load failures into one reload", async () => {
    jest.useFakeTimers();
    const fake = installBrowser();
    try {
      const { loadWithRetry } = await import("./chunk-recovery?same-tick");
      const firstError = new Error(
        "Failed to fetch dynamically imported module",
      );
      const secondError = new Error("Importing a module script failed");

      const results = await Promise.allSettled([
        loadWithRetry(async () => Promise.reject(firstError)),
        loadWithRetry(async () => Promise.reject(secondError)),
      ]);
      await flushMicrotasks();

      expect(results.map((result) => result.status)).toEqual([
        "rejected",
        "rejected",
      ]);
      expect(fake.reloadCount()).toBe(1);
    } finally {
      fake.restore();
    }
  });

  test("reloads once even when the service-worker update fails", async () => {
    await expectLoadFailure({
      query: "update-error",
      browser: { updateThrows: true },
      expectedReloads: 1,
      expectedUpdates: 0,
    });
  });

  test("reloads once when registration.update rejects", async () => {
    await expectLoadFailure({
      query: "update-rejects",
      browser: { updateRejects: true },
      expectedReloads: 1,
      expectedUpdates: 1,
    });
  });

  test("checks online status again after the service-worker update", async () => {
    jest.useFakeTimers();
    const fake = installBrowser({ pauseUpdate: true });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?offline-race");
      const error = new Error("Failed to fetch dynamically imported module");
      const failure = loadWithRetry(async () => Promise.reject(error));

      await fake.updateStarted();
      fake.setOnline(false);
      fake.releaseUpdate();

      await expect(failure).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(0);
      expect(fake.storage.has(STORAGE_KEY)).toBe(false);
    } finally {
      fake.restore();
    }
  });

  test("sends a second failure within five minutes to the existing boundary", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const storage = new Map([[STORAGE_KEY, String(now.getTime())]]);
    await expectLoadFailure({
      query: "within-window",
      browser: { storage },
      expectedReloads: 0,
      expectedStorage: String(now.getTime()),
      systemTime: now,
    });
  });

  test("blocks a future session guard timestamp", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const futureAttempt = now.getTime() + 1_000;
    const storage = new Map([[STORAGE_KEY, String(futureAttempt)]]);
    await expectLoadFailure({
      query: "future-guard",
      browser: { storage },
      expectedReloads: 0,
      expectedStorage: String(futureAttempt),
      systemTime: now,
    });
  });

  test("allows one more reload after five minutes", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const storage = new Map([
      [STORAGE_KEY, String(now.getTime() - RECOVERY_WINDOW_MS - 1)],
    ]);
    await expectLoadFailure({
      query: "expired",
      browser: { storage },
      expectedReloads: 1,
      expectedStorage: String(now.getTime()),
      systemTime: now,
    });
  });

  test("handles Vite preload failures through the same guarded recovery", async () => {
    jest.useFakeTimers();
    const fake = installBrowser();
    try {
      await import("./chunk-recovery?vite-preload-error");
      let prevented = false;
      fake.fakeWindow.dispatchEvent("vite:preloadError", {
        preventDefault: () => {
          prevented = true;
        },
      });
      await flushMicrotasks();

      expect(prevented).toBe(true);
      expect(fake.reloadCount()).toBe(1);
    } finally {
      fake.restore();
    }
  });
});

describe("lazyWithRetry", () => {
  test("renders a lazy component while preserving the recovery guard", async () => {
    const browser = installReactTestBrowser();
    const { fake, root, container } = browser;

    try {
      const { lazyWithRetry } = await import("./chunk-recovery?rendered");
      const importedModule = {
        NamedComponent: () => createElement("div", null, "loaded"),
      };
      const LazyComponent = lazyWithRetry(async () => ({
        default: importedModule.NamedComponent,
      }));

      await act(async () => {
        root.render(
          createElement(
            Suspense,
            { fallback: createElement("div", null, "loading") },
            createElement(LazyComponent),
          ),
        );
      });

      expect(container.textContent).toBe("loaded");
      expect(fake.storage.has(STORAGE_KEY)).toBe(true);
    } finally {
      await cleanupReactTestBrowser(browser);
    }
  });

  test("keeps the existing guard when a loaded component throws", async () => {
    const browser = installReactTestBrowser();
    const { fake, root, container } = browser;
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    class ErrorBoundary extends Component<
      { children: ReactNode },
      { hasError: boolean }
    > {
      readonly state = { hasError: false };

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) return createElement("div", null, "boundary");
        return this.props.children;
      }
    }

    try {
      const { lazyWithRetry } = await import("./chunk-recovery?render-error");
      const LazyComponent = lazyWithRetry(async () => ({
        default: () => {
          throw new Error("rendered component bug");
        },
      }));

      await act(async () => {
        root.render(
          createElement(
            ErrorBoundary,
            null,
            createElement(
              Suspense,
              { fallback: createElement("div", null, "loading") },
              createElement(LazyComponent),
            ),
          ),
        );
      });

      expect(container.textContent).toBe("boundary");
      expect(fake.storage.get(STORAGE_KEY)).toBeTruthy();
      expect(fake.reloadCount()).toBe(0);
    } finally {
      errorSpy.mockRestore();
      await cleanupReactTestBrowser(browser);
    }
  });

  test("an unrelated lazy success does not re-arm reload", async () => {
    const browser = installReactTestBrowser();
    const { fake, root, container } = browser;

    try {
      const { lazyWithRetry, loadWithRetry } = await import(
        "./chunk-recovery?unrelated-success"
      );
      const LazyComponent = lazyWithRetry(async () => ({
        default: () => createElement("div", null, "unrelated success"),
      }));
      await act(async () => {
        root.render(
          createElement(
            Suspense,
            { fallback: createElement("div", null, "loading") },
            createElement(LazyComponent),
          ),
        );
      });

      const error = new Error("Failed to fetch dynamically imported module");
      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(container.textContent).toBe("unrelated success");
      expect(fake.storage.has(STORAGE_KEY)).toBe(true);
      expect(fake.reloadCount()).toBe(0);
    } finally {
      await cleanupReactTestBrowser(browser);
    }
  });
});
