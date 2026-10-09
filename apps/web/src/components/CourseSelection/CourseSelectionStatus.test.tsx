import {
  act,
  createElement,
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let showAcademicCalendar = true;
const addDropEvent = (
  id: string,
  date: string,
  summary: string,
  startDate: string,
  endDate: string,
) => ({
  id,
  date,
  summary,
  courseSelectionPeriod: {
    id: `course-selection:${id}`,
    semester: "11510",
    phase: "add-drop" as const,
    audience: "unspecified" as const,
    startDate,
    endDate,
    sourceEventId: id,
    sourceSummary: summary,
  },
});

let calendarEvents = [
  addDropEvent(
    "future",
    "2026-11-20",
    "115學年度第1學期加退選開始 Add-or-Drop Selection (11/20-11/22)",
    "2026-11-20",
    "2026-11-22",
  ),
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

const actualUsehooksTs = await import("usehooks-ts");
const useTestLocalStorage = <T,>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return initialValue;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return initialValue;
    }
  });
  const setStoredValue = useCallback<Dispatch<SetStateAction<T>>>(
    (nextValue) => {
      setValue((previousValue) => {
        const next =
          typeof nextValue === "function"
            ? (nextValue as (previous: T) => T)(previousValue)
            : nextValue;
        window.localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );
  return [value, setStoredValue];
};

mock.module("usehooks-ts", () => ({
  ...actualUsehooksTs,
  useLocalStorage: useTestLocalStorage,
}));

const { default: CourseSelectionStatus } = await import(
  "./CourseSelectionStatus"
);

let activeDom: JSDOM | null = null;
afterEach(() => {
  activeDom?.window.localStorage.clear();
  activeDom = null;
  showAcademicCalendar = true;
  calendarEvents = [
    addDropEvent(
      "future",
      "2026-11-20",
      "115學年度第1學期加退選開始 Add-or-Drop Selection (11/20-11/22)",
      "2026-11-20",
      "2026-11-22",
    ),
  ];
});

afterAll(() => {
  mock.module("usehooks-ts", () => actualUsehooksTs);
});

const createTestDom = (dismissedPeriodIds: string[] = []) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/en/courses",
  });
  activeDom = dom;
  if (dismissedPeriodIds.length > 0) {
    dom.window.localStorage.setItem(
      "dismissed_course_selection_periods",
      JSON.stringify(dismissedPeriodIds),
    );
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    StorageEvent: dom.window.StorageEvent,
  });
  return dom;
};

const renderStatus = async () => {
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

  return { container, queryClient, root };
};

const waitFor = async (predicate: () => boolean) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (predicate()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
};

const cleanupStatus = async ({
  root,
  queryClient,
}: Awaited<ReturnType<typeof renderStatus>>) => {
  await act(async () => root.unmount());
  queryClient.clear();
};

describe("CourseSelectionStatus", () => {
  test("does not render when academic calendar is disabled", async () => {
    showAcademicCalendar = false;
    calendarEvents = [
      addDropEvent(
        "near-disabled",
        "2026-10-20",
        "115學年度第1學期加退選開始 Add-or-Drop Selection (10/20-10/22)",
        "2026-10-20",
        "2026-10-22",
      ),
    ];
    createTestDom();
    const rendered = await renderStatus();
    await waitFor(
      () =>
        rendered.queryClient.getQueryState([
          "course-selection-periods",
          "2025-08-01",
          "2027-08-01",
        ])?.status === "success",
    );

    expect(rendered.container.innerHTML).toBe("");
    await cleanupStatus(rendered);
  });

  test("renders no markup when the next period is outside the 14-day window", async () => {
    createTestDom();
    const rendered = await renderStatus();
    await waitFor(() => rendered.container.innerHTML === "");

    expect(rendered.container.innerHTML).toBe("");
    await cleanupStatus(rendered);
  });

  test("renders and dismisses a period within the banner window", async () => {
    calendarEvents = [
      addDropEvent(
        "near",
        "2026-10-20",
        "115學年度第1學期加退選開始 Add-or-Drop Selection (10/20-10/22)",
        "2026-10-20",
        "2026-10-22",
      ),
    ];
    const dom = createTestDom();
    const rendered = await renderStatus();
    await waitFor(() =>
      Boolean(rendered.container.querySelector('button[aria-label="Dismiss"]')),
    );

    const dismissButton = rendered.container.querySelector(
      'button[aria-label="Dismiss"]',
    );
    expect(dismissButton).not.toBeNull();
    await act(async () => {
      dismissButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });
    expect(rendered.container.innerHTML).toBe("");

    await cleanupStatus(rendered);
  });

  test("does not apply a dismissal to an open period", async () => {
    calendarEvents = [
      addDropEvent(
        "current",
        "2026-10-01",
        "115學年度第1學期加退選開始 Add-or-Drop Selection (10/1-10/10)",
        "2026-10-01",
        "2026-10-10",
      ),
    ];
    createTestDom(["course-selection:current"]);
    const rendered = await renderStatus();
    await waitFor(() => rendered.container.textContent?.includes("Add/drop"));

    expect(rendered.container.textContent).toContain("Add/drop");
    await cleanupStatus(rendered);
  });

  test("prunes ended dismissals when writing a new dismissal", async () => {
    calendarEvents = [
      addDropEvent(
        "ended",
        "2026-09-01",
        "115學年度第1學期加退選開始 Add-or-Drop Selection (9/1-9/5)",
        "2026-09-01",
        "2026-09-05",
      ),
      addDropEvent(
        "near",
        "2026-10-20",
        "115學年度第1學期加退選開始 Add-or-Drop Selection (10/20-10/22)",
        "2026-10-20",
        "2026-10-22",
      ),
    ];
    const dom = createTestDom(["course-selection:ended"]);
    const rendered = await renderStatus();
    await waitFor(() =>
      Boolean(rendered.container.querySelector('button[aria-label="Dismiss"]')),
    );

    const dismissButton = rendered.container.querySelector(
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
    await cleanupStatus(rendered);
  });
});
