import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import zh from "@/dictionaries/zh.json";
import { DEFAULT_DASHBOARD_CONFIG, type DashboardConfig } from "@/types/widget";
import { captureGlobalState } from "@/test-utils/global-state";
import { installTestDom } from "@/testDom";

mock.module("@/dictionaries/useDictionary", () => ({
  default: () => zh,
}));

mock.module(
  "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog",
  () => ({
    ResponsiveDialog: ({ children }: { children: ReactNode }) =>
      createElement("div", null, children),
  }),
);

let WidgetManagementPanel: typeof import("./WidgetManagementPanel").default;
let activeDom: ReturnType<typeof installPanelTestDom> | undefined;
let activeRoot: Root | undefined;

const allWidgetsDisabled: DashboardConfig = {
  ...DEFAULT_DASHBOARD_CONFIG,
  widgets: DEFAULT_DASHBOARD_CONFIG.widgets.map((widget) => ({
    ...widget,
    enabled: false,
  })),
};

const installPanelTestDom = () => {
  const restoreGlobals = captureGlobalState(["StorageEvent", "matchMedia"]);
  const installed = installTestDom("/zh/today");
  Object.assign(globalThis, {
    StorageEvent: installed.dom.window.StorageEvent,
    matchMedia: installed.dom.window.matchMedia,
  });
  return {
    ...installed,
    restore: () => {
      restoreGlobals();
      installed.restore();
    },
  };
};

beforeAll(async () => {
  const dom = installPanelTestDom();
  WidgetManagementPanel = (await import("./WidgetManagementPanel")).default;
  dom.restore();
});

afterEach(async () => {
  const dom = activeDom;
  try {
    await act(async () => activeRoot?.unmount());
  } finally {
    activeRoot = undefined;
    activeDom = undefined;
    dom?.restore();
  }
});

describe("WidgetManagementPanel", () => {
  test("enables a widget through the dashboard configuration store", async () => {
    activeDom = installPanelTestDom();
    window.localStorage.setItem(
      "widget_config_v1",
      JSON.stringify(allWidgetsDisabled),
    );

    const container = document.createElement("div");
    document.body.appendChild(container);
    activeRoot = createRoot(container);
    await act(async () => {
      activeRoot!.render(
        createElement(WidgetManagementPanel, {
          open: true,
          onOpenChange: () => undefined,
        }),
      );
    });

    const busSwitch = container.querySelector(
      `button[aria-label="${zh.settings.calendar.widget_dashboard.widget_options.bus.title}"]`,
    );
    expect(busSwitch).not.toBeNull();
    expect(busSwitch?.getAttribute("aria-checked")).toBe("false");

    await act(async () => {
      (busSwitch as HTMLButtonElement).click();
    });

    expect(busSwitch?.getAttribute("aria-checked")).toBe("true");
    const storedConfig = JSON.parse(
      window.localStorage.getItem("widget_config_v1")!,
    ) as DashboardConfig;
    expect(
      storedConfig.widgets.find((widget) => widget.type === "bus")?.enabled,
    ).toBe(true);
  });
});
