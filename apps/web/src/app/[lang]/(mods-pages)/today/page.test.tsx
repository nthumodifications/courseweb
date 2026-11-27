import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { captureGlobalState } from "@/test-utils/global-state";
import { installTestDom } from "@/testDom";

mock.module("@/components/Widgets/WidgetGrid", () => ({
  default: () => createElement("div", { "data-testid": "widget-grid" }),
}));

const TodayPage = (await import("./page")).default;

let activeDom: ReturnType<typeof installTodayPageTestDom> | undefined;
let activeRoot: Root | undefined;

const installTodayPageTestDom = () => {
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

describe("today page", () => {
  test.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "renders the widget grid with legacy flags set to %j and %j",
    async (useWidgetDashboard, useNewCalendar) => {
      activeDom = installTodayPageTestDom();
      window.localStorage.setItem(
        "use_widget_dashboard",
        JSON.stringify(useWidgetDashboard),
      );
      window.localStorage.setItem(
        "use_new_calendar",
        JSON.stringify(useNewCalendar),
      );

      const container = document.createElement("div");
      document.body.appendChild(container);
      activeRoot = createRoot(container);

      await act(async () => {
        activeRoot!.render(createElement(TodayPage));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(container.querySelector('[data-testid="widget-grid"]')).not.toBe(
        null,
      );
    },
  );
});
