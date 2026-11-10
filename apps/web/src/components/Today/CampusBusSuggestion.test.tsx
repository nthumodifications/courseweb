import { act, createElement, type FC, type SVGProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { fromZonedTime } from "date-fns-tz";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";
import type { BusListingItemProps } from "@/features/bus/BusListingItem";
import type { CompleteBusData, NandaBusDepartureDetails } from "@/libs/bus";
import zh from "@/dictionaries/zh.json";
import { captureGlobalState } from "@/test-utils/global-state";

const TEST_NOW = new Date("2026-10-09T08:00:00+08:00");
const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "IS_REACT_ACT_ENVIRONMENT",
]);
const actualDictionary = await import("@/dictionaries/useDictionary");
const actualSettings = await import("@/hooks/contexts/settings");
const actualBusListingItem = await import("@/features/bus/BusListingItem");

let homeCampus: "none" | "main" | "nanda" = "none";
let renderedBusProps: BusListingItemProps | null = null;

const applyTestMocks = () => {
  mock.module("@/dictionaries/useDictionary", () => ({
    default: () => zh,
  }));
  mock.module("@/hooks/contexts/settings", () => ({
    useSettings: () => ({ homeCampus, language: "zh" }),
  }));
  mock.module("@/features/bus/BusListingItem", () => ({
    BusListingItem: (props: BusListingItemProps) => {
      renderedBusProps = props;
      const Icon = props.Icon as FC<SVGProps<SVGSVGElement>> | undefined;
      return createElement(
        "div",
        { "data-testid": "bus-listing-item" },
        Icon ? createElement(Icon, { "data-testid": "bus-line-icon" }) : null,
        createElement("span", null, props.title),
        createElement("span", null, props.destination),
        ...(props.notes ?? []).map((note) =>
          createElement("span", { key: note }, note),
        ),
        createElement("span", null, props.arrival),
      );
    },
  }));
};

applyTestMocks();
const { default: CampusBusSuggestion } = await import("./CampusBusSuggestion");

let activeDom: JSDOM | null = null;
let activeRoot: Root | null = null;

const bus = (
  time: string,
  type: "route1" | "route2",
): NandaBusDepartureDetails => ({
  time,
  description: "",
  route: "南大區間車",
  type,
});

const routeInfo = (direction: string, duration: string, route: string) => ({
  direction,
  duration,
  route,
  routeEN: route,
});

const createBusData = (
  towardSouthCampus: NandaBusDepartureDetails[] = [],
  towardMainCampus: NandaBusDepartureDetails[] = [],
): CompleteBusData => ({
  main: {
    toward_TSMC_building_info: routeInfo("toward TSMC", "15 minutes", "bus"),
    toward_main_gate_info: routeInfo("toward gate", "15 minutes", "bus"),
    weekday: { toward_TSMC_building: [], toward_main_gate: [] },
    weekend: { toward_TSMC_building: [], toward_main_gate: [] },
  },
  nanda: {
    toward_south_campus_info: routeInfo(
      "toward Nanda",
      "20 minutes",
      "shuttle",
    ),
    toward_main_campus_info: routeInfo("toward main", "20 minutes", "shuttle"),
    weekday: {
      toward_south_campus: towardSouthCampus,
      toward_main_campus: towardMainCampus,
    },
    weekend: { toward_south_campus: [], toward_main_campus: [] },
  },
});

const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, "Asia/Taipei");

const MAIN = "GEN II綜二101";
const classEvent = (
  id: string,
  title: string,
  venue: string,
  start: string,
  end?: string,
) =>
  ({
    id,
    source: "class",
    title,
    start: taipeiDate(`2026-10-09T${start}`),
    end: end ? taipeiDate(`2026-10-09T${end}`) : undefined,
    location: venue,
    allDay: false,
    state: "upcoming",
    startsInMinutes: 0,
  }) as UpcomingEvent;

beforeEach(() => {
  setSystemTime(TEST_NOW);
  homeCampus = "none";
  renderedBusProps = null;
  applyTestMocks();
});

afterEach(async () => {
  await act(async () => activeRoot?.unmount());
  activeDom?.window.close();
  activeRoot = null;
  activeDom = null;
  setSystemTime();
  restoreGlobals();
  mock.module("@/dictionaries/useDictionary", () => actualDictionary);
  mock.module("@/hooks/contexts/settings", () => actualSettings);
  mock.module("@/features/bus/BusListingItem", () => actualBusListingItem);
});

const renderSuggestion = async (
  events: readonly UpcomingEvent[],
  data = createBusData(),
) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/zh/today",
  });
  activeDom = dom;
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const container = document.createElement("div");
  document.body.append(container);
  activeRoot = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (events.some((event) => event.source === "class" && !event.allDay)) {
    queryClient.setQueryData(["all_bus_data"], data);
  }

  await act(async () => {
    activeRoot!.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(CampusBusSuggestion, { events }),
      ),
    );
  });

  return { container, queryClient };
};

describe("CampusBusSuggestion", () => {
  test("does not fetch bus data without an eligible class", async () => {
    const { queryClient } = await renderSuggestion([
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

    expect(queryClient.getQueryState(["all_bus_data"])?.fetchStatus).toBe(
      "idle",
    );
    expect(queryClient.getQueryData(["all_bus_data"])).toBeUndefined();
  });

  test("renders the next-class row and all transfer statuses without duplicating its trip", async () => {
    const { container } = await renderSuggestion(
      [
        classEvent("a", "First", MAIN, "07:00", "07:50"),
        classEvent("b", "Next", "Nanda南大N404", "09:00", "09:50"),
        classEvent("c", "Third", MAIN, "10:00", "10:50"),
        classEvent("d", "Fourth", "Nanda南大N101", "12:00", "12:50"),
        classEvent("e", "Fifth", MAIN, "13:30", "14:20"),
      ],
      createBusData(
        [bus("08:30", "route1"), bus("11:30", "route1")],
        [bus("10:00", "route2")],
      ),
    );

    const busRow = container.querySelector('[data-testid="bus-listing-item"]');
    expect(busRow).not.toBeNull();
    expect(
      container.querySelector('[data-testid="bus-line-icon"]'),
    ).not.toBeNull();
    expect(busRow?.textContent).toContain("下堂課：Next");
    expect(busRow?.textContent).toContain("上課地點：Nanda南大N404");
    expect(busRow?.textContent).toContain("經台積館");
    expect(busRow?.textContent).toContain("往南大校區");
    expect(busRow?.textContent).toContain("請於 08:30 前出發");
    expect(renderedBusProps?.arrival).toBe("請於 08:30 前出發");

    const status = container.querySelector('[role="status"]');
    expect(status?.children).toHaveLength(3);
    expect(status?.textContent).toContain(
      "校區轉乘：南大校區 → 校本部 — 時間太短，沒有任何校園公車能趕上。",
    );
    expect(status?.textContent).toContain(
      "校區轉乘：校本部 → 南大校區 — 請於 11:30 搭乘經台積館（預計 11:50 抵達）。",
    );
    expect(status?.textContent).toContain(
      "校區轉乘：南大校區 → 校本部 — 這段轉乘已沒有可用的校園公車班次。",
    );
    expect(status?.textContent).not.toContain(
      "校區轉乘：校本部 → 南大校區 — 請於 08:30 搭乘經台積館",
    );
  });

  test.each([
    {
      name: "the next inter-campus trip has no bus",
      home: "none" as const,
      firstEnd: "07:50",
    },
    {
      name: "a previous class has no departure",
      home: "main" as const,
      firstEnd: undefined,
    },
  ])("shows one muted no-bus line when $name", async ({ home, firstEnd }) => {
    homeCampus = home;
    const { container } = await renderSuggestion([
      classEvent("a", "First", MAIN, "07:00", firstEnd),
      classEvent("b", "Next", "Nanda南大N404", "09:00", "09:50"),
    ]);

    const status = container.querySelector('[role="status"]');
    expect(status?.children).toHaveLength(1);
    expect(status?.textContent).toBe(
      "校區轉乘：校本部 → 南大校區 — 這段轉乘已沒有可用的校園公車班次。",
    );
    expect(
      container.querySelector('[data-testid="bus-listing-item"]'),
    ).toBeNull();
  });
});
