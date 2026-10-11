import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, mock, test } from "bun:test";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let busRequestCount = 0;

mock.module("@/libs/bus", () => ({
  getAllBusData: async () => {
    busRequestCount += 1;
    return {};
  },
}));
mock.module("@/hooks/useTime", () => ({
  default: () => new Date("2026-10-09T00:00:00.000Z"),
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({ bus: {} }),
}));
mock.module("@/features/bus/BusListingItem", () => ({
  BusListingItem: () => null,
}));

const { default: CampusBusSuggestion } = await import("./CampusBusSuggestion");

let activeDom: JSDOM | null = null;
let activeRoot: Root | null = null;

afterEach(async () => {
  await act(async () => activeRoot?.unmount());
  activeDom?.window.close();
  activeRoot = null;
  activeDom = null;
  busRequestCount = 0;
});

const renderSuggestion = async (events: readonly UpcomingEvent[]) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/en/today",
  });
  activeDom = dom;
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
  });

  const container = document.createElement("div");
  activeRoot = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    activeRoot!.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(CampusBusSuggestion, {
          events,
        }),
      ),
    );
    await Promise.resolve();
  });
};

describe("CampusBusSuggestion", () => {
  test("does not request bus data without an eligible class", async () => {
    await renderSuggestion([
      {
        id: "all-day",
        source: "class",
        title: "Holiday",
        start: new Date("2026-10-09T00:00:00.000Z"),
        end: new Date("2026-10-09T23:59:00.000Z"),
        allDay: true,
        state: "upcoming",
        startsInMinutes: 0,
      } as UpcomingEvent,
    ]);

    expect(busRequestCount).toBe(0);
  });
});
