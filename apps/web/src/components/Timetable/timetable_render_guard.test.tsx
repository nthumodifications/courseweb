import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, mock, test } from "bun:test";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

mock.module("react-oidc-context", () => ({
  useAuth: () => ({ isAuthenticated: false, user: undefined }),
}));
mock.module("@/config/api", () => ({
  default: {
    course: {
      $get: async () => new Response("[]", { status: 200 }),
    },
  },
}));
mock.module("@/config/auth", () => ({ default: {} }));
mock.module("@/lib/gtag", () => ({ event: () => {} }));
mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => ({ language: "en" }),
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    course: {
      credits: "credits",
      details: { missing_time: "Missing time" },
      item: { add_to_semester: "Add to semester" },
    },
    timetable: {
      all_courses: "All courses",
      conflict: "Conflict",
      course: "course",
      course_data_error: "Course data failed",
      course_data_loading: "Loading course data",
      credits: "credits",
      display_settings: "Display settings",
      duplicate: "Duplicate",
      english_names: "English names",
      english_names_options: { add: "Add", replace: "Replace", hide: "Hide" },
      lock_order: "Lock order",
      no_courses: "No courses",
      reset_default: "Reset",
      select_display: "Select display",
      show_course_code: "Show code",
      show_credits: "Show credits",
      show_priority: "Show priority",
      show_venue: "Show venue",
      unresolved_courses: "{count} unresolved",
    },
  }),
}));
mock.module("react-router-dom", () => ({
  Link: ({ children }: { children: unknown }) => children,
  useLocation: () => ({ pathname: "/en/timetable" }),
  useNavigate: () => () => {},
  useParams: () => ({ lang: "en" }),
  useSearchParams: () => [new URLSearchParams(), () => {}],
}));

const { UserTimetableProvider } = await import(
  "@/hooks/contexts/useUserTimetable"
);
const { TimetableCourseList } = await import("./TimetableCourseList");

describe("timetable provider render stability", () => {
  test("settles when the provider and empty course list mount", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/zh/timetable",
    });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });

    let renderCount = 0;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <UserTimetableProvider>
            <RenderCount onRender={() => (renderCount += 1)} />
          </UserTimetableProvider>
        </QueryClientProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (container.textContent?.includes("No courses")) break;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(renderCount).toBeLessThan(30);
    expect(container.textContent).toContain("No courses");

    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    dom.window.close();
  });
});

const RenderCount = ({ onRender }: { onRender: () => void }) => {
  onRender();
  return <TimetableCourseList semester="11410" />;
};
