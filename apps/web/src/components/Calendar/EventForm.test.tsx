import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, test } from "bun:test";
import { MemoryRouter } from "react-router-dom";
import {
  restoreBootstrapDom,
  restoreBootstrapEnvironment,
} from "./EventForm.test-setup";
import { EventForm } from "./EventForm";

restoreBootstrapDom();

let dom: JSDOM | undefined;
let root: ReturnType<typeof createRoot> | undefined;
let previousGlobals: Record<string, unknown> | undefined;

const globalKeys = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "Element",
  "Node",
  "NodeFilter",
  "DocumentFragment",
  "Event",
  "CustomEvent",
  "getComputedStyle",
  "MutationObserver",
  "ResizeObserver",
  "IS_REACT_ACT_ENVIRONMENT",
];

const installDom = (activeDom: JSDOM) => {
  Object.assign(globalThis, {
    window: activeDom.window,
    document: activeDom.window.document,
    navigator: activeDom.window.navigator,
    HTMLElement: activeDom.window.HTMLElement,
    HTMLInputElement: activeDom.window.HTMLInputElement,
    Element: activeDom.window.Element,
    Node: activeDom.window.Node,
    NodeFilter: activeDom.window.NodeFilter,
    DocumentFragment: activeDom.window.DocumentFragment,
    Event: activeDom.window.Event,
    CustomEvent: activeDom.window.CustomEvent,
    getComputedStyle: activeDom.window.getComputedStyle,
    MutationObserver: activeDom.window.MutationObserver,
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  });
};

const restoreGlobals = () => {
  if (!previousGlobals) return;
  const globalObject = globalThis as Record<string, unknown>;
  for (const key of globalKeys) {
    const value = previousGlobals[key];
    if (value === undefined) delete globalObject[key];
    else globalObject[key] = value;
  }
  previousGlobals = undefined;
};

afterEach(async () => {
  await act(async () => {
    root?.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  root = undefined;
  dom?.window.close();
  dom = undefined;
  restoreGlobals();
  restoreBootstrapEnvironment();
});

describe("calendar event repeat date", () => {
  test("changes the repeat end date from the calendar popover", async () => {
    dom = new JSDOM("<!doctype html><html><body></body></html>");
    const globalObject = globalThis as Record<string, unknown>;
    previousGlobals = Object.fromEntries(
      globalKeys.map((key) => [key, globalObject[key]]),
    );
    installDom(dom);
    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);
    const onEventAdded = (event: unknown) => {
      submittedEvent = event;
    };
    let submittedEvent: unknown;
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/zh/calendar"]}>
          <EventForm
            open
            defaultEvent={{
              id: "event-1",
              title: "Repeat event",
              allDay: true,
              start: new Date("2026-10-01T00:00:00+08:00"),
              end: new Date("2026-10-01T23:59:59+08:00"),
              repeat: {
                type: "daily",
                interval: 1,
                mode: "count",
                value: 3,
              },
              color: "#000000",
              tag: "Event",
            }}
            onSubmit={onEventAdded}
          />
        </MemoryRouter>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const dateModeLabel = document.querySelector<HTMLLabelElement>(
      'label[for="repeat-date"]',
    );
    expect(dateModeLabel).not.toBeNull();

    await act(async () => {
      dateModeLabel?.click();
    });

    expect(
      document
        .querySelector('[role="radio"][value="date"]')
        ?.getAttribute("aria-checked"),
    ).toBe("true");

    const repeatDateTrigger =
      document.querySelector<HTMLButtonElement>("#repeat-date-value");
    if (!repeatDateTrigger) throw new Error(document.body.innerHTML);
    expect(repeatDateTrigger).not.toBeNull();

    await act(async () => {
      repeatDateTrigger?.click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const calendar = document.querySelector<HTMLElement>(
      '[role="dialog"] [role="grid"]',
    );
    if (!calendar) throw new Error(document.body.innerHTML);
    expect(calendar).not.toBeNull();
    const dateButton = Array.from(
      calendar.querySelectorAll<HTMLButtonElement>('[role="gridcell"]'),
    ).find((button) => button.textContent === "10");
    expect(dateButton).not.toBeNull();

    await act(async () => {
      dateButton?.click();
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.click();
    });

    expect(submittedEvent).not.toBeUndefined();
    expect((submittedEvent as { repeat: { value: number } }).repeat.value).toBe(
      new Date("2026-10-10T00:00:00+08:00").getTime(),
    );
  });
});
