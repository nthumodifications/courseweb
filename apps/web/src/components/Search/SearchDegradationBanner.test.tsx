import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { installTestDom } from "@/testDom";
import type { ResilientSearchClient } from "@/lib/search-client";
import SearchDegradationBanner from "./SearchDegradationBanner";
import en from "@/dictionaries/en.json";
import zh from "@/dictionaries/zh.json";

let root: Root | undefined;
let restoreDom: (() => void) | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  restoreDom?.();
  restoreDom = undefined;
});

const renderBanner = (searchClient: ResilientSearchClient) => {
  const installed = installTestDom("/en/courses");
  restoreDom = installed.restore;
  const container = installed.dom.window.document.createElement("div");
  installed.dom.window.document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root!.render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/en/courses"] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: "/:lang/*",
            element: createElement(SearchDegradationBanner, { searchClient }),
          }),
        ),
      ),
    );
  });
  return container;
};

describe("SearchDegradationBanner", () => {
  test("shows an error and retries instead of the limited-mode message", async () => {
    const retry = mock(async () => undefined);
    const searchClient = {
      getStatus: () => "fallback",
      hasError: () => true,
      retry,
      subscribe: () => () => undefined,
    } as unknown as ResilientSearchClient;

    const container = renderBanner(searchClient);
    const loadErrors = [en.common.load_error, zh.common.load_error];
    const tryAgainLabels = [en.common.try_again, zh.common.try_again];
    const limitedModeLabels = [
      en.course.search.limited_mode,
      zh.course.search.limited_mode,
    ];

    expect(
      loadErrors.some((label) => container.textContent?.includes(label)),
    ).toBe(true);
    expect(
      tryAgainLabels.some((label) => container.textContent?.includes(label)),
    ).toBe(true);
    expect(
      limitedModeLabels.some((label) => container.textContent?.includes(label)),
    ).toBe(false);

    const button = [...container.querySelectorAll("button")].find((candidate) =>
      tryAgainLabels.includes(candidate.textContent ?? ""),
    );
    expect(button).toBeDefined();
    await act(async () => {
      button?.click();
    });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
