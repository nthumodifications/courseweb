import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import zh from "@/dictionaries/zh.json";
import { DEFAULT_DASHBOARD_CONFIG, type DashboardConfig } from "@/types/widget";
import { captureGlobalState } from "@/test-utils/global-state";
import { installTestDom } from "@/testDom";

const stubWidget = (name: string) => () =>
  createElement("div", { "data-widget": name }, name);

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
  mock.module(moduleName, () => ({ default: stubWidget(widgetName) }));
}

mock.module("@/dictionaries/useDictionary", () => ({
  default: () => zh,
}));

mock.module(
  "@/app/[lang]/(mods-pages)/student/planner/components/responsive-dialog",
  () => ({
    ResponsiveDialog: ({
      open,
      title,
      children,
    }: {
      open: boolean;
      title: ReactNode;
      children: ReactNode;
    }) =>
      open
        ? createElement(
            "div",
            { role: "dialog" },
            createElement("h2", null, title),
            children,
          )
        : null,
  }),
);

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

    await act(async () => manageButton!.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    const busSwitch = container.querySelector(
      `button[aria-label="${zh.settings.calendar.widget_dashboard.widget_options.bus.title}"]`,
    );
    expect(busSwitch).not.toBeNull();

    await act(async () => (busSwitch as HTMLButtonElement).click());
    expect(container.querySelector('[data-widget="bus"]')).not.toBeNull();
  });

  test("shows an empty state and keeps widget management available", async () => {
    const container = await renderWidgetGrid(allWidgetsDisabled);

    expect(container.textContent).toContain(
      zh.settings.calendar.widget_dashboard.empty,
    );
    expect(container.querySelector("[data-widget]")).toBeNull();
    expect(container.textContent).toContain(
      zh.settings.calendar.widget_dashboard.manage_widgets,
    );
  });
});
