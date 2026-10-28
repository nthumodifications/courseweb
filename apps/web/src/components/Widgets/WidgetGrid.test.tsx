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
    ...(moduleName === "./CountdownWidget"
      ? { NextUpLine: () => null }
      : {}),
  }));
}

mock.module("@/dictionaries/useDictionary", () => ({
  default: () => zh,
}));

let WidgetGrid: typeof import("./WidgetGrid").default;
let activeDom: ReturnType<typeof installTestDom> | undefined;
let activeRoot: Root | undefined;
let activeContainer: HTMLDivElement | undefined;

const installWidgetTestDom = (url: string) => {
  const restoreStorageEvent = captureGlobalState(["StorageEvent"]);
  const installed = installTestDom(url);
  Object.assign(globalThis, {
    StorageEvent: installed.dom.window.StorageEvent,
  });
  return {
    ...installed,
    restore: () => {
      restoreStorageEvent();
      installed.restore();
    },
  };
};

beforeAll(async () => {
  const dom = installWidgetTestDom("/zh/today");
  WidgetGrid = (await import("./WidgetGrid")).default;
  dom.restore();
});

afterEach(() => {
  act(() => activeRoot?.unmount());
  activeRoot = undefined;
  activeContainer = undefined;
  activeDom?.restore();
  activeDom = undefined;
});

const renderWidgetGrid = async (config?: DashboardConfig) => {
  activeDom = installWidgetTestDom("/zh/today");
  if (config) {
    window.localStorage.setItem("widget_config_v1", JSON.stringify(config));
  }
  activeContainer = document.createElement("div");
  document.body.appendChild(activeContainer);
  activeRoot = createRoot(activeContainer);
  await act(async () => {
    activeRoot!.render(createElement(WidgetGrid));
  });
  return activeContainer;
};

const allWidgetsDisabled: DashboardConfig = {
  ...DEFAULT_DASHBOARD_CONFIG,
  widgets: DEFAULT_DASHBOARD_CONFIG.widgets.map((widget) => ({
    ...widget,
    enabled: false,
  })),
};

describe("WidgetGrid management", () => {
  test("opens widget management and adds a widget from the panel", async () => {
    const container = await renderWidgetGrid();
    expect(container.querySelector('[data-widget="bus"]')).toBeNull();

    const manageButton = [...container.querySelectorAll("button")].find(
      (button) =>
        button.textContent ===
        zh.settings.calendar.widget_dashboard.manage_widgets,
    );
    expect(manageButton).not.toBeUndefined();

    await act(async () => {
      manageButton!.click();
      await import("./WidgetManagementPanel");
    });
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    const busSwitch = document.body.querySelector(
      `button[aria-label="${zh.settings.calendar.widget_dashboard.widget_options.bus.title}"]`,
    );
    expect(busSwitch).not.toBeNull();

    await act(async () => (busSwitch as HTMLButtonElement).click());
    expect(container.querySelector('[data-widget="bus"]')).not.toBeNull();

    await act(async () =>
      (
        container.querySelector(
          '[data-widget-remove="bus"]',
        ) as HTMLButtonElement
      ).click(),
    );
    expect(container.querySelector('[data-widget="bus"]')).toBeNull();
    expect(busSwitch.getAttribute("aria-checked")).toBe("false");
  });

  test("shows an empty state and keeps widget management available", async () => {
    const container = await renderWidgetGrid(allWidgetsDisabled);

    expect(container.textContent).toContain(
      zh.settings.calendar.widget_dashboard.empty,
    );
    expect(container.querySelector("[data-widget]")).toBeNull();
    expect(container.querySelector("p")?.className).toContain("col-span-full");
    expect(container.textContent).toContain(
      zh.settings.calendar.widget_dashboard.manage_widgets,
    );
  });
});
