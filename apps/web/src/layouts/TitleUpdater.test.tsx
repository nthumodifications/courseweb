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
  test.each([
    ["hans", "zh-Hans"],
    ["hant", "zh-Hant"],
  ] as const)(
    "uses persisted %s for the html lang on first render",
    async (zhScript, expectedLang) => {
      const installed = installTestDom("/zh/settings");
      restoreDom = installed.restore;
      installed.dom.window.localStorage.setItem(
        "zh_script",
        JSON.stringify(zhScript),
      );
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
              { initialEntries: ["/zh/settings"] },
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
