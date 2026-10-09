import {
  act,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, mock, test } from "bun:test";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

mock.module("react-oidc-context", () => ({
  useAuth: () => ({ isAuthenticated: false, user: undefined }),
}));
let courseResponseData: unknown[] = [];
mock.module("@/config/api", () => ({
  default: {
    course: {
      $get: async () =>
        new Response(JSON.stringify(courseResponseData), { status: 200 }),
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
      details: {
        favourite_unavailable: "Unavailable",
        missing_time: "Missing time",
        note_prefix: "Note: ",
        prerequisites_available: "Prerequisites available",
        restriction_prefix: "Restriction: ",
        taken: "Taken",
      },
      item: { add_to_semester: "Add to semester" },
      tags: {
        chinese: "Chinese",
        enrolled_suffix: "enrolled",
        english: "English",
        sixteen_weeks: "16 weeks",
        eighteen_weeks: "18 weeks",
        general_education: "general education",
        general_education_core: "general education core",
        people: "people",
        reserve_prefix: "reserve",
        x_class: "X-Class",
      },
    },
    timetable: {
      all_courses: "All courses",
      conflict: "Conflict",
      course: "course",
      course_actions: {
        hide_course: "Hide course",
        show_course: "Show course",
      },
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

const useTestLocalStorage = <T,>(
  key: string,
  initialValue: T,
): [T, (next: T | ((previous: T) => T)) => void] => {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const read = () => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return initialValueRef.current;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValueRef.current;
    }
  };
  const [value, setValue] = useState(read);
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const nextValue =
        typeof next === "function"
          ? (next as (previous: T) => T)(read())
          : next;
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      setValue(nextValue);
      window.dispatchEvent(new StorageEvent("local-storage", { key }));
    },
    [key],
  );
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== key) return;
      setValue(read());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("local-storage", handleStorage);
    setValue(read());
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local-storage", handleStorage);
    };
  }, [key]);
  return [value, update];
};

mock.module("usehooks-ts", () => ({
  useLocalStorage: useTestLocalStorage,
  useMediaQuery: () => false,
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
const { CourseDialogProvider } = await import(
  "@/components/Courses/CourseDialog"
);
const { TimetableCourseList } = await import("./TimetableCourseList");

const COURSES_KEY = "nthumods-storage-anonymous-courses";
const PREFERENCES_KEY =
  "nthumods-storage-anonymous-timetable_display_preferences";
const DISPLAY_SETTINGS_KEY =
  "nthumods-storage-anonymous-timetable-display-settings";

const syncedRecord = (value: unknown) =>
  JSON.stringify({ value, lastModified: 1, updatedAt: 1, deviceId: "test" });

const testCourse = {
  capacity: 30,
  class: "1",
  closed_mark: null,
  compulsory_for: [],
  course: "1010",
  credits: 2,
  cross_discipline: [],
  department: "CS",
  elective_for: [],
  enrolled: 20,
  first_specialization: [],
  ge_target: null,
  ge_type: null,
  language: "中",
  name_en: "Discrete Mathematics",
  name_zh: "離散數學",
  no_extra_selection: false,
  note: null,
  prerequisites: null,
  raw_id: "11410-CS 1010 1",
  reserve: 0,
  restrictions: null,
  second_specialization: [],
  semester: "11410",
  tags: [],
  teacher_en: ["Alice Chen"],
  teacher_zh: ["陳老師"],
  times: ["M1M2"],
  updated_at: "2026-01-01T00:00:00Z",
  venues: ["DELTA台達217 M9MaMb"],
  time_slots: null,
};

const renderTimetable = async (
  children: ReactNode,
  seed: Record<string, unknown> = {},
) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/zh/timetable",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    StorageEvent: dom.window.StorageEvent,
  });
  for (const [key, value] of Object.entries(seed)) {
    window.localStorage.setItem(key, syncedRecord(value));
  }

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
          <CourseDialogProvider>{children}</CourseDialogProvider>
        </UserTimetableProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const readState = () =>
    JSON.parse(container.querySelector("output")?.textContent ?? "{}");
  const waitFor = async (predicate: () => boolean) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (predicate()) return;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
  };
  const writeStorage = async (key: string, value: unknown) => {
    await act(async () => {
      const newValue = syncedRecord(value);
      window.localStorage.setItem(key, newValue);
      window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
    });
  };
  const cleanup = async () => {
    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    dom.window.close();
  };

  return { container, cleanup, readState, waitFor, writeStorage };
};

describe("timetable provider render stability", () => {
  afterEach(() => {
    courseResponseData = [];
  });

  test("settles when the provider and empty course list mount", async () => {
    let renderCount = 0;
    const fixture = await renderTimetable(
      <RenderCount onRender={() => (renderCount += 1)} />,
    );
    await fixture.waitFor(
      () => fixture.container.textContent?.includes("No courses") ?? false,
    );

    expect(renderCount).toBeLessThan(30);
    expect(fixture.container.textContent).toContain("No courses");
    await fixture.cleanup();
  });

  test("renders timetable course fields through the standard course row", async () => {
    const course = {
      ...testCourse,
      closed_mark: "Closed",
      ge_target: "GE",
      note: "Note that should be hidden",
      restrictions: "Restriction that should be hidden",
      tags: ["16周"],
    };
    courseResponseData = [course];

    const fixture = await renderTimetable(
      <TimetableCourseList semester="11410" />,
      {
        [COURSES_KEY]: { "11410": [course.raw_id] },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "add",
          showCourseCode: true,
          showVenue: true,
          showPriority: false,
          showCredits: true,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () => fixture.container.textContent?.includes(course.name_zh) ?? false,
    );

    const text = fixture.container.textContent ?? "";
    expect(text).toContain("CS 101001");
    expect(text).toContain("離散數學 - 陳老師");
    expect(text).toContain("Discrete Mathematics - Alice Chen");
    expect(text).toContain("DELTA台達217 M9MaMb / M1M2");
    expect(text).toContain("2 credits");
    expect(text).toContain("Chinese");
    expect(text).not.toContain("30 people");
    expect(text).not.toContain("20 enrolled");
    expect(text).not.toContain("Note that should be hidden");
    expect(text).not.toContain("Restriction that should be hidden");
    expect(text).not.toContain("Closed");
    expect(text).not.toContain("16 weeks");
    expect(text).not.toContain("general education");
    expect(fixture.container.querySelector("svg.mt-0\\.5")).toBeNull();
    await fixture.cleanup();
  });

  test("keeps sortable timetable row wrappers content-sized", async () => {
    const secondCourse = {
      ...testCourse,
      raw_id: "11410-EE 1010 1",
      department: "EE",
      course: "1010",
      name_en: "Second Course",
      name_zh: "第二課程",
    };
    courseResponseData = [testCourse, secondCourse];

    const fixture = await renderTimetable(
      <TimetableCourseList semester="11410" />,
      {
        [COURSES_KEY]: {
          "11410": [testCourse.raw_id, secondCourse.raw_id],
        },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "add",
          showCourseCode: false,
          showVenue: true,
          showPriority: false,
          showCredits: true,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () =>
        fixture.container.textContent?.includes(secondCourse.name_zh) ?? false,
    );

    const rows = [...fixture.container.querySelectorAll("div.max-w-3xl")];
    expect(rows).toHaveLength(2);

    const forbiddenStretchClass =
      /(?:^|\s)(?:h-full|min-h-\S+|flex-1|grow|self-stretch|items-stretch)(?:\s|$)/;
    for (const row of rows) {
      const triggerWrapper = row.firstElementChild;
      const courseRowRoot = triggerWrapper?.firstElementChild;
      expect(triggerWrapper).not.toBeNull();
      expect(courseRowRoot).not.toBeNull();
      for (const element of [row, triggerWrapper, courseRowRoot]) {
        expect(element?.getAttribute("class") ?? "").not.toMatch(
          forbiddenStretchClass,
        );
      }
      expect(row.className).toContain("h-fit");
    }

    await fixture.cleanup();
  });

  test("dims hidden timetable rows and shows the reveal action", async () => {
    const course = testCourse;
    courseResponseData = [course];

    const fixture = await renderTimetable(
      <TimetableCourseList semester="11410" />,
      {
        [COURSES_KEY]: { "11410": [course.raw_id] },
        [PREFERENCES_KEY]: { hiddenCourses: { [course.raw_id]: true } },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "add",
          showCourseCode: false,
          showVenue: true,
          showPriority: true,
          showCredits: true,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () => fixture.container.textContent?.includes(course.name_zh) ?? false,
    );

    expect(fixture.container.querySelector(".opacity-60")).not.toBeNull();
    const revealButton = fixture.container.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    );
    expect(revealButton?.getAttribute("aria-label")).toBe("Show course");
    expect(revealButton?.querySelector("svg")).not.toBeNull();
    await fixture.cleanup();
  });

  test("omits a timetable field disabled in display settings", async () => {
    const course = testCourse;
    courseResponseData = [course];

    const fixture = await renderTimetable(
      <TimetableCourseList semester="11410" />,
      {
        [COURSES_KEY]: { "11410": [course.raw_id] },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "none",
          showCourseCode: true,
          showVenue: false,
          showPriority: false,
          showCredits: false,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () => fixture.container.textContent?.includes(course.name_zh) ?? false,
    );

    const text = fixture.container.textContent ?? "";
    expect(text).not.toContain("DELTA台達217 M9MaMb");
    expect(text).not.toContain("2 credits");
    await fixture.cleanup();
  });

  test("preserves hidden courses when preferences hydrate before courses", async () => {
    const fixture = await renderTimetable(<TimetableStateProbe />, {
      [PREFERENCES_KEY]: {
        hiddenCourses: { "11410-A": true, "11410-gone": true },
      },
    });
    await fixture.waitFor(
      () => fixture.readState().hiddenCourses?.["11410-A"] === true,
    );

    expect(fixture.readState().hiddenCourses).toEqual({
      "11410-A": true,
      "11410-gone": true,
    });

    await fixture.writeStorage(COURSES_KEY, {
      "11410": ["11410-A", "11410-B"],
    });
    await fixture.waitFor(
      () =>
        fixture.readState().courses?.["11410"]?.includes("11410-A") ?? false,
    );

    expect(fixture.readState().hiddenCourses).toEqual({
      "11410-A": true,
      "11410-gone": true,
    });
    await fixture.cleanup();
  });

  test("does not prune hidden courses on load, but removes deleted ones", async () => {
    const fixture = await renderTimetable(<TimetableStateProbe />, {
      [COURSES_KEY]: { "11410": ["11410-A", "11410-B"] },
      [PREFERENCES_KEY]: { hiddenCourses: { "11410-A": true } },
    });
    await fixture.waitFor(
      () => fixture.readState().hiddenCourses?.["11410-A"] === true,
    );

    expect(fixture.readState().hiddenCourses).toEqual({ "11410-A": true });
    expect(
      JSON.parse(window.localStorage.getItem(PREFERENCES_KEY)!).value
        .hiddenCourses,
    ).toEqual({ "11410-A": true });

    await act(async () => {
      fixture.container
        .querySelector<HTMLButtonElement>("#delete-course")
        ?.click();
    });
    await fixture.waitFor(
      () => Object.keys(fixture.readState().hiddenCourses ?? {}).length === 0,
    );
    expect(fixture.readState().hiddenCourses).toEqual({});
    expect(
      JSON.parse(window.localStorage.getItem(PREFERENCES_KEY)!).value
        .hiddenCourses,
    ).toEqual({});
    await fixture.cleanup();
  });

  test("prunes hidden courses during explicit replacement and clear", async () => {
    const fixture = await renderTimetable(<TimetableStateProbe />, {
      [COURSES_KEY]: { "11410": ["11410-A", "11410-B"] },
      [PREFERENCES_KEY]: { hiddenCourses: { "11410-B": true } },
    });
    await fixture.waitFor(
      () => fixture.readState().hiddenCourses?.["11410-B"] === true,
    );

    await act(async () => {
      fixture.container
        .querySelector<HTMLButtonElement>("#replace-courses")
        ?.click();
    });
    await fixture.waitFor(
      () => Object.keys(fixture.readState().hiddenCourses ?? {}).length === 0,
    );
    expect(fixture.readState().hiddenCourses).toEqual({});

    await act(async () => {
      fixture.container
        .querySelector<HTMLButtonElement>("#hide-course")
        ?.click();
      fixture.container
        .querySelector<HTMLButtonElement>("#clear-courses")
        ?.click();
    });
    await fixture.waitFor(
      () => Object.keys(fixture.readState().hiddenCourses ?? {}).length === 0,
    );
    expect(fixture.readState().hiddenCourses).toEqual({});
    await fixture.cleanup();
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
