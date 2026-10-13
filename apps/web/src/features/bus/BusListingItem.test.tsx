import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, mock, test } from "bun:test";

const navigate = mock(() => {});

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

let activeDom: JSDOM | null = null;
let activeRoot: Root | null = null;
const previousGlobals = Object.fromEntries(
  ["window", "document", "navigator", "IS_REACT_ACT_ENVIRONMENT"].map(
    (key) => [key, (globalThis as Record<string, unknown>)[key]],
  ),
);

afterEach(async () => {
  await act(async () => activeRoot?.unmount());
  activeDom?.window.close();
  activeDom = null;
  activeRoot = null;
  navigate.mockClear();
  const globalObject = globalThis as Record<string, unknown>;
  for (const [key, value] of Object.entries(previousGlobals)) {
    if (value === undefined) delete globalObject[key];
    else globalObject[key] = value;
  }
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
        }),
      );
    });

    const row = container.querySelector('[role="button"]');
    expect(row).not.toBeNull();
    const clickableRow = row as HTMLDivElement;

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
    });

    expect(navigate).toHaveBeenCalledTimes(3);
    expect(navigate.mock.calls[1]).toEqual(navigate.mock.calls[0]);
    expect(navigate.mock.calls[2]).toEqual(navigate.mock.calls[0]);
  });
});
