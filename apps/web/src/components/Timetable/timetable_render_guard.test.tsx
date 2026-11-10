import {
  act,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";
import { getSyncedStorageKey } from "@/hooks/syncedStorage";
import {
  nextStorageValue,
  persistStorageValue,
  subscribeToStorageEvents,
} from "@/test-utils/storage-events";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";
const actualOidcContext = await import("react-oidc-context");
const actualApi = await import("@/config/api");
const actualAuth = await import("@/config/auth");
const actualGtag = await import("@/lib/gtag");
const actualSettings = await import("@/hooks/contexts/settings");
const actualDictionary = await import("@/dictionaries/useDictionary");
const actualRouter = await import("react-router-dom");
const actualUsehooksTs = await import("usehooks-ts");
const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "StorageEvent",
  "IS_REACT_ACT_ENVIRONMENT",
]);
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let testAuthState: {
  isAuthenticated: boolean;
  user?: { access_token: string; profile: { sub: string } };
} = { isAuthenticated: false };
mock.module("react-oidc-context", () => ({
  useAuth: () => testAuthState,
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
mock.module("@/config/auth", () => ({
  default: {
    api: {
      kv: {
        ":key": {
          $get: async () => new Response(null, { status: 404 }),
          $post: async () => new Response(null, { status: 204 }),
        },
      },
    },
  },
}));
mock.module("@/lib/gtag", () => ({ event: () => {} }));
mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => ({ language: "en" }),
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    a11y: { delete: "Delete" },
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
        course_location: "Course location",
        location_unavailable: "Location unavailable",
      },
      course_item: {
        classmates: "Classmates",
        classmates_count: "Classmates: {count}",
        hide: "Hide in timetable",
        show: "Show in timetable",
        change_color: "Change colour",
        remove: "Remove",
        more_actions: "More course actions",
        move_course: "Move course",
        priority: "PE/GE priority {priority}",
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
      const nextValue = nextStorageValue(next, read);
      persistStorageValue(key, nextValue);
      setValue(nextValue);
      window.dispatchEvent(new StorageEvent("local-storage", { key }));
    },
    [key],
  );
  useEffect(() => subscribeToStorageEvents(key, read, setValue), [key]);
  return [value, update];
};

const TestDropdownMenu = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

const TestDropdownMenuTrigger = ({
  children,
}: {
  asChild?: boolean;
  children: ReactElement;
}) => children;

const TestDropdownMenuContent = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) => {
  return (
    <div role="menu" onClick={onClick}>
      {children}
    </div>
  );
};

const TestDropdownMenuItem = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) => {
  return (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  );
};

mock.module("usehooks-ts", () => ({
  useLocalStorage: useTestLocalStorage,
  useMediaQuery: () => false,
}));

const actualCoursewebUI = await import("@courseweb/ui");
mock.module("@courseweb/ui", () => ({
  ...actualCoursewebUI,
  DropdownMenu: TestDropdownMenu,
  DropdownMenuContent: TestDropdownMenuContent,
  DropdownMenuItem: TestDropdownMenuItem,
  DropdownMenuTrigger: TestDropdownMenuTrigger,
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
const { default: TimetableSlotHorizontal } = await import(
  "./TimetableSlotHorizontal"
);
const { default: TimetableSlotVertical } = await import(
  "./TimetableSlotVertical"
);
mock.module("@/dictionaries/useDictionary", () => actualDictionary);

restoreGlobals();
moduleDom.window.close();

afterAll(() => {
  mock.module("react-oidc-context", () => actualOidcContext);
  mock.module("@/config/api", () => actualApi);
  mock.module("@/config/auth", () => actualAuth);
  mock.module("@/lib/gtag", () => actualGtag);
  mock.module("@/hooks/contexts/settings", () => actualSettings);
  mock.module("@/dictionaries/useDictionary", () => actualDictionary);
  mock.module("usehooks-ts", () => actualUsehooksTs);
  mock.module("@courseweb/ui", () => actualCoursewebUI);
});

const COURSES_KEY = "nthumods-storage-anonymous-courses";
const PREFERENCES_KEY =
  "nthumods-storage-anonymous-timetable_display_preferences";
const DISPLAY_SETTINGS_KEY =
  "nthumods-storage-anonymous-timetable-display-settings";
const TIMETABLE_THEME_KEY = "nthumods-storage-anonymous-timetable_theme";
const USER_COURSES_KEY = getSyncedStorageKey("courses", "test-user");
const USER_DISPLAY_SETTINGS_KEY = getSyncedStorageKey(
  "timetable-display-settings",
  "test-user",
);

const syncedRecord = (value: unknown) =>
  JSON.stringify({ value, lastModified: 1, updatedAt: 1, deviceId: "test" });

let activeCleanup: (() => Promise<void>) | undefined;
let activeFetchRestore: (() => void) | undefined;

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
    IS_REACT_ACT_ENVIRONMENT: true,
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
      <actualRouter.MemoryRouter initialEntries={["/en/timetable"]}>
        <QueryClientProvider client={queryClient}>
          <UserTimetableProvider>
            <CourseDialogProvider>{children}</CourseDialogProvider>
          </UserTimetableProvider>
        </QueryClientProvider>
      </actualRouter.MemoryRouter>,
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
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    activeCleanup = undefined;
    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    dom.window.close();
    restoreGlobals();
  };

  activeCleanup = cleanup;

  return { container, cleanup, readState, waitFor, writeStorage };
};

describe("timetable provider render stability", () => {
  afterEach(async () => {
    await activeCleanup?.();
    activeFetchRestore?.();
    activeFetchRestore = undefined;
    courseResponseData = [];
    testAuthState = { isAuthenticated: false };
    restoreGlobals();
  });

  test("settles when the provider and empty course list mount", async () => {
    let renderCount = 0;
    const fixture = await renderTimetable(
      <>
        <RenderCount onRender={() => (renderCount += 1)} />
        <TimetableStateProbe />
      </>,
    );
    await fixture.waitFor(
      () => fixture.container.textContent?.includes("No courses") ?? false,
    );

    await fixture.waitFor(() => fixture.readState().timetableTheme === "ashes");
    expect(fixture.readState().timetableTheme).toBe("ashes");
    expect(renderCount).toBeLessThan(30);
    expect(fixture.container.textContent).toContain("No courses");
    await fixture.cleanup();
  });

  test("keeps stored timetable themes and updates them before courses exist", async () => {
    const fixture = await renderTimetable(<TimetableStateProbe />, {
      [TIMETABLE_THEME_KEY]: "ocean",
    });
    await fixture.waitFor(() => fixture.readState().timetableTheme === "ocean");

    await act(async () => {
      fixture.container
        .querySelector<HTMLButtonElement>("#select-theme")
        ?.click();
    });

    expect(fixture.readState().timetableTheme).toBe("ashes");
    await fixture.cleanup();
  });

  test("renders malformed timetable indexes in both layouts without throwing", async () => {
    const malformedSlot = {
      course: testCourse,
      venue: "",
      dayOfWeek: -1,
      startTime: -1,
      endTime: -1,
      color: "#000000",
      textColor: "#ffffff",
    };
    const tableDim = {
      header: { width: 40, height: 40 },
      timetable: { width: 100, height: 50 },
    };

    const fixture = await renderTimetable(
      <>
        <TimetableSlotVertical course={malformedSlot} tableDim={tableDim} />
        <TimetableSlotHorizontal course={malformedSlot} tableDim={tableDim} />
      </>,
    );

    expect(fixture.container.textContent).toContain(testCourse.name_en);
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
    expect(text).toContain("離散數學");
    expect(text).toContain("Discrete Mathematics");
    expect(text).toContain("DELTA台達217 M9MaMb");
    expect(text).toContain("M1M2");
    expect(text).toContain("2 credits");
    expect(
      fixture.container.querySelector('a[aria-label="Classmates"]')
        ?.textContent,
    ).toBe("");
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

  test("does not combine a column course list with flex wrapping", async () => {
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

    const rows = [...fixture.container.querySelectorAll("div.group.min-w-0")];
    expect(rows).toHaveLength(2);

    const listContainer = rows[0]?.parentElement;
    expect(listContainer).not.toBeNull();
    expect(listContainer?.classList.contains("flex-col")).toBe(true);
    expect(listContainer?.classList.contains("flex-wrap")).toBe(false);

    await fixture.cleanup();
  });

  test("dims hidden timetable rows and reveals them from the overflow menu", async () => {
    const course = testCourse;
    courseResponseData = [course];

    const fixture = await renderTimetable(
      <>
        <TimetableCourseList semester="11410" />
        <TimetableStateProbe />
      </>,
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
    const menuTrigger = fixture.container.querySelector<HTMLButtonElement>(
      'button[aria-label="More course actions"]',
    );
    await act(async () => {
      menuTrigger?.click();
    });
    await fixture.waitFor(() =>
      [
        ...fixture.container.ownerDocument.querySelectorAll<HTMLElement>(
          '[role="menuitem"]',
        ),
      ].some((item) => item.textContent?.trim() === "Show in timetable"),
    );
    const showItem = [
      ...fixture.container.ownerDocument.querySelectorAll<HTMLElement>(
        '[role="menuitem"]',
      ),
    ].find((item) => item.textContent?.trim() === "Show in timetable");
    expect(showItem).toBeDefined();
    await act(async () => showItem?.click());
    await fixture.waitFor(
      () => fixture.readState().hiddenCourses?.[course.raw_id] === undefined,
    );
    expect(fixture.readState().hiddenCourses).toEqual({});
    await fixture.cleanup();
  });

  test("hides a course from the overflow menu", async () => {
    courseResponseData = [testCourse];
    const fixture = await renderTimetable(
      <>
        <TimetableCourseList semester="11410" />
        <TimetableStateProbe />
      </>,
      {
        [COURSES_KEY]: { "11410": [testCourse.raw_id] },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "none",
          showCourseCode: false,
          showVenue: false,
          showPriority: false,
          showCredits: false,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () =>
        fixture.container.textContent?.includes(testCourse.name_zh) ?? false,
    );
    await act(async () => {
      const trigger = fixture.container.querySelector<HTMLButtonElement>(
        'button[aria-label="More course actions"]',
      );
      trigger?.click();
    });
    await fixture.waitFor(() =>
      [
        ...fixture.container.ownerDocument.querySelectorAll<HTMLElement>(
          '[role="menuitem"]',
        ),
      ].some((item) => item.textContent?.trim() === "Hide in timetable"),
    );
    const hideItem = [
      ...fixture.container.ownerDocument.querySelectorAll<HTMLElement>(
        '[role="menuitem"]',
      ),
    ].find((item) => item.textContent?.trim() === "Hide in timetable");
    expect(hideItem).toBeDefined();
    await act(async () => hideItem?.click());
    await fixture.waitFor(
      () => fixture.readState().hiddenCourses?.[testCourse.raw_id] === true,
    );
    expect(fixture.container.querySelector(".opacity-60")).not.toBeNull();
    await fixture.cleanup();
  });

  test("links the classmates count to the course page", async () => {
    const course = testCourse;
    const secondCourse = {
      ...testCourse,
      raw_id: "11410-EE 1010 1",
      department: "EE",
      course: "1010",
      name_en: "Second course",
      name_zh: "第二課程",
    };
    courseResponseData = [course, secondCourse];
    testAuthState = {
      isAuthenticated: true,
      user: {
        access_token: "test-token",
        profile: { sub: "test-user" },
      },
    };
    const originalFetch = globalThis.fetch;
    let countRequests = 0;
    activeFetchRestore = () => {
      globalThis.fetch = originalFetch;
    };
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/class-pages/counts/11410")) {
        countRequests += 1;
        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "Bearer test-token",
        );
        return new Response(
          JSON.stringify({
            counts: {
              [course.raw_id]: { members: 7, joined: true },
              [secondCourse.raw_id]: { members: 3, joined: false },
            },
          }),
          { status: 200 },
        );
      }
      return originalFetch(input, init);
    };

    const fixture = await renderTimetable(
      <TimetableCourseList semester="11410" />,
      {
        [USER_COURSES_KEY]: {
          "11410": [course.raw_id, secondCourse.raw_id],
        },
        [USER_DISPLAY_SETTINGS_KEY]: {
          englishNames: "none",
          showCourseCode: false,
          showVenue: false,
          showPriority: false,
          showCredits: false,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(() => {
      const links = fixture.container.querySelectorAll<HTMLAnchorElement>(
        'a[aria-label^="Classmates"]',
      );
      return (
        links.length === 2 &&
        links[0]?.textContent?.includes("7") === true &&
        links[1]?.textContent?.includes("3") === true
      );
    });
    const classmatesLinks = [
      ...fixture.container.querySelectorAll<HTMLAnchorElement>(
        'a[aria-label^="Classmates"]',
      ),
    ];
    expect(classmatesLinks[0]?.getAttribute("href")).toBe(
      "/en/classmates/11410/11410-CS%201010%201",
    );
    expect(classmatesLinks[0]?.textContent).toContain("7");
    expect(classmatesLinks[0]?.getAttribute("aria-label")).toBe(
      "Classmates: 7",
    );
    expect(classmatesLinks[0]?.className).toContain("text-foreground");
    expect(classmatesLinks[1]?.getAttribute("href")).toBe(
      "/en/classmates/11410/11410-EE%201010%201",
    );
    expect(classmatesLinks[1]?.textContent).toContain("3");
    expect(classmatesLinks[1]?.getAttribute("aria-label")).toBe(
      "Classmates: 3",
    );
    expect(classmatesLinks[1]?.className).toContain("text-muted-foreground");
    expect(countRequests).toBe(1);
    await fixture.cleanup();
  });

  test("labels a course with a schedule conflict", async () => {
    const conflictingCourse = {
      ...testCourse,
      raw_id: "11410-EE 1010 1",
      department: "EE",
      course: "1010",
      name_en: "Conflicting course",
      name_zh: "衝堂課程",
    };
    courseResponseData = [testCourse, conflictingCourse];

    const fixture = await renderTimetable(
      <TimetableCourseList semester="11410" />,
      {
        [COURSES_KEY]: {
          "11410": [testCourse.raw_id, conflictingCourse.raw_id],
        },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "none",
          showCourseCode: false,
          showVenue: false,
          showPriority: false,
          showCredits: false,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () =>
        fixture.container.querySelector(
          '[role="img"][aria-label="Conflict"]',
        ) !== null,
    );

    expect(
      fixture.container.querySelectorAll('[role="img"][aria-label="Conflict"]'),
    ).toHaveLength(2);
    await fixture.cleanup();
  });

  test("removes a course from the overflow menu", async () => {
    courseResponseData = [testCourse];
    const fixture = await renderTimetable(
      <>
        <TimetableCourseList semester="11410" />
        <TimetableStateProbe />
      </>,
      {
        [COURSES_KEY]: { "11410": [testCourse.raw_id] },
        [DISPLAY_SETTINGS_KEY]: {
          englishNames: "none",
          showCourseCode: false,
          showVenue: false,
          showPriority: false,
          showCredits: false,
          lockOrder: true,
        },
      },
    );
    await fixture.waitFor(
      () =>
        fixture.container.textContent?.includes(testCourse.name_zh) ?? false,
    );
    await act(async () => {
      const trigger = fixture.container.querySelector<HTMLButtonElement>(
        'button[aria-label="More course actions"]',
      );
      trigger?.click();
    });
    await fixture.waitFor(() =>
      [
        ...fixture.container.ownerDocument.querySelectorAll<HTMLElement>(
          '[role="menuitem"]',
        ),
      ].some((item) => item.textContent?.trim() === "Remove"),
    );
    const removeItem = [
      ...fixture.container.ownerDocument.querySelectorAll<HTMLElement>(
        '[role="menuitem"]',
      ),
    ].find((item) => item.textContent?.trim() === "Remove");
    expect(removeItem).toBeDefined();
    await act(async () => removeItem?.click());
    await fixture.waitFor(
      () =>
        !fixture.readState().courses?.["11410"]?.includes(testCourse.raw_id),
    );
    expect(fixture.readState().courses["11410"]).toEqual([]);
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
    timetableTheme,
    deleteCourse,
    clearCourses,
    setCourses,
    setPreferences,
    setTimetableTheme,
  } = useUserTimetable();

  return (
    <>
      <output>
        {JSON.stringify({
          courses,
          hiddenCourses: preferences.hiddenCourses,
          timetableTheme,
        })}
      </output>
      <button id="select-theme" onClick={() => setTimetableTheme("ashes")} />
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
