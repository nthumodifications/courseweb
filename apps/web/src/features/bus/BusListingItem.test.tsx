import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  afterEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";

const navigate = mock(() => {});
const togglePin = mock(() => {});

const actualSettings = await import("@/hooks/contexts/settings");
const actualDictionary = await import("@/dictionaries/useDictionary");
const actualRouter = await import("react-router-dom");
const actualUi = await import("@courseweb/ui");
const actualIcons = await import("lucide-react");

mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => ({ language: "en" }),
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    bus: {
      departed: "Departed",
      departing: "Departing",
      minutes: "minutes",
      pin: "Pin",
      unpin: "Unpin",
      schedule: "Schedule",
      service_over: "Service over",
    },
  }),
}));
mock.module("react-router-dom", () => ({
  useNavigate: () => navigate,
}));
mock.module("@courseweb/ui", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));
mock.module("lucide-react", () => ({
  ChevronRight: () => null,
  Star: () => null,
  Timer: () => null,
}));

const { BusListingItem } = await import("./BusListingItem");

mock.module("@/hooks/contexts/settings", () => actualSettings);
mock.module("@/dictionaries/useDictionary", () => actualDictionary);
mock.module("react-router-dom", () => actualRouter);
mock.module("@courseweb/ui", () => actualUi);
mock.module("lucide-react", () => actualIcons);

let activeDom: JSDOM | null = null;
let activeRoot: Root | null = null;
const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "DocumentFragment",
  "MutationObserver",
  "ResizeObserver",
  "StorageEvent",
  "getComputedStyle",
  "IS_REACT_ACT_ENVIRONMENT",
]);

afterEach(async () => {
  await act(async () => activeRoot?.unmount());
  activeDom?.window.close();
  activeDom = null;
  activeRoot = null;
  navigate.mockClear();
  togglePin.mockClear();
  restoreGlobals();
});

describe("BusListingItem keyboard access", () => {
  test("Enter and Space trigger the same action as clicking the row", async () => {
    activeDom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/bus",
    });
    Object.assign(globalThis, {
      window: activeDom.window,
      document: activeDom.window.document,
      navigator: activeDom.window.navigator,
      HTMLElement: activeDom.window.HTMLElement,
      Element: activeDom.window.Element,
      Node: activeDom.window.Node,
      DocumentFragment: activeDom.window.DocumentFragment,
      MutationObserver: activeDom.window.MutationObserver,
      ResizeObserver: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
      StorageEvent: activeDom.window.StorageEvent,
      getComputedStyle: activeDom.window.getComputedStyle,
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    activeRoot = createRoot(container);

    await act(async () => {
      activeRoot!.render(
        createElement(BusListingItem, {
          tab: "all",
          startTime: "08:00",
          refTime: new Date("2026-10-09T00:00:00.000Z"),
          line: "main",
          direction: "north",
          title: "Main route",
          arrival: "09:00",
          pin: { kind: "campus", line: "red", direction: "up" },
          onTogglePin: togglePin,
        }),
      );
    });

    const row = container.querySelector('[role="button"]');
    expect(row).not.toBeNull();
    const clickableRow = row as HTMLDivElement;
    const pinButton = container.querySelector("button[aria-label=Pin]");
    expect(pinButton).not.toBeNull();

    await act(async () => {
      clickableRow.click();
      clickableRow.dispatchEvent(
        new activeDom!.window.KeyboardEvent("keydown", {
          bubbles: true,
          key: "Enter",
        }),
      );
      clickableRow.dispatchEvent(
        new activeDom!.window.KeyboardEvent("keydown", {
          bubbles: true,
          key: " ",
        }),
      );
      pinButton!.dispatchEvent(
        new activeDom!.window.KeyboardEvent("keydown", {
          bubbles: true,
          key: "Enter",
        }),
      );
    });

    expect(navigate).toHaveBeenCalledTimes(3);
    expect(navigate.mock.calls[1]).toEqual(navigate.mock.calls[0]);
    expect(navigate.mock.calls[2]).toEqual(navigate.mock.calls[0]);
    expect(togglePin).not.toHaveBeenCalled();
  });
});
