import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import zh from "@/dictionaries/zh.json";
import { DEFAULT_DASHBOARD_CONFIG, type DashboardConfig } from "@/types/widget";
import { captureGlobalState } from "@/test-utils/global-state";
import { installTestDom } from "@/testDom";

const stubWidget =
  (name: string) =>
  ({ onRemove }: { onRemove?: () => void }) =>
    createElement(
      "div",
      { "data-widget": name },
      name,
      createElement("button", {
        "data-widget-remove": name,
        onClick: onRemove,
      }),
    );

const widgetModules = [
  ["./ScheduleWidget", "schedule"],
  ["./WeatherWidget", "weather"],
  ["./PinnedAppsWidget", "pinned-apps"],
  ["./NotepadWidget", "notepad"],
  ["./CountdownWidget", "countdown"],
  ["./CourseSelectionWidget", "course-selection"],
  ["./BusWidget", "bus"],
  ["./LibraryWidget", "library"],
  ["./LaundryWidget", "laundry"],
  ["./SportsVenuesWidget", "sports-venues"],
  ["./YouBikeWidget", "youbike"],
  ["./ShopsWidget", "shops"],
  ["./UpcomingEventsWidget", "upcoming-events"],
  ["./GradesWidget", "grades"],
  ["./AnnouncementsWidget", "announcements"],
] as const;

for (const [moduleName, widgetName] of widgetModules) {
  mock.module(moduleName, () => ({
    default: stubWidget(widgetName),
    ...(moduleName === "./CountdownWidget" ? { NextUpLine: () => null } : {}),
  }));
}

mock.module("@/dictionaries/useDictionary", () => ({
  default: () => zh,
}));

let WidgetGrid: typeof import("./WidgetGrid").default;
let activeDom: ReturnType<typeof installTestDom> | undefined;
let activeRoot: Root | undefined;

const installWidgetTestDom = () => {
  const restoreGlobals = captureGlobalState(["StorageEvent", "matchMedia"]);
  const installed = installTestDom("/zh/today");
  installed.dom.window.scrollTo = () => undefined;
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
  const dom = installWidgetTestDom();
  WidgetGrid = (await import("./WidgetGrid")).default;
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

const renderWidgetGrid = async (config: DashboardConfig) => {
  activeDom = installWidgetTestDom();
  window.localStorage.setItem("widget_config_v1", JSON.stringify(config));
  const container = document.createElement("div");
  document.body.appendChild(container);
  activeRoot = createRoot(container);
  await act(async () => {
    activeRoot!.render(createElement(WidgetGrid));
  });
  return container;
};

const allWidgetsDisabled: DashboardConfig = {
  ...DEFAULT_DASHBOARD_CONFIG,
  widgets: DEFAULT_DASHBOARD_CONFIG.widgets.map((widget) => ({
    ...widget,
    enabled: false,
  })),
};

describe("WidgetGrid management", () => {
  test.each([
    ["with widgets", DEFAULT_DASHBOARD_CONFIG, false],
    ["in the empty state", allWidgetsDisabled, true],
  ] as const)(
    "renders the management control %s without opening the drawer",
    async (_description, config, isEmpty) => {
      const container = await renderWidgetGrid(config);
      const manageButton = [...container.querySelectorAll("button")].find(
        (button) =>
          button.textContent ===
          zh.settings.calendar.widget_dashboard.manage_widgets,
      );

      expect(manageButton).not.toBeUndefined();
      expect(manageButton?.getAttribute("aria-expanded")).toBe("false");
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();

      if (isEmpty) {
        expect(container.textContent).toContain(
          zh.settings.calendar.widget_dashboard.empty,
        );
        expect(container.querySelector("[data-widget]")).toBeNull();
      } else {
        expect(container.querySelector("[data-widget]")).not.toBeNull();
      }
    },
  );
});
