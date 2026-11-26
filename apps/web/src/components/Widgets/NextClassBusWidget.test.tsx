import { createElement, type FC } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, mock, test } from "bun:test";
import en from "@/dictionaries/en.json";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";
import type { BusListingItemProps } from "@/features/bus/BusListingItem";
import {
  bus,
  busData,
  classAt,
  taipeiDate,
} from "@/helpers/campusBusSuggestion.fixtures";

const now = taipeiDate("2026-10-08T08:00");
const firstClass = classAt(
  "GEN II綜二101",
  "2026-10-08T07:00",
  "2026-10-08T07:50",
  "first",
);
const nextClass = classAt(
  "Nanda南大N404",
  "2026-10-08T09:00",
  "2026-10-08T09:50",
  "next",
);
const fixtureEvents = [firstClass, nextClass].map(
  (event): UpcomingEvent => ({
    id: event.id,
    source: "class",
    title: event.title === "next" ? "Next" : "First",
    start: event.start,
    end: event.end!,
    location: event.venue,
    allDay: false,
    state: event.id === "first" ? "past" : "upcoming",
    startsInMinutes: 0,
  }),
);

mock.module("@/dictionaries/useDictionary", () => ({
  default: () => en,
}));
mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => ({ homeCampus: "none", language: "en" }),
}));
mock.module("@/hooks/useTime", () => ({ default: () => now }));
mock.module("@/hooks/useUpcomingEvents", () => ({
  default: () => ({ events: fixtureEvents }),
}));
mock.module("@/features/bus/BusListingItem", () => ({
  BusListingItem: ((props: BusListingItemProps) =>
    createElement(
      "div",
      { "data-testid": "suggested-bus" },
      props.title,
      ...(props.notes ?? []),
      props.arrival,
    )) as FC<BusListingItemProps>,
}));

const { default: NextClassBusWidget } = await import("./NextClassBusWidget");

describe("NextClassBusWidget", () => {
  test("renders a timetable-based bus suggestion from the shared fixtures", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(
      ["all_bus_data"],
      busData([bus("08:20", "route1")]),
    );

    const markup = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(NextClassBusWidget),
      ),
    );

    expect(markup).toContain("Bus to next class");
    expect(markup).toContain("Next class: Next");
    expect(markup).toContain("Venue: Nanda南大N404");
    expect(markup).toContain("Leave by 08:20");
  });
});
