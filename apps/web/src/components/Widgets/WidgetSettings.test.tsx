import { act, createElement, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import en from "@/dictionaries/en.json";
import { captureGlobalState } from "@/test-utils/global-state";
import { installTestDom } from "@/testDom";

const actualUseDictionary = await import("@/dictionaries/useDictionary");
const actualUsehooksTs = await import("usehooks-ts");

const useTestLocalStorage = (key: string, initial: unknown) => {
  const [value, setValue] = useState(() => {
    const saved = window.localStorage.getItem(key);
    return saved === null ? initial : JSON.parse(saved);
  });
  const update = (nextValue: unknown) => {
    const next =
      typeof nextValue === "function"
        ? (nextValue as (current: unknown) => unknown)(value)
        : nextValue;
    window.localStorage.setItem(key, JSON.stringify(next));
    setValue(next);
    window.dispatchEvent(new StorageEvent("local-storage", { key }));
  };
  useEffect(() => {
    const sync = (event: Event) => {
      if ((event as StorageEvent).key !== key) return;
      const saved = window.localStorage.getItem(key);
      setValue(saved === null ? initial : JSON.parse(saved));
    };
    window.addEventListener("local-storage", sync);
    return () => window.removeEventListener("local-storage", sync);
  }, [initial, key]);
  return [value, update] as const;
};

let widgetSettings: typeof import("./WidgetSettings");
let widgetSettingsRegistry: typeof import("./WidgetSettingsRegistry");
let useLocalStorageHook: (
  key: string,
  initial: unknown,
) => [unknown, (value: unknown) => void];
let activeDom: ReturnType<typeof installTestDom> | undefined;
let activeRoot: Root | undefined;

const TestConsumer = ({
  storageKey,
  initialValue,
}: {
  storageKey: string;
  initialValue: unknown;
}) => {
  const [value] = useLocalStorageHook(storageKey, initialValue);
  return createElement(
    "output",
    { "data-storage-key": storageKey },
    JSON.stringify(value),
  );
};

const installDom = () => {
  const restoreGlobals = captureGlobalState(["StorageEvent", "matchMedia"]);
  const installed = installTestDom("/en/today");
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
  const dom = installDom();
  mock.module("@/dictionaries/useDictionary", () => ({ default: () => en }));
  mock.module("usehooks-ts", () => ({ useLocalStorage: useTestLocalStorage }));
  useLocalStorageHook = (await import("usehooks-ts"))
    .useLocalStorage as typeof useLocalStorageHook;
  widgetSettings = await import("./WidgetSettings");
  widgetSettingsRegistry = await import("./WidgetSettingsRegistry");
  mock.module("@/dictionaries/useDictionary", () => actualUseDictionary);
  mock.module("usehooks-ts", () => actualUsehooksTs);
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

const render = async (children: ReactNode) => {
  activeDom = installDom();
  const container = document.createElement("div");
  document.body.appendChild(container);
  activeRoot = createRoot(container);
  await act(async () => activeRoot!.render(children));
  return container;
};

const changeInput = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    Simulate.change(input, { target: { value } });
  });
};

describe("widget settings registry", () => {
  test("declares settings only for configurable widgets", () => {
    expect(
      Object.keys(widgetSettingsRegistry.WIDGET_SETTINGS_REGISTRY).sort(),
    ).toEqual([
      "bus",
      "countdown",
      "laundry",
      "library",
      "shops",
      "sports-venues",
      "upcoming-events",
      "weather",
      "youbike",
    ]);
  });

  test("weather settings write the same preference key consumed by the widget", async () => {
    const container = await render(
      createElement(
        "div",
        null,
        createElement(widgetSettings.WeatherWidgetSettings),
        createElement(TestConsumer, {
          storageKey: "widget_weather_days",
          initialValue: 4,
        }),
      ),
    );
    const input = container.querySelector(
      'input[aria-label="Forecast days"]',
    ) as HTMLInputElement;
    await changeInput(input, "2");
    expect(
      JSON.parse(window.localStorage.getItem("widget_weather_days") ?? "null"),
    ).toBe(2);
    expect(container.querySelector("output")?.textContent).toBe("2");
  });

  test("countdown settings round-trip the label and date to the widget storage keys", async () => {
    const container = await render(
      createElement(
        "div",
        null,
        createElement(widgetSettings.CountdownWidgetSettings),
        createElement(TestConsumer, {
          storageKey: "widget_countdown_title",
          initialValue: "",
        }),
        createElement(TestConsumer, {
          storageKey: "widget_countdown_date",
          initialValue: "",
        }),
      ),
    );
    await changeInput(
      container.querySelector(
        'input[aria-label="Countdown label"]',
      ) as HTMLInputElement,
      "Final exam",
    );
    await changeInput(
      container.querySelector(
        'input[aria-label="Target date"]',
      ) as HTMLInputElement,
      "2026-12-20",
    );
    expect(
      JSON.parse(
        window.localStorage.getItem("widget_countdown_title") ?? "null",
      ),
    ).toBe("Final exam");
    expect(
      JSON.parse(
        window.localStorage.getItem("widget_countdown_date") ?? "null",
      ),
    ).toBe("2026-12-20");
    expect(
      Array.from(container.querySelectorAll("output")).map(
        (node) => node.textContent,
      ),
    ).toEqual(['"Final exam"', '"2026-12-20"']);
  });
});
