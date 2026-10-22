import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, mock, test } from "bun:test";
import zh from "@/dictionaries/zh.json";
import { captureGlobalState } from "@/test-utils/global-state";
import {
  Bike,
  BookOpen,
  Bus,
  Calendar,
  Cloud,
  Dumbbell,
  LayoutGrid,
  Megaphone,
  Store,
  Timer,
  WashingMachine,
} from "lucide-react";

const previousDictionary = await import("@/dictionaries/useDictionary");
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => zh,
}));
const { WidgetErrorBoundary, getWidgetIcon } = await import(
  "./WidgetErrorBoundary"
);

const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "IS_REACT_ACT_ENVIRONMENT",
]);
const originalConsoleError = console.error;
let activeDom: JSDOM | null = null;
let activeRoot: ReturnType<typeof createRoot> | null = null;

const ThrowingWidget = () => {
  throw new Error("widget render failed");
};

const renderBoundary = (
  widgetId: string,
  child: React.ReactNode,
  widgetType: Parameters<typeof getWidgetIcon>[0] = "weather",
) =>
  activeRoot!.render(
    createElement(
      WidgetErrorBoundary,
      {
        widgetId,
        widgetType,
        onRemove: removeWidget,
        dragHandleProps: {},
        isDragging: false,
      },
      child,
    ),
  );

const removeWidget = mock(() => {});
const siblingAction = mock(() => {});

afterEach(() => {
  activeRoot?.unmount();
  activeRoot = null;
  activeDom?.window.close();
  activeDom = null;
  console.error = originalConsoleError;
  restoreGlobals();
  removeWidget.mockClear();
  siblingAction.mockClear();
  mock.module("@/dictionaries/useDictionary", () => previousDictionary);
});

const setup = () => {
  activeDom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/zh/",
  });
  Object.assign(globalThis, {
    window: activeDom.window,
    document: activeDom.window.document,
    navigator: activeDom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  console.error = () => {};
  const container = document.createElement("div");
  activeRoot = createRoot(container);
  return container;
};

describe("WidgetErrorBoundary", () => {
  test("isolates a rendering failure and keeps the sibling removable", () => {
    const container = setup();

    act(() => {
      activeRoot!.render(
        createElement(
          "div",
          null,
          createElement(
            WidgetErrorBoundary,
            {
              widgetId: "weather-1",
              widgetType: "weather",
              onRemove: removeWidget,
              dragHandleProps: {},
              isDragging: false,
            },
            createElement(ThrowingWidget),
          ),
          createElement(
            "button",
            { id: "sibling", onClick: siblingAction },
            "Sibling widget",
          ),
        ),
      );
    });

    expect(container.querySelector("#sibling")?.textContent).toBe(
      "Sibling widget",
    );
    act(() =>
      (container.querySelector("#sibling") as HTMLButtonElement).click(),
    );
    expect(siblingAction).toHaveBeenCalledTimes(1);
    const removeButton = container.querySelector(
      'button[aria-label="移除小工具"]',
    ) as HTMLButtonElement | null;
    expect(removeButton).not.toBeNull();

    act(() => removeButton!.click());
    expect(removeWidget).toHaveBeenCalledTimes(1);
  });

  test("uses each widget type's title and icon in its fallback shell", () => {
    const container = setup();

    const cases = [
      ["schedule", Calendar, zh.today.schedule_title],
      ["weather", Cloud, zh.settings.calendar.widget_dashboard.weather.title],
      ["pinned-apps", LayoutGrid, zh.applist.quick_links_title],
      [
        "notepad",
        undefined,
        zh.settings.calendar.widget_dashboard.widget_options.notepad.title,
      ],
      ["countdown", Timer, zh.today.countdown.title],
      ["course-selection", undefined, zh.course.selection_period.title],
      ["bus", Bus, zh.bus.campus_widget_title],
      [
        "library",
        BookOpen,
        zh.settings.calendar.widget_dashboard.widget_options.library.title,
      ],
      [
        "laundry",
        WashingMachine,
        zh.settings.calendar.widget_dashboard.widget_options.laundry.title,
      ],
      [
        "sports-venues",
        Dumbbell,
        zh.settings.calendar.widget_dashboard.widget_options["sports-venues"]
          .title,
      ],
      [
        "youbike",
        Bike,
        zh.settings.calendar.widget_dashboard.widget_options.youbike.title,
      ],
      [
        "shops",
        Store,
        zh.settings.calendar.widget_dashboard.widget_options.shops.title,
      ],
      [
        "upcoming-events",
        Calendar,
        zh.settings.calendar.widget_dashboard.widget_options["upcoming-events"]
          .title,
      ],
      [
        "grades",
        BookOpen,
        zh.settings.calendar.widget_dashboard.widget_options.grades.title,
      ],
      [
        "announcements",
        Megaphone,
        zh.settings.calendar.widget_dashboard.widget_options.announcements
          .title,
      ],
    ] as const;

    for (const [widgetType, icon, title] of cases) {
      act(() => {
        renderBoundary(
          `${widgetType}-1`,
          createElement(ThrowingWidget),
          widgetType,
        );
      });

      expect(container.querySelector("h3")?.textContent).toBe(title);
      expect(getWidgetIcon(widgetType)).toBe(icon);
      if (icon) {
        expect(container.querySelector("svg.mb-2")).not.toBeNull();
      } else {
        expect(container.querySelector("svg.mb-2")).toBeNull();
      }
    }
  });

  test("keeps the shell removable for an unknown widget type", () => {
    const container = setup();

    act(() => {
      renderBoundary(
        "corrupted-1",
        createElement(ThrowingWidget),
        "corrupted" as never,
      );
    });

    expect(container.querySelector("h3")).not.toBeNull();
    const removeButton = container.querySelector(
      'button[aria-label="移除小工具"]',
    ) as HTMLButtonElement | null;
    expect(removeButton).not.toBeNull();
    act(() => removeButton!.click());
    expect(removeWidget).toHaveBeenCalledTimes(1);
  });

  test("resets the fallback when the widget id changes", () => {
    const container = setup();

    act(() => {
      renderBoundary("weather-1", createElement(ThrowingWidget));
    });
    expect(container.textContent).toContain(zh.common.load_error);

    act(() => {
      renderBoundary(
        "weather-2",
        createElement("span", { id: "recovered" }, "Recovered widget"),
      );
    });

    expect(container.querySelector("#recovered")?.textContent).toBe(
      "Recovered widget",
    );
  });
});
