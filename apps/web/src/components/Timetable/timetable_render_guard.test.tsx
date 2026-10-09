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

const moduleDom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/zh/timetable",
});
Object.assign(globalThis, {
  window: moduleDom.window,
  document: moduleDom.window.document,
  navigator: moduleDom.window.navigator,
  StorageEvent: moduleDom.window.StorageEvent,
});

const { UserTimetableProvider, default: useUserTimetable } = await import(
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

  test("prunes hidden courses when loading and removing timetable courses", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/zh/timetable",
    });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });
    window.localStorage.setItem(
      "nthumods-storage-anonymous-courses",
      JSON.stringify({
        value: { "11410": ["11410-A", "11410-B"] },
        lastModified: 1,
        updatedAt: 1,
        deviceId: "test",
      }),
    );
    window.localStorage.setItem(
      "nthumods-storage-anonymous-timetable_display_preferences",
      JSON.stringify({
        value: { hiddenCourses: { "11410-A": true, "11410-gone": true } },
        lastModified: 1,
        updatedAt: 1,
        deviceId: "test",
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const settle = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (
          container.querySelector("output")?.textContent?.includes("11410-A")
        ) {
          return;
        }
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        });
      }
    };

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <UserTimetableProvider>
            <TimetableStateProbe />
          </UserTimetableProvider>
        </QueryClientProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await settle();

    expect(container.querySelector("output")?.textContent).toContain(
      '"hiddenCourses":{"11410-A":true}',
    );
    expect(
      JSON.parse(
        window.localStorage.getItem(
          "nthumods-storage-anonymous-timetable_display_preferences",
        )!,
      ).value.hiddenCourses,
    ).toEqual({ "11410-A": true });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("#delete-course")?.click();
    });
    await settle();
    expect(container.querySelector("output")?.textContent).toContain(
      '"hiddenCourses":{}',
    );
    expect(
      JSON.parse(
        window.localStorage.getItem(
          "nthumods-storage-anonymous-timetable_display_preferences",
        )!,
      ).value.hiddenCourses,
    ).toEqual({});

    await act(async () => {
      container.querySelector<HTMLButtonElement>("#hide-course")?.click();
      container.querySelector<HTMLButtonElement>("#replace-courses")?.click();
    });
    await settle();
    expect(container.querySelector("output")?.textContent).toContain(
      '"hiddenCourses":{}',
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("#clear-courses")?.click();
    });
    await settle();
    expect(container.querySelector("output")?.textContent).toContain(
      '"hiddenCourses":{}',
    );

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

const TimetableStateProbe = () => {
  const {
    courses,
    preferences,
    deleteCourse,
    clearCourses,
    setCourses,
    setPreferences,
  } = useUserTimetable();

  return (
    <>
      <output>
        {JSON.stringify({ courses, hiddenCourses: preferences.hiddenCourses })}
      </output>
      <button id="delete-course" onClick={() => deleteCourse("11410-A")} />
      <button
        id="hide-course"
        onClick={() =>
          setPreferences((previous) => ({
            ...previous,
            hiddenCourses: { "11410-B": true },
          }))
        }
      />
      <button
        id="replace-courses"
        onClick={() => setCourses({ "11410": ["11410-A"] })}
      />
      <button id="clear-courses" onClick={clearCourses} />
    </>
  );
};
