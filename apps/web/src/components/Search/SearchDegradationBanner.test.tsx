import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Configure, InstantSearch } from "react-instantsearch";
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
          InstantSearch,
          {
            searchClient: searchClient as never,
            indexName: "nthu_courses",
          },
          createElement(Configure, { hitsPerPage: 1 }),
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: "/:lang/*",
              element: createElement(SearchDegradationBanner, {
                searchClient,
              }),
            }),
          ),
        ),
      ),
    );
  });
  return container;
};

describe("SearchDegradationBanner", () => {
  test("updates error copy when the client notifies without a status change", () => {
    let hasError = false;
    const listeners = new Set<() => void>();
    const retry = mock(async () => undefined);
    const searchClient = {
      search: mock(async () => ({ results: [] })),
      searchForFacetValues: mock(async () => []),
      getStatus: () => "fallback",
      hasError: () => hasError,
      retry,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as unknown as ResilientSearchClient;

    const container = renderBanner(searchClient);
    const loadErrors = [en.common.load_error, zh.common.load_error];
    const tryAgainLabels = [en.common.try_again, zh.common.try_again];
    const limitedModeLabels = [
      en.course.search.limited_mode,
      zh.course.search.limited_mode,
    ];

    expect(
      limitedModeLabels.some((label) => container.textContent?.includes(label)),
    ).toBe(true);
    expect(
      loadErrors.some((label) => container.textContent?.includes(label)),
    ).toBe(false);

    act(() => {
      hasError = true;
      listeners.forEach((listener) => listener());
    });

    expect(
      loadErrors.some((label) => container.textContent?.includes(label)),
    ).toBe(true);
    expect(
      tryAgainLabels.some((label) => container.textContent?.includes(label)),
    ).toBe(true);

    act(() => {
      hasError = false;
      listeners.forEach((listener) => listener());
    });

    expect(
      limitedModeLabels.some((label) => container.textContent?.includes(label)),
    ).toBe(true);
    expect(
      loadErrors.some((label) => container.textContent?.includes(label)),
    ).toBe(false);
  });

  test("refreshes InstantSearch on retry without clearing or using client retry", async () => {
    const retry = mock(async () => undefined);
    const clear = mock(() => undefined);
    const search = mock(async () => ({ results: [] }));
    const searchClient = {
      search,
      searchForFacetValues: mock(async () => []),
      getStatus: () => "fallback",
      hasError: () => true,
      retry,
      clear,
      subscribe: () => () => undefined,
    } as unknown as ResilientSearchClient;

    const container = renderBanner(searchClient);
    const tryAgainLabels = [en.common.try_again, zh.common.try_again];

    const button = [...container.querySelectorAll("button")].find((candidate) =>
      tryAgainLabels.includes(candidate.textContent ?? ""),
    );
    expect(button).toBeDefined();
    const searchesBeforeRetry = search.mock.calls.length;
    await act(async () => {
      button?.click();
    });
    expect(search.mock.calls.length).toBeGreaterThan(searchesBeforeRetry);
    expect(retry).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
});
