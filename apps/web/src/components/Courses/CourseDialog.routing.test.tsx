import {
  act,
  createElement,
  lazy,
  useEffect,
  useState,
  type ComponentType,
} from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  afterAll,
  afterEach,
  describe,
  expect,
  jest,
  mock,
  test,
} from "bun:test";
import {
  createBrowserRouter,
  Link,
  Outlet,
  RouterProvider,
  useLocation,
  useParams,
  useRoutes,
} from "react-router-dom";
import { useSearchBox } from "react-instantsearch";
import enDictionary from "@/dictionaries/en.json";
import zhDictionary from "@/dictionaries/zh.json";

process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";
process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

let renderDialogLinkInventory: () => unknown = () => null;
const productionQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

mock.module("@/hooks/contexts/settings", () => ({
  useSettings: () => ({
    language: useLocation().pathname.startsWith("/zh") ? "zh" : "en",
  }),
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => {
    if (
      (globalThis as { __courseDialogRealSearch?: boolean })
        .__courseDialogRealSearch
    ) {
      return useLocation().pathname.startsWith("/zh")
        ? zhDictionary
        : enDictionary;
    }
    return {
      common: {
        back: useLocation().pathname.startsWith("/zh") ? "返回" : "Back",
        loading: "Loading",
      },
      course: {
        details: {
          dialog_title: "Course Details",
          open_new_tab: "Open full page",
        },
        instructor: {
          title: "Instructor",
          description: "instructor",
          departments: "Departments",
          research_portal: "Research portal",
          namesake_notice: "Namesake notice",
          offerings: "Offerings",
          grades: "Grades",
          average_grade: "Average",
        },
        module: {
          title: "Course module",
          default_section: "Default",
          not_available: "Unavailable",
          view_offering: "View offering",
          capacity: "Capacity",
          stats: { classes: "classes", gpa_scale: "GPA", percent_scale: "%" },
        },
      },
    };
  },
}));
mock.module("@/lib/chunk-recovery", () => ({
  lazyWithRetry: (loader: () => Promise<{ default: ComponentType }>) =>
    lazy(loader),
}));
mock.module("react-cookie", () => ({ useCookies: () => [{}] }));
mock.module("@/components/Chat/ChatProvider", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => children,
  useChatContext: () => ({ isOpen: false }),
}));
mock.module("@/components/Calendar/calendar_hook", () => ({
  CalendarProvider: ({ children }: { children: React.ReactNode }) => children,
}));
mock.module("@/components/Header", () => ({ default: () => null }));
mock.module("@/components/BottomNav", () => ({ default: () => null }));
mock.module("@/components/AppSidebar", () => ({ default: () => null }));
mock.module("@/components/Timetable/Timetable", () => ({
  default: () => createElement("div", null, "Timetable"),
}));
mock.module("react-resizable-panels", () => ({
  PanelGroup: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
  Panel: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
  PanelResizeHandle: () => null,
}));
mock.module("@/app/[lang]/(mods-pages)/courses/SearchContainer", () => ({
  default: () => {
    const { openCourse } = useCourseLink();
    const { query, refine } = useSearchBox();
    return createElement(
      "div",
      null,
      createElement("input", {
        type: "search",
        value: query,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          refine(event.target.value),
      }),
      createElement(
        "button",
        { onClick: () => openCourse("11420PE  206097") },
        "離散數學",
      ),
    );
  },
}));
mock.module("@/app/[lang]/(mods-pages)/courses/CourseSidePanel", () => ({
  default: () => createElement("div", null, "Course side panel"),
}));
mock.module("@/components/GoogleAnalytics", () => ({ default: () => null }));
mock.module("@/components/ConsoleLogger", () => ({ default: () => null }));
mock.module("@/components/CommandPalette/CommandPalette", () => ({
  default: () => null,
}));
mock.module("@/components/CustomCSS/CustomCSSInjector", () => ({
  default: () => null,
}));
mock.module("@/components/Alerts/AnnouncementBar", () => ({
  default: () => null,
}));
mock.module("@/components/Alerts/CourseSelectionBar", () => ({
  default: () => null,
}));
mock.module("@/components/Changelog/WhatsNewDialog", () => ({
  default: () => null,
}));
mock.module("@/app/[lang]/(mods-pages)/error", () => ({
  default: ({ error }: { error?: Error }) =>
    createElement("div", null, error?.message ?? "Error"),
}));
mock.module("@/layouts/AppProviders", () => ({
  default: () =>
    createElement(
      QueryClientProvider,
      { client: productionQueryClient },
      createElement(Outlet),
    ),
}));

mock.module("@/lib/modules", () => ({
  createModuleKey: (department: string, course: string) =>
    `${department}:${course}`,
  getModuleOfferings: async (moduleKey: string) => ({
    key: moduleKey,
    department: "PE",
    course: "2060",
    offerings: [
      {
        raw_id: "11420PE  206097",
        semester: "11420",
        department: "PE",
        course: "2060",
        class: "01",
        name_zh: "離散數學",
        name_en: "Discrete Mathematics",
        prerequisites: "",
        credits: [3],
        language: "英",
        teacher_zh: ["王嬿婷"],
        teacher_en: ["WANG, YEN-TING"],
        times: [],
        venues: [],
        capacity: null,
        enrolled: 0,
      },
    ],
    variants: [
      {
        titleKey: "Discrete",
        titleKeys: ["Discrete"],
        nameZh: "離散數學",
        nameEn: "Discrete Mathematics",
        titles: [{ nameZh: "離散數學", nameEn: "Discrete Mathematics" }],
        offerings: [],
        semesters: ["11420"],
        history: [],
        credits: [3],
        mergedRename: false,
      },
    ],
  }),
  getInstructorOfferings: async (name: string) => [
    {
      raw_id: "11420PE  206097",
      semester: "11420",
      department: "PE",
      course: "206097",
      class: "01",
      name_zh: "離散數學",
      name_en: "Discrete Mathematics",
      prerequisites: "",
      credits: [3],
      language: "英",
      teacher_zh: [name],
      teacher_en: ["WANG, YEN-TING"],
      times: [],
      venues: [],
      capacity: null,
      enrolled: 0,
    },
  ],
  getModuleScores: async () => [],
}));
mock.module("@/app/[lang]/(mods-pages)/courses/page", () => ({
  default: () => {
    if (
      (globalThis as { __courseDialogRealSearch?: boolean })
        .__courseDialogRealSearch
    ) {
      return createElement(RealCourseSearchPage);
    }
    const { openCourse } = useCourseLink();
    return createElement(
      "main",
      { "data-course-dialog-list-container": true },
      createElement("h1", null, "課程清單"),
      createElement(
        "button",
        { onClick: () => openCourse("11420PE  206097") },
        "離散數學",
      ),
    );
  },
}));
const RealCourseSearchPage = lazy(
  () => import("@/app/[lang]/(mods-pages)/courses/CourseSearchContainer"),
);
mock.module("@/components/CourseDetails/CourseDetailsContainer", () => ({
  default: ({ courseId }: { courseId: string }) => {
    const language = useLocation().pathname.startsWith("/zh") ? "zh" : "en";
    return createElement(
      "div",
      null,
      createElement("h1", null, `Course ${courseId}`),
      createElement(Link, { to: "/en/timetable?view=week" }, "Open timetable"),
      createElement(
        CourseDialogLink,
        {
          to: "/en/courses/instructor/Alice",
          target: "_blank",
          "data-target-blank": "true",
        },
        "Target blank instructor",
      ),
      createElement(
        CourseDialogLink,
        { to: `/${language}/courses/instructor/Alice` },
        "Dialog instructor Alice",
      ),
      createElement(
        CourseDialogLink,
        {
          to: `/${language}/courses/instructor/${encodeURIComponent("王嬿婷")}`,
        },
        "Dialog instructor 王嬿婷",
      ),
      createElement(
        CourseDialogLink,
        { to: `/${language}/courses/module/CS%201010` },
        "Dialog module CS 1010",
      ),
      createElement(
        CourseDialogLink,
        {
          to: `/${language}/courses/module/PE%3A2060?title=Discrete`,
        },
        "Dialog module PE:2060",
      ),
      renderDialogLinkInventory(),
    );
  },
}));
mock.module("@/app/[lang]/(mods-pages)/courses/instructor/[name]/page", () => ({
  default: () => {
    const { name } = useParams();
    return createElement("h1", null, `Full instructor page ${name}`);
  },
  InstructorPageContent: ({ name }: { name: string }) => {
    const language = useLocation().pathname.startsWith("/zh") ? "zh" : "en";
    const [offerings, setOfferings] = useState<{ raw_id: string }[]>([]);
    useEffect(() => {
      let active = true;
      void import("@/lib/modules")
        .then(({ getInstructorOfferings }) => getInstructorOfferings(name))
        .then((nextOfferings) => {
          if (active) setOfferings(nextOfferings);
        });
      return () => {
        active = false;
      };
    }, [name]);
    return createElement(
      "div",
      null,
      createElement("h1", null, `Instructor ${name}`),
      offerings.map((offering) =>
        createElement(
          CourseDialogLink,
          {
            key: offering.raw_id,
            to: `/${language}/courses/${encodeURIComponent(offering.raw_id)}`,
            "data-instructor-course-row": true,
          },
          "離散數學課程",
        ),
      ),
      renderDialogLinkInventory(),
    );
  },
}));
mock.module(
  "@/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page",
  () => ({
    ModulePageContent: ({
      moduleKey,
      dialogSearch,
      onDialogSearchChange,
    }: {
      moduleKey: string;
      dialogSearch?: string;
      onDialogSearchChange?: (search: URLSearchParams) => void;
    }) => {
      const { data: module } = useQuery({
        queryKey: ["mock-module", moduleKey],
        queryFn: () =>
          import("@/lib/modules").then(({ getModuleOfferings }) =>
            getModuleOfferings(moduleKey),
          ),
      });
      return createElement(
        "div",
        null,
        module &&
          createElement(
            "h1",
            null,
            `Module ${module.key}${dialogSearch ? ` ${dialogSearch}` : ""}`,
          ),
        module &&
          createElement(
            "a",
            {
              href: "/en/courses/11420PE%20%20206097",
              "data-module-course-row": true,
            },
            "Discrete Mathematics course row",
          ),
        onDialogSearchChange &&
          createElement(
            "button",
            {
              type: "button",
              onClick: () =>
                onDialogSearchChange(new URLSearchParams("title=Variant C")),
            },
            "Change variant",
          ),
        renderDialogLinkInventory(),
      );
    },
  }),
);

const sharedDom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/en/courses",
});
const previousGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
};
Object.assign(globalThis, {
  window: sharedDom.window,
  document: sharedDom.window.document,
  navigator: sharedDom.window.navigator,
  getComputedStyle: sharedDom.window.getComputedStyle,
  MutationObserver: sharedDom.window.MutationObserver,
  Event: sharedDom.window.Event,
  CustomEvent: sharedDom.window.CustomEvent,
  MouseEvent: sharedDom.window.MouseEvent,
  KeyboardEvent: sharedDom.window.KeyboardEvent,
  NodeFilter: sharedDom.window.NodeFilter,
  Node: sharedDom.window.Node,
  Element: sharedDom.window.Element,
  DocumentFragment: sharedDom.window.DocumentFragment,
  SVGElement: sharedDom.window.SVGElement,
  AbortSignal: sharedDom.window.AbortSignal,
  HTMLElement: sharedDom.window.HTMLElement,
  HTMLInputElement: sharedDom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (callback: FrameRequestCallback) =>
    sharedDom.window.setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: (handle: number) =>
    sharedDom.window.clearTimeout(handle),
});
sharedDom.window.requestAnimationFrame = (callback) =>
  sharedDom.window.setTimeout(() => callback(Date.now()), 0);
sharedDom.window.cancelAnimationFrame = (handle) =>
  sharedDom.window.clearTimeout(handle);
(
  sharedDom.window.HTMLElement.prototype as HTMLElement & {
    attachEvent?: () => void;
    detachEvent?: () => void;
  }
).attachEvent = () => undefined;
(
  sharedDom.window.HTMLElement.prototype as HTMLElement & {
    attachEvent?: () => void;
    detachEvent?: () => void;
  }
).detachEvent = () => undefined;
sharedDom.window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof sharedDom.window.matchMedia;

const { CourseDialogLink, CourseDialogProvider, useCourseLink } = await import(
  "./CourseDialog"
);
const { createAppRouter } = await import("@/router");
const mountedRoots = new Set<ReturnType<typeof createRoot>>();
const mountedRouters = new Set<ReturnType<typeof createBrowserRouter>>();

const inventory = [
  ["inventory-course", "/en/courses/11410-CS%201011%201"],
  ["inventory-instructor", "/en/courses/instructor/Bob"],
  ["inventory-module", "/en/courses/module/CS%201011"],
] as const;
renderDialogLinkInventory = () =>
  inventory.map(([label, to]) =>
    createElement(CourseDialogLink, { key: to, to }, label),
  );

const Probe = () => {
  const { openCourse } = useCourseLink();
  const location = useLocation();
  return createElement(
    "main",
    { "data-course-dialog-list-container": true, tabIndex: -1 },
    createElement("p", null, "Course list"),
    createElement("p", null, `List search ${location.search || "none"}`),
    createElement(
      "button",
      { onClick: () => openCourse("11410-CS 1010 1") },
      "Open course",
    ),
    createElement(
      CourseDialogLink,
      { to: "/en/courses/instructor/Alice" },
      "Alice",
    ),
    createElement(
      CourseDialogLink,
      { to: "/en/courses/module/CS%201010" },
      "Module",
    ),
    createElement(
      CourseDialogLink,
      { to: "/en/courses/module/CS%201010?title=Variant%20B" },
      "Variant module",
    ),
    createElement(
      "div",
      { "data-favourites-overlay": true, "data-state": "open" },
      "Favourites overlay",
    ),
    createElement(
      CourseDialogLink,
      { to: "/en/courses/11410-CS%201011%201" },
      "Another course",
    ),
  );
};

const Timetable = () => {
  const { openCourse } = useCourseLink();
  return createElement(
    "main",
    null,
    createElement("h1", null, "Timetable page"),
    createElement(
      "button",
      { onClick: () => openCourse("11410-CS 1010 1") },
      "Open timetable course",
    ),
  );
};
const Settings = () => createElement("h1", null, "Settings page");
const fullPageLinks = () =>
  [
    ["course", "/en/courses/11410-CS%201011%201"],
    ["instructor", "/en/courses/instructor/Bob"],
    ["module", "/en/courses/module/CS%201011"],
  ].map(([kind, to]) =>
    createElement(
      CourseDialogLink,
      { key: kind, to, "data-full-page-link": kind },
      kind,
    ),
  );
const FullCourse = () =>
  createElement(
    "main",
    null,
    createElement("h1", null, "Full course page"),
    fullPageLinks(),
  );
const FullInstructor = () => {
  const { name } = useParams();
  return createElement(
    "main",
    null,
    createElement("h1", null, `Full instructor page ${name}`),
    fullPageLinks(),
  );
};
const FullModule = () =>
  createElement(
    "main",
    null,
    createElement("h1", null, "Full module page"),
    fullPageLinks(),
  );

const pageRoutes = [
  { path: "/en/courses", element: createElement(Probe) },
  { path: "/zh/courses", element: createElement(Probe) },
  { path: "/en/courses/:courseId", element: createElement(FullCourse) },
  {
    path: "/en/courses/instructor/:name",
    element: createElement(FullInstructor),
  },
  {
    path: "/en/courses/module/:moduleKey",
    element: createElement(FullModule),
  },
  { path: "/en/timetable", element: createElement(Timetable) },
  { path: "/en/settings", element: createElement(Settings) },
  { path: "*", element: createElement("h1", null, "Other page") },
];

type LocationLike = {
  pathname: string;
  search: string;
  hash: string;
  key: string;
};

const RouteLayout = () => {
  const location = useLocation();
  const state = location.state as {
    dialog?: { background?: LocationLike };
  } | null;
  const page = useRoutes(pageRoutes, state?.dialog?.background ?? location);
  return createElement(
    QueryClientProvider,
    { client: productionQueryClient },
    createElement(CourseDialogProvider, null, page),
  );
};

const createTestRouter = (path: string, preserveState = false) => {
  if (!preserveState) window.history.replaceState(null, "", path);
  return createBrowserRouter([
    {
      element: createElement(RouteLayout),
      children: pageRoutes,
    },
  ]);
};

const waitFor = async (predicate: () => boolean, description: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  throw new Error(`${description}; got ${document.body.innerHTML}`);
};
const waitForText = (text: string) =>
  waitFor(() => document.body.textContent?.includes(text) ?? false, text);
const waitForPath = (path: string) =>
  waitFor(
    () => window.location.pathname + window.location.search === path,
    path,
  );
const waitForWithoutTimers = async (
  predicate: () => boolean,
  description: string,
) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await act(async () => {
      if (jest.isFakeTimers()) jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
  }
  throw new Error(`${description}; got ${document.body.innerHTML}`);
};
const waitForTextWithoutTimers = (text: string) =>
  waitForWithoutTimers(
    () => document.body.textContent?.includes(text) ?? false,
    text,
  );
const waitForPathWithoutTimers = (path: string) =>
  waitForWithoutTimers(
    () => window.location.pathname + window.location.search === path,
    path,
  );

const assertDialogHistoryStable = async ({
  dialogUrl,
  historyLength,
  router,
  dialogState,
}: {
  dialogUrl: string;
  historyLength: number;
  router: ReturnType<typeof createAppRouter>;
  dialogState?: unknown;
}) => {
  await act(async () => {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  });

  expect(window.location.href).toBe(dialogUrl);
  expect(window.history).toHaveLength(historyLength);
  if (dialogState) {
    expect(window.history.state?.usr?.dialog).toEqual(dialogState);
    expect(router.state.location.state?.dialog).toEqual(dialogState);
  } else {
    expect(window.history.state?.usr?.dialog).toBeTruthy();
    expect(router.state.location.state?.dialog).toBeTruthy();
  }
};

const click = async (selector: string) => {
  await act(async () => {
    document.querySelector<HTMLElement>(selector)?.click();
  });
};
const clickText = async (text: string) => {
  await act(async () => {
    [...document.querySelectorAll<HTMLElement>("button, a")]
      .find((element) => element.textContent?.trim() === text)
      ?.click();
  });
};

const renderRouter = async (path = "/en/courses", preserveState = false) => {
  const router = createTestRouter(path, preserveState);
  return renderMountedRouter(router, async () => {
    if (!preserveState) {
      await waitForText(
        path.startsWith("/en/courses/") ? "Full" : "Course list",
      );
    }
  });
};

const renderMountedRouter = async (
  router: ReturnType<typeof createBrowserRouter>,
  waitForReady: () => Promise<void>,
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  mountedRouters.add(router);
  await act(async () => {
    root.render(createElement(RouterProvider, { router }));
  });
  await waitForReady();
  return { router, container, root };
};

const renderProductionRouter = async () => {
  window.history.replaceState(
    null,
    "",
    "/zh/courses?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
  );
  const router = createAppRouter();
  await renderMountedRouter(router, async () => {
    await waitForText("課程清單");
  });
  return { router };
};
const renderProductionRouterWithoutAdvancingTimers = async () => {
  (
    globalThis as { __courseDialogRealSearch?: boolean }
  ).__courseDialogRealSearch = true;
  window.history.replaceState(
    null,
    "",
    "/zh/courses?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
  );
  const router = createAppRouter();
  await renderMountedRouter(router, async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (document.body.textContent?.includes("離散數學")) return;
      await Promise.resolve();
    }
  });
  return { router };
};
const openCourse = async () => {
  await clickText("Open course");
  await waitForText("Course 11410-CS 1010 1");
};
const closeDialog = async (path = "/en/courses") => {
  await clickText("Close");
  await waitForPath(path);
};

describe("course dialog routing", () => {
  afterAll(() => {
    Object.assign(globalThis, previousGlobals);
    sharedDom.window.close();
  });
  afterEach(async () => {
    delete (globalThis as { __courseDialogRealSearch?: boolean })
      .__courseDialogRealSearch;
    await act(async () => {
      for (const root of mountedRoots) root.unmount();
    });
    mountedRoots.clear();
    for (const router of mountedRouters) router.dispose();
    mountedRouters.clear();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    window.history.replaceState(null, "", "/en/courses");
  });

  test("opens a serialisable dialog entry and keeps the opener query", async () => {
    const { router } = await renderRouter("/en/courses?department=CS");
    await openCourse();
    expect(router.state.location.pathname).toBe(
      "/en/courses/11410-CS%201010%201",
    );
    expect(router.state.location.state).toMatchObject({
      dialog: {
        background: {
          pathname: "/en/courses",
          search: "?department=CS",
          hash: "",
        },
      },
    });
    expect(document.body.textContent).toContain("List search ?department=CS");
  });

  test("production router follows the real five-step dialog flow", async () => {
    const { router } = await renderProductionRouter();
    await clickText("離散數學");
    await waitForText("Course 11420PE  206097");
    expect(window.location.pathname).toBe("/zh/courses/11420PE%20%20206097");
    expect(window.history.state?.usr?.dialog?.originIdx).toBe(0);
    expect(document.querySelector('[role="dialog"] > div > button')).toBeNull();

    const moduleAnchor = document.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[href="/zh/courses/module/CS%201010"]',
    );
    expect(moduleAnchor).not.toBeNull();
    const modulePath = moduleAnchor?.pathname;
    await click('[role="dialog"] a[href="/zh/courses/module/CS%201010"]');
    await waitForPath(modulePath ?? "");
    await waitForText("Module CS 1010");
    expect(window.location.pathname).toBe(modulePath);
    await act(async () => router.navigate(-1));
    await waitForText("Course 11420PE  206097");

    const firstDialogHistoryIndex = Number(window.history.state?.idx);
    const instructorAnchor = document.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[href*="/zh/courses/instructor/%E7%8E%8B"]',
    );
    expect(instructorAnchor).not.toBeNull();
    const instructorPath = instructorAnchor?.pathname;
    await click('[role="dialog"] a[href*="/zh/courses/instructor/%E7%8E%8B"]');
    await waitForPath(instructorPath ?? "");
    expect(window.location.pathname).toBe(instructorPath);
    await waitForText("Instructor 王嬿婷");
    await waitForText("離散數學課程");
    expect(window.history.state?.idx).toBe(firstDialogHistoryIndex + 1);
    expect(window.history.state?.usr?.dialog).toMatchObject({
      background: {
        pathname: "/zh/courses",
        search: "?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
      },
      originIdx: 0,
    });
    expect(
      document.querySelector('[role="dialog"] > div > button')?.textContent,
    ).toContain("返回");

    const instructorCourseAnchor = document.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[data-instructor-course-row]',
    );
    expect(instructorCourseAnchor).not.toBeNull();
    const instructorCoursePath = instructorCourseAnchor?.pathname;
    const secondDialogHistoryIndex = Number(window.history.state?.idx);
    await click('[role="dialog"] a[data-instructor-course-row]');
    await waitForPath(instructorCoursePath ?? "");
    expect(window.location.pathname).toBe(instructorCoursePath);
    await waitForText("Course 11420PE  206097");
    expect(window.history.state?.idx).toBe(secondDialogHistoryIndex + 1);

    await act(async () => router.navigate(-1));
    await waitForPath(instructorPath ?? "");
    await waitForText("Instructor 王嬿婷");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => router.navigate(-1));
    await waitForPath("/zh/courses/11420PE%20%20206097");
    await waitForText("Course 11420PE  206097");
    await clickText("Close");
    await waitForPath("/zh/courses?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  test("production search routing cannot replace an open dialog entry", async () => {
    jest.useFakeTimers();
    try {
      const { router } = await renderProductionRouterWithoutAdvancingTimers();
      await act(async () =>
        router.navigate("/zh/courses/11420PE%20%20206097", {
          state: {
            dialog: {
              background: {
                pathname: "/zh/courses",
                search: "?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
                hash: "",
                key: "background",
              },
            },
          },
        }),
      );
      await waitForTextWithoutTimers("Course 11420PE  206097");

      const dialogUrl = window.location.href;
      const dialogState = window.history.state?.usr?.dialog;
      const historyLength = window.history.length;
      expect(dialogState).toMatchObject({
        background: {
          pathname: "/zh/courses",
          search: "?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
        },
      });

      await assertDialogHistoryStable({
        dialogUrl,
        historyLength,
        router,
        dialogState,
      });

      await click('[role="dialog"] a[href="/zh/courses/module/CS%201010"]');
      await waitForTextWithoutTimers("Module CS 1010");
      await act(async () => router.navigate(-1));
      await waitForTextWithoutTimers("Course 11420PE  206097");
      expect(window.history.state?.usr?.dialog).toBeTruthy();

      await clickText("Close");
      await waitForPathWithoutTimers(
        "/zh/courses?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
      );
      expect(window.history.state?.usr?.dialog).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  test("timetable background remains stable while its course dialog is open", async () => {
    try {
      const { router } = await renderRouter();
      await act(async () => router.navigate("/en/timetable"));
      await waitForText("Timetable page");
      jest.useFakeTimers();
      await act(async () =>
        router.navigate("/en/courses/11410-CS%201010%201", {
          state: {
            dialog: {
              background: {
                pathname: "/en/timetable",
                search: "",
                hash: "",
                key: "background",
              },
            },
          },
        }),
      );
      await waitForTextWithoutTimers("Course 11410-CS 1010 1");
      const dialogUrl = window.location.href;
      const historyLength = window.history.length;

      await assertDialogHistoryStable({ dialogUrl, historyLength, router });
    } finally {
      jest.useRealTimers();
    }
  });

  test("production router loads a module dialog from its key and query", async () => {
    await renderProductionRouter();
    await clickText("離散數學");
    await waitForText("Course 11420PE  206097");
    await click(
      '[role="dialog"] a[href="/zh/courses/module/PE%3A2060?title=Discrete"]',
    );
    await waitForText("Module PE:2060 ?title=Discrete");
    expect(
      document.querySelector('[role="dialog"] [data-module-course-row]'),
    ).not.toBeNull();
  });

  test("native back moves through a stacked dialog flow", async () => {
    const { router, container } = await renderRouter();
    await openCourse();
    await click(
      '[role="dialog"] a[href="/en/courses/instructor/Alice"]:not([data-target-blank])',
    );
    await waitForText("Instructor Alice");
    expect(container.textContent).toContain("Course list");
    await clickText("Back");
    await waitForText("Course 11410-CS 1010 1");
    expect(router.state.location.state?.dialog).toBeTruthy();
  });

  test.each([
    ["en", "Course Details", "Back"],
    ["zh", "Course Details", "返回"],
  ] as const)(
    "keeps the dialog heading and localized back name for %s",
    async (lang, title, backLabel) => {
      const { router } = await renderRouter(`/${lang}/courses`);
      await openCourse();
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog?.querySelector("h2")?.textContent).toBe(title);
      await click(
        `[role="dialog"] a[href="/${lang}/courses/instructor/Alice"]:not([data-target-blank])`,
      );
      await waitForText("Instructor Alice");
      const back =
        dialog?.querySelector<HTMLButtonElement>("button[aria-label]");
      expect(back?.getAttribute("aria-label")).toBe(backLabel);
      expect(back?.textContent).toContain(backLabel);
      await act(async () => router.navigate(-1));
    },
  );

  test("closing from a nested overlay restores the overlay and body interactivity", async () => {
    await renderRouter();
    expect(document.querySelector("[data-favourites-overlay]")).not.toBeNull();
    await openCourse();
    expect(document.body.style.pointerEvents).toBe("none");
    await closeDialog();
    expect(document.querySelector("[data-favourites-overlay]")).not.toBeNull();
    expect(document.body.style.pointerEvents).not.toBe("none");
  });

  test("back past the origin then forward re-enters the dialog entry", async () => {
    const { router } = await renderRouter();
    await openCourse();
    await click(
      '[role="dialog"] a[href="/en/courses/instructor/Alice"]:not([data-target-blank])',
    );
    await waitForText("Instructor Alice");
    await act(async () => router.navigate(-2));
    await waitForPath("/en/courses");
    await waitForText("Course list");
    await act(async () => router.navigate(1));
    await waitForPath("/en/courses/11410-CS%201010%201");
    await waitForText("Course 11410-CS 1010 1");
    expect(router.state.location.state?.dialog?.background.pathname).toBe(
      "/en/courses",
    );
  });

  test("recreating the router inside a stack preserves dialog state", async () => {
    let { router, root, container } = await renderRouter();
    await openCourse();
    await click(
      '[role="dialog"] a[href="/en/courses/instructor/Alice"]:not([data-target-blank])',
    );
    await waitForText("Instructor Alice");
    router.dispose();
    mountedRouters.delete(router);
    await act(async () => root.unmount());
    mountedRoots.delete(root);
    document.body.innerHTML = "";
    ({ router, container, root } = await renderRouter(
      window.location.pathname,
      true,
    ));
    expect(container.textContent).toContain("Course list");
    expect(document.body.textContent).toContain("Instructor Alice");
    await act(async () => router.navigate(-1));
    await waitForText("Course 11410-CS 1010 1");
  });

  test("close returns to the original queried page entry", async () => {
    await renderRouter("/en/courses?department=CS");
    await openCourse();
    await closeDialog("/en/courses?department=CS");
    expect(window.location.search).toBe("?department=CS");
    expect(document.body.textContent).toContain("List search ?department=CS");
  });

  test("close falls back to the recorded background when the index is unusable", async () => {
    const { router } = await renderRouter();
    await openCourse();
    await act(async () =>
      router.navigate(router.state.location.pathname, {
        replace: true,
        state: {
          dialog: {
            background: {
              pathname: "/en/courses",
              search: "?department=CS",
              hash: "",
              key: "fallback-background",
            },
          },
        },
      }),
    );
    await closeDialog("/en/courses?department=CS");
    expect(document.body.textContent).toContain("List search ?department=CS");
  });

  test.each([
    ["course", "Course 11410-CS 1010 1", undefined],
    ["instructor", "Instructor Alice", "/en/courses/instructor/Alice"],
    ["module", "Module CS 1010", "/en/courses/module/CS%201010"],
  ] as const)(
    "CourseDialogLink works from the %s view",
    async (_label, viewText, entryPath) => {
      await renderRouter();
      await openCourse();
      if (entryPath) {
        await click(
          `[role="dialog"] a[href="${entryPath}"]:not([data-target-blank])`,
        );
        await waitForText(viewText);
      }
      for (const [label, href] of inventory) {
        await click(
          `[role="dialog"] a[href="${href}"]:not([data-target-blank])`,
        );
        await waitForText(
          href.includes("/instructor/")
            ? "Instructor Bob"
            : href.includes("/module/")
              ? "Module CS 1011"
              : "Course 11410-CS 1011 1",
        );
        await act(async () => window.history.back());
        await waitForText(viewText);
        expect(label).toBeTruthy();
      }
    },
  );

  test("non-dialog navigation from a dialog removes it", async () => {
    await renderRouter();
    await openCourse();
    await click('a[href="/en/timetable?view=week"]');
    await waitForPath("/en/timetable?view=week");
    await waitForText("Timetable page");
    expect(document.body.textContent).not.toContain("Course 11410-CS 1010 1");
  });

  test("a second flow can open from another page", async () => {
    const { router } = await renderRouter();
    await act(async () => router.navigate("/en/timetable"));
    await waitForText("Timetable page");
    await clickText("Open timetable course");
    await waitForText("Course 11410-CS 1010 1");
    expect(router.state.location.state?.dialog?.background.pathname).toBe(
      "/en/timetable",
    );
  });

  test("rapid double click creates one dialog entry", async () => {
    const { router } = await renderRouter();
    const opener = document.querySelector<HTMLButtonElement>("button");
    await act(async () => {
      opener?.click();
      opener?.click();
    });
    await waitForText("Course 11410-CS 1010 1");
    expect(router.state.location.pathname).toBe(
      "/en/courses/11410-CS%201010%201",
    );
    await act(async () => router.navigate(-1));
    await waitForText("Course list");
  });

  test("variant changes replace the entry and Back returns to the opener", async () => {
    const { router } = await renderRouter();
    await openCourse();
    await click(
      '[role="dialog"] a[href="/en/courses/module/CS%201010"]:not([data-target-blank])',
    );
    await waitForText("Module CS 1010");
    const historyLength = window.history.length;
    await clickText("Change variant");
    await waitForText("Module CS 1010 ?title=Variant+C");
    expect(window.history).toHaveLength(historyLength);
    expect(router.state.location.state?.dialog).toBeTruthy();
    await act(async () => router.navigate(-1));
    await waitForText("Course 11410-CS 1010 1");
  });

  test("direct dialog URLs render full pages without dialog state", async () => {
    const { container, router } = await renderRouter(
      "/en/courses/instructor/Alice",
    );
    await waitForText("Full instructor page Alice");
    expect(container.textContent).not.toContain("Course list");
    expect(router.state.location.state).toBeNull();
  });

  test.each([
    ["course", "/en/courses/11410-CS%201010%201"],
    ["instructor", "/en/courses/instructor/Alice"],
    ["module", "/en/courses/module/CS%201010"],
  ] as const)(
    "links on the direct full %s page navigate as full pages",
    async (_page, path) => {
      const { router, container } = await renderRouter(path);
      for (const [kind, target] of [
        ["course", "/en/courses/11410-CS%201011%201"],
        ["instructor", "/en/courses/instructor/Bob"],
        ["module", "/en/courses/module/CS%201011"],
      ] as const) {
        await click(`[data-full-page-link="${kind}"]`);
        await waitForPath(target);
        expect(router.state.location.state).toBeNull();
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        await act(async () => router.navigate(path));
        await waitForText(
          path.includes("instructor")
            ? "Full instructor"
            : path.includes("module")
              ? "Full module"
              : "Full course",
        );
      }
    },
  );

  test("modifier and middle clicks remain ordinary links", async () => {
    await renderRouter();
    await openCourse();
    const link = document.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[href="/en/courses/instructor/Alice"]:not([data-target-blank])',
    );
    const event = new sharedDom.window.MouseEvent("click", {
      bubbles: true,
      button: 0,
      ctrlKey: true,
    });
    link?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(window.location.pathname).toBe("/en/courses/11410-CS%201010%201");
  });

  test("target blank is untouched after a primary click", async () => {
    await renderRouter();
    await openCourse();
    const link = document.querySelector<HTMLAnchorElement>(
      'a[data-target-blank="true"]',
    );
    const originalOpen = window.open;
    window.open = (() => null) as typeof window.open;
    const event = new sharedDom.window.MouseEvent("click", {
      bubbles: true,
      button: 0,
    });
    link?.dispatchEvent(event);
    window.open = originalOpen;
    expect(link?.target).toBe("_blank");
    expect(event.defaultPrevented).toBe(false);
    expect(window.location.pathname).toBe("/en/courses/11410-CS%201010%201");
  });

  test("focus moves to the heading and returns to the opener", async () => {
    const { container } = await renderRouter();
    const opener = container.querySelector<HTMLButtonElement>("button");
    opener?.focus();
    await openCourse();
    await waitFor(
      () => document.activeElement?.textContent === "Course Details",
      "dialog focus",
    );
    await closeDialog();
    expect(document.activeElement).toBe(opener);
  });
});
