import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, mock, test } from "bun:test";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let showAcademicCalendar = true;
let calendarEvents = [
  {
    id: "future",
    date: "2026-11-20",
    summary: "115學年度第1學期加退選開始 Add-or-Drop Selection (11/20-11/22)",
  },
];

mock.module("@/config/api", () => ({
  default: {
    acacalendar: {
      $get: async () =>
        new Response(JSON.stringify(calendarEvents), { status: 200 }),
    },
  },
}));
mock.module("@/hooks/useTime", () => ({
  default: () => new Date("2026-10-09T00:00:00.000Z"),
}));
mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => ({ language: "en", showAcademicCalendar }),
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    alerts: { dismiss: "Dismiss" },
    common: { loading: "Loading" },
    course: {
      selection_period: {
        current: "Now",
        next: "Next",
        open_now: "Open now",
        opens_today: "Opens today",
        opens_in: "Opens in {days} days",
        phases: { "add-drop": "Add/drop" },
        audience: {
          "new-students": "New students",
          "inter-school": "Inter-school",
        },
      },
    },
  }),
}));
let activeDom: JSDOM | null = null;
afterEach(() => {
  activeDom?.window.localStorage.clear();
  activeDom?.window.close();
  activeDom = null;
  showAcademicCalendar = true;
  calendarEvents = [
    {
      id: "future",
      date: "2026-11-20",
      summary: "115學年度第1學期加退選開始 Add-or-Drop Selection (11/20-11/22)",
    },
  ];
});

describe("CourseSelectionStatus", () => {
  test("does not render when academic calendar is disabled", async () => {
    showAcademicCalendar = false;
    calendarEvents = [
      {
        id: "near-disabled",
        date: "2026-10-20",
        summary:
          "115學年度第1學期加退選開始 Add-or-Drop Selection (10/20-10/22)",
      },
    ];
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/courses",
    });
    activeDom = dom;
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      StorageEvent: dom.window.StorageEvent,
    });
    const { default: CourseSelectionStatus } = await import(
      "./CourseSelectionStatus"
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CourseSelectionStatus, { semester: "11510" }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (
        queryClient.getQueryState([
          "course-selection-periods",
          "2025-08-01",
          "2027-08-01",
        ])?.status === "success"
      ) {
        break;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(container.innerHTML).toBe("");
    await act(async () => root.unmount());
    queryClient.clear();
  });

  test("renders no markup when the next period is outside the 14-day window", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/courses",
    });
    activeDom = dom;
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      StorageEvent: dom.window.StorageEvent,
    });
    const { default: CourseSelectionStatus } = await import(
      "./CourseSelectionStatus"
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CourseSelectionStatus, { semester: "11510" }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(container.innerHTML).toBe("");
    await act(async () => root.unmount());
    queryClient.clear();
  });

  test("renders and dismisses a period within the banner window", async () => {
    calendarEvents = [
      {
        id: "near",
        date: "2026-10-20",
        summary:
          "115學年度第1學期加退選開始 Add-or-Drop Selection (10/20-10/22)",
      },
    ];
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/courses",
    });
    activeDom = dom;
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      StorageEvent: dom.window.StorageEvent,
    });
    const { default: CourseSelectionStatus } = await import(
      "./CourseSelectionStatus"
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CourseSelectionStatus, { semester: "11510" }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (container.querySelector('button[aria-label="Dismiss"]')) break;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    const dismissButton = container.querySelector(
      'button[aria-label="Dismiss"]',
    );
    expect(dismissButton).not.toBeNull();
    await act(async () => {
      dismissButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });
    expect(container.innerHTML).toBe("");

    await act(async () => root.unmount());
    queryClient.clear();
  });

  test("does not apply a dismissal to an open period", async () => {
    calendarEvents = [
      {
        id: "current",
        date: "2026-10-01",
        summary:
          "115學年度第1學期加退選開始 Add-or-Drop Selection (10/1-10/10)",
      },
    ];
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/courses",
    });
    activeDom = dom;
    dom.window.localStorage.setItem(
      "dismissed_course_selection_periods",
      JSON.stringify(["course-selection:current"]),
    );
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      StorageEvent: dom.window.StorageEvent,
    });
    const { default: CourseSelectionStatus } = await import(
      "./CourseSelectionStatus"
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CourseSelectionStatus, { semester: "11510" }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (container.textContent?.includes("Add/drop")) break;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(container.textContent).toContain("Add/drop");
    await act(async () => root.unmount());
    queryClient.clear();
  });

  test("prunes ended dismissals when writing a new dismissal", async () => {
    calendarEvents = [
      {
        id: "ended",
        date: "2026-09-01",
        summary: "115學年度第1學期加退選開始 Add-or-Drop Selection (9/1-9/5)",
      },
      {
        id: "near",
        date: "2026-10-20",
        summary:
          "115學年度第1學期加退選開始 Add-or-Drop Selection (10/20-10/22)",
      },
    ];
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/courses",
    });
    activeDom = dom;
    dom.window.localStorage.setItem(
      "dismissed_course_selection_periods",
      JSON.stringify(["course-selection:ended"]),
    );
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      StorageEvent: dom.window.StorageEvent,
    });
    const { default: CourseSelectionStatus } = await import(
      "./CourseSelectionStatus"
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CourseSelectionStatus, { semester: "11510" }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (container.querySelector('button[aria-label="Dismiss"]')) break;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    const dismissButton = container.querySelector(
      'button[aria-label="Dismiss"]',
    );
    expect(dismissButton).not.toBeNull();
    await act(async () => {
      dismissButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });

    expect(
      JSON.parse(
        dom.window.localStorage.getItem("dismissed_course_selection_periods") ??
          "[]",
      ),
    ).toEqual(["course-selection:near"]);
    await act(async () => root.unmount());
    queryClient.clear();
  });
});
