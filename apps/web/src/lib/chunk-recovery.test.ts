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
    jest.useFakeTimers();
    const fake = installBrowser();
    try {
      const { loadWithRetry } = await import(
        "./chunk-recovery?evaluation-error"
      );
      const error = new TypeError("real component runtime bug");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(0);
    } finally {
      fake.restore();
    }
  });

  test("does not reload while offline", async () => {
    jest.useFakeTimers();
    const fake = installBrowser({ online: false });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?offline");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(0);
      expect(fake.storage.has(STORAGE_KEY)).toBe(false);
    } finally {
      fake.restore();
    }
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
    jest.useFakeTimers();
    const fake = installBrowser({ updateThrows: true });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?update-error");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.updateCount()).toBe(0);
      expect(fake.reloadCount()).toBe(1);
    } finally {
      fake.restore();
    }
  });

  test("reloads once when registration.update rejects", async () => {
    jest.useFakeTimers();
    const fake = installBrowser({ updateRejects: true });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?update-rejects");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.updateCount()).toBe(1);
      expect(fake.reloadCount()).toBe(1);
    } finally {
      fake.restore();
    }
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
    jest.useFakeTimers();
    const now = new Date("2026-10-10T12:00:00Z");
    jest.setSystemTime(now);
    const storage = new Map([[STORAGE_KEY, String(now.getTime())]]);
    const fake = installBrowser({ storage });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?within-window");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(0);
      expect(fake.storage.get(STORAGE_KEY)).toBe(String(now.getTime()));
    } finally {
      fake.restore();
    }
  });

  test("blocks a future session guard timestamp", async () => {
    jest.useFakeTimers();
    const now = new Date("2026-10-10T12:00:00Z");
    jest.setSystemTime(now);
    const futureAttempt = now.getTime() + 1_000;
    const storage = new Map([[STORAGE_KEY, String(futureAttempt)]]);
    const fake = installBrowser({ storage });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?future-guard");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(0);
      expect(fake.storage.get(STORAGE_KEY)).toBe(String(futureAttempt));
    } finally {
      fake.restore();
    }
  });

  test("allows one more reload after five minutes", async () => {
    jest.useFakeTimers();
    const now = new Date("2026-10-10T12:00:00Z");
    jest.setSystemTime(now);
    const storage = new Map([
      [STORAGE_KEY, String(now.getTime() - RECOVERY_WINDOW_MS - 1)],
    ]);
    const fake = installBrowser({ storage });
    try {
      const { loadWithRetry } = await import("./chunk-recovery?expired");
      const error = new Error("Failed to fetch dynamically imported module");

      await expect(
        loadWithRetry(async () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(fake.reloadCount()).toBe(1);
      expect(fake.storage.get(STORAGE_KEY)).toBe(String(now.getTime()));
    } finally {
      fake.restore();
    }
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
    jest.useFakeTimers();
    const storage = new Map([[STORAGE_KEY, String(Date.now())]]);
    const fake = installBrowser({ storage });
    jest.useRealTimers();
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    fake.attachDocument(dom.window.document);
    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);
    const root = createRoot(container);

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
      await act(async () => root.unmount());
      dom.window.close();
      fake.restore();
    }
  });

  test("keeps the existing guard when a loaded component throws", async () => {
    jest.useFakeTimers();
    const storage = new Map([[STORAGE_KEY, String(Date.now())]]);
    const fake = installBrowser({ storage });
    jest.useRealTimers();
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    fake.attachDocument(dom.window.document);
    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);
    const root = createRoot(container);
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    class ErrorBoundary extends Component<
      { children: ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        return this.state.hasError
          ? createElement("div", null, "boundary")
          : this.props.children;
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
      await act(async () => root.unmount());
      dom.window.close();
      fake.restore();
    }
  });

  test("an unrelated lazy success does not re-arm reload", async () => {
    jest.useFakeTimers();
    const storage = new Map([[STORAGE_KEY, String(Date.now())]]);
    const fake = installBrowser({ storage });
    jest.useRealTimers();
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    fake.attachDocument(dom.window.document);
    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);
    const root = createRoot(container);

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
      expect(storage.has(STORAGE_KEY)).toBe(true);
      expect(fake.reloadCount()).toBe(0);
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
      fake.restore();
    }
  });
});
