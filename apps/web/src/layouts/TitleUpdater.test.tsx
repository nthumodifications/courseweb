import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";
import { installTestDom } from "@/testDom";

process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";
process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";

let root: Root | undefined;
let restoreDom: (() => void) | undefined;
let restoreStorageEvent: (() => void) | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  restoreStorageEvent?.();
  restoreStorageEvent = undefined;
  restoreDom?.();
  restoreDom = undefined;
});

describe("TitleUpdater", () => {
  test("renders reciprocal hreflang links for indexable paths", async () => {
    const path = "/zh/bus/main";
    const installed = installTestDom(path);
    restoreDom = installed.restore;

    const [
      { default: TitleUpdater },
      { SettingsProvider },
      { HelmetProvider },
      { MemoryRouter },
    ] = await Promise.all([
      import("@/layouts/TitleUpdater"),
      import("@/hooks/contexts/settings"),
      import("react-helmet-async"),
      import("react-router-dom"),
    ]);
    const container = installed.dom.window.document.createElement("div");
    installed.dom.window.document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        createElement(
          HelmetProvider,
          null,
          createElement(
            MemoryRouter,
            { initialEntries: [path] },
            createElement(SettingsProvider, null, createElement(TitleUpdater)),
          ),
        ),
      );
    });

    expect(
      [
        ...installed.dom.window.document.head.querySelectorAll(
          "[data-rh] link[rel=alternate]",
        ),
      ].map((link) => [
        link.getAttribute("hreflang"),
        link.getAttribute("href"),
      ]),
    ).toEqual([
      ["zh-TW", "https://nthumods.com/zh/bus/main"],
      ["en", "https://nthumods.com/en/bus/main"],
      ["zh-CN", "https://nthumods.com/zh-cn/bus/main"],
      ["x-default", "https://nthumods.com/zh/bus/main"],
    ]);
  });

  test("does not render hreflang links for noindex paths", async () => {
    const path = "/zh/settings";
    const installed = installTestDom(path);
    restoreDom = installed.restore;

    const [
      { default: TitleUpdater },
      { SettingsProvider },
      { HelmetProvider },
      { MemoryRouter },
    ] = await Promise.all([
      import("@/layouts/TitleUpdater"),
      import("@/hooks/contexts/settings"),
      import("react-helmet-async"),
      import("react-router-dom"),
    ]);
    const container = installed.dom.window.document.createElement("div");
    installed.dom.window.document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        createElement(
          HelmetProvider,
          null,
          createElement(
            MemoryRouter,
            { initialEntries: [path] },
            createElement(SettingsProvider, null, createElement(TitleUpdater)),
          ),
        ),
      );
    });

    expect(
      installed.dom.window.document.head.querySelectorAll(
        "[data-rh] link[rel=alternate]",
      ),
    ).toHaveLength(0);
  });

  test.each([
    ["/zh/settings", "zh-TW"],
    ["/en/settings", "en"],
    ["/zh-cn/settings", "zh-CN"],
  ] as const)(
    "uses the route locale %s for the html lang",
    async (path, expectedLang) => {
      const installed = installTestDom(path);
      restoreDom = installed.restore;
      installed.dom.window.document.documentElement.lang = "zh";

      const [
        { default: TitleUpdater },
        { SettingsProvider },
        { HelmetProvider },
        { MemoryRouter },
      ] = await Promise.all([
        import("@/layouts/TitleUpdater"),
        import("@/hooks/contexts/settings"),
        import("react-helmet-async"),
        import("react-router-dom"),
      ]);
      const previousStorageEvent = globalThis.StorageEvent;
      Object.assign(globalThis, {
        StorageEvent: installed.dom.window.StorageEvent,
      });
      restoreStorageEvent = () => {
        if (previousStorageEvent) {
          globalThis.StorageEvent = previousStorageEvent;
        } else {
          delete (globalThis as Record<string, unknown>).StorageEvent;
        }
      };

      const container = installed.dom.window.document.createElement("div");
      installed.dom.window.document.body.appendChild(container);
      root = createRoot(container);
      await act(async () => {
        root!.render(
          createElement(
            HelmetProvider,
            null,
            createElement(
              MemoryRouter,
              { initialEntries: [path] },
              createElement(
                SettingsProvider,
                null,
                createElement(TitleUpdater),
              ),
            ),
          ),
        );
      });

      expect(installed.dom.window.document.documentElement.lang).toBe(
        expectedLang,
      );
    },
  );
});
