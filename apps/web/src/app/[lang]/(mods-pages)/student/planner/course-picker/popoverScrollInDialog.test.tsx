import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { InstantSearch } from "react-instantsearch";
import type { DOMWindow } from "jsdom";
import { installTestDom } from "@/testDom";
import zh from "@/dictionaries/zh.json";

// Radix picks a no-op layout effect when it is first imported without a
// document, and Portal only mounts from that effect. Bun shares modules across
// test files, so pin the real hook to make the popovers render in any order.
const { useLayoutEffect } = await import("react");
mock.module("@radix-ui/react-use-layout-effect", () => ({ useLayoutEffect }));
mock.module("@/dictionaries/useDictionary", () => ({ default: () => zh }));

// The dialog and the control popover come straight from Radix, the primitives
// `@courseweb/ui` wraps. Other test files mock `@courseweb/ui` (for example
// AccountSection.test.tsx swaps `Dialog` for a plain div), and Bun shares that
// module between files, so a Dialog imported from there may have no scroll
// lock and these tests would pass without the fix.
const DialogPrimitive = await import("@radix-ui/react-dialog");
const PopoverPrimitive = await import("@radix-ui/react-popover");
const { default: ExpandableFilter } = await import("./ExpandableFilter");
const { default: ExpandableClassFilter } = await import(
  "./ExpandableClassFilter"
);
const { popoverScrollInDialogProps } = await import("./popoverScrollInDialog");

const facets = {
  department: { "CS 資工系": 12, "EE 電機系": 8, "PHYS 物理系": 5 },
  for_class: { CS111B: 4, EE112B: 3 },
  semester: { "11410": 100 },
};

const searchClient = {
  search: async (requests: Array<{ indexName: string }>) => ({
    results: requests.map((request) => ({
      index: request.indexName,
      hits: [],
      nbHits: 0,
      page: 0,
      nbPages: 0,
      hitsPerPage: 20,
      processingTimeMS: 1,
      exhaustiveNbHits: true,
      query: "",
      params: "",
      facets,
    })),
  }),
  searchForFacetValues: async () => [],
};

let root: Root | undefined;
let restoreDom: (() => void) | undefined;
let previousResizeObserver: unknown;

afterEach(async () => {
  await act(async () => {
    root?.unmount();
    // Radix FocusScope dispatches its unmount event from a timeout; let it run
    // while this test's DOM is still installed.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  root = undefined;
  restoreDom?.();
  restoreDom = undefined;
  Object.assign(globalThis, { ResizeObserver: previousResizeObserver });
});

const waitFor = async <T,>(find: () => T | null | undefined): Promise<T> => {
  const deadline = performance.now() + 2000;
  for (;;) {
    const found = find();
    if (found) return found;
    if (performance.now() >= deadline) {
      throw new Error("Timed out waiting for the element");
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
};

/** Renders `children` inside an open Radix Dialog, like the timetable "Add" dialog. */
const renderInDialog = async (children: ReactElement) => {
  const installed = installTestDom("/zh/timetable");
  restoreDom = installed.restore;
  previousResizeObserver = (globalThis as { ResizeObserver?: unknown })
    .ResizeObserver;
  Object.assign(globalThis, {
    ResizeObserver: class {
      observe() {
        // Popper only needs the constructor in tests.
      }
      unobserve() {
        // Popper only needs the constructor in tests.
      }
      disconnect() {
        // Popper only needs the constructor in tests.
      }
    },
  });

  const document = installed.dom.window.document;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root!.render(
      createElement(
        InstantSearch,
        { searchClient: searchClient as never, indexName: "nthu_courses" },
        // Same structure as `DialogContent` in @courseweb/ui: the overlay holds
        // the scroll lock and the content is its only scrollable area.
        createElement(
          DialogPrimitive.Root,
          { open: true },
          createElement(
            DialogPrimitive.Portal,
            null,
            createElement(DialogPrimitive.Overlay),
            createElement(
              DialogPrimitive.Content,
              { "aria-describedby": undefined },
              createElement(DialogPrimitive.Title, null, "Filters"),
              children,
            ),
          ),
        ),
      ),
    );
  });

  return installed.dom.window;
};

const openFilter = async (window: DOMWindow) => {
  const trigger = await waitFor(() =>
    window.document.querySelector<HTMLButtonElement>(
      '[role="dialog"] button[aria-expanded="false"]',
    ),
  );
  await act(async () => trigger.click());
};

/** Fires a wheel event on the innermost element of the popover row containing `rowText`. */
const wheelOnPopoverList = async (window: DOMWindow, rowText: string) => {
  const row = await waitFor(() =>
    [
      ...window.document.querySelectorAll(
        "[data-radix-popper-content-wrapper] *",
      ),
    ].find(
      (element) =>
        element.children.length === 0 && element.textContent?.includes(rowText),
    ),
  );
  const event = new window.WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY: 120,
  });
  row.dispatchEvent(event);
  return event;
};

describe("filter popovers inside a Dialog (#1049)", () => {
  test("a portaled popover without the fix has its wheel events blocked", async () => {
    // Control: proves this environment reproduces the bug, so the tests below
    // are meaningful. If Radix stops blocking these events, this fails and
    // popoverScrollInDialogProps can be removed.
    const window = await renderInDialog(
      createElement(
        PopoverPrimitive.Root,
        { open: true },
        createElement(PopoverPrimitive.Trigger, null, "open"),
        createElement(
          PopoverPrimitive.Portal,
          null,
          createElement(
            PopoverPrimitive.Content,
            null,
            createElement("div", null, "row"),
          ),
        ),
      ),
    );

    const event = await wheelOnPopoverList(window, "row");
    expect(event.defaultPrevented).toBe(true);
  });

  test("ExpandableFilter's list receives wheel events", async () => {
    const window = await renderInDialog(
      createElement(ExpandableFilter, {
        attribute: "department",
        searchable: true,
        limit: 500,
      }),
    );
    await openFilter(window);

    const event = await wheelOnPopoverList(window, "(12)");
    expect(event.defaultPrevented).toBe(false);
  });

  test("ExpandableClassFilter's list receives wheel events", async () => {
    const window = await renderInDialog(
      createElement(ExpandableClassFilter, { limit: 20 }),
    );
    await openFilter(window);

    const event = await wheelOnPopoverList(window, "(4)");
    expect(event.defaultPrevented).toBe(false);
  });

  test("touchmove propagation is stopped as well", () => {
    const stopPropagation = mock(() => undefined);
    popoverScrollInDialogProps.onTouchMove({ stopPropagation } as never);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});
