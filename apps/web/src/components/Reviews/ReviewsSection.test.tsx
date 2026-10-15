import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, mock, test } from "bun:test";
import zh from "@/dictionaries/zh.json";
import { captureGlobalState } from "@/test-utils/global-state";

const actualAuth = await import("react-oidc-context");
const actualDictionary = await import("@/dictionaries/useDictionary");
const actualPersister = await import("@/lib/idb_persister");
const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "MutationObserver",
  "Node",
  "IS_REACT_ACT_ENVIRONMENT",
]);
const importDom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  window: importDom.window,
  document: importDom.window.document,
  navigator: importDom.window.navigator,
  HTMLElement: importDom.window.HTMLElement,
  MutationObserver: importDom.window.MutationObserver,
  Node: importDom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
});

const authState = {
  isAuthenticated: false,
  user: undefined,
  signinRedirect: async () => {},
};
mock.module("react-oidc-context", () => ({ useAuth: () => authState }));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => zh,
}));
mock.module("@/lib/idb_persister", () => ({
  createIDBPersister: () => ({
    persistClient: async () => {},
    restoreClient: async () => undefined,
    removeClient: async () => {},
  }),
}));

const { default: ReactQuery } = await import("@/components/ReactQuery");
const { onlineManager, useQueryClient } = await import("@tanstack/react-query");
const {
  getDefaultReviewInstructor,
  getDefaultReviewSemester,
  getReviewSemesterOptions,
  shouldShowCreateReviewAction,
  sortReviews,
  toggleExamStyles,
  validateReviewForm,
  ReviewsSection,
} = await import("@/components/Reviews/ReviewsSection");

let activeDom: JSDOM | undefined;
let activeRoot: Root | undefined;
let activeQueryClient: ReturnType<typeof useQueryClient> | undefined;
const originalFetch = globalThis.fetch;

const QueryClientProbe = () => {
  activeQueryClient = useQueryClient();
  return null;
};

const waitFor = async (condition: () => boolean, debug = () => "") => {
  for (let attempt = 0; attempt < 250; attempt += 1) {
    if (condition()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  throw new Error(`condition was not met: ${debug()}`);
};

afterEach(async () => {
  await act(async () => activeRoot?.unmount());
  activeQueryClient?.clear();
  onlineManager.setOnline(true);
  globalThis.fetch = originalFetch;
  activeDom?.window.close();
  activeRoot = undefined;
  activeQueryClient = undefined;
  activeDom = undefined;
  restoreGlobals();
  mock.module("react-oidc-context", () => actualAuth);
  mock.module("@/dictionaries/useDictionary", () => actualDictionary);
  mock.module("@/lib/idb_persister", () => actualPersister);
});

const review = (id: string, instructor: string, createdAt: string) => ({
  id,
  instructor,
  createdAt,
});

const valid = {
  instructor: "林教授",
  semester: "11310",
  workload: 3,
  grading: 4,
  learning: 5,
  examStyle: ["written"] as const,
  body: "這是一段超過三十個字的心得，描述課程內容、授課方式與評量安排，讓其他同學能夠做出適合自己的選課決定。",
};

describe("review form validation", () => {
  test("accepts a complete review", () => {
    expect(validateReviewForm(valid)).toBe(null);
  });

  test("requires ratings and an assessment style", () => {
    expect(validateReviewForm({ ...valid, workload: 0 })).toBe("required");
    expect(validateReviewForm({ ...valid, examStyle: [] })).toBe("required");
  });

  test("enforces the trimmed body length", () => {
    expect(validateReviewForm({ ...valid, body: "太短" })).toBe(
      "body_too_short",
    );
    expect(validateReviewForm({ ...valid, body: "x".repeat(3001) })).toBe(
      "body_too_long",
    );
  });

  test("keeps no exam mutually exclusive with other assessment styles", () => {
    expect(toggleExamStyles(["written"], "none", true)).toEqual(["none"]);
    expect(toggleExamStyles(["none"], "written", true)).toEqual(["written"]);
  });
});

describe("review form defaults", () => {
  test("uses the active instructor filter before the first unreviewed instructor", () => {
    expect(
      getDefaultReviewInstructor(
        ["胡敏君", "陳煥宗"],
        "陳煥宗",
        ["胡敏君"],
      ),
    ).toBe("陳煥宗");
    expect(
      getDefaultReviewInstructor(
        ["胡敏君", "陳煥宗"],
        "",
        ["胡敏君"],
      ),
    ).toBe("陳煥宗");
  });

  test("offers the selected instructor's semesters newest first", () => {
    const options = getReviewSemesterOptions(
      ["11310", "11410", "11510"],
      {
        陳煥宗: ["11310", "11510"],
        胡敏君: ["11410"],
      },
      "陳煥宗",
    );

    expect(options).toEqual(["11510", "11310"]);
    expect(getDefaultReviewSemester(options)).toBe("11510");
  });
});

describe("review header action", () => {
  test("hides the write action while a review form is open", () => {
    expect(
      shouldShowCreateReviewAction({
        isAuthenticated: true,
        hasModuleKey: true,
        instructorCount: 2,
        hasOwnReviewForTarget: false,
        formMode: "create",
      }),
    ).toBe(false);
  });
});

describe("review ordering", () => {
  const reviews = [
    review("old-offering", "Offering teacher", "2026-09-05T00:00:00.000Z"),
    review("new-other", "Other teacher", "2026-10-12T00:00:00.000Z"),
  ];

  test("module pages stay newest-first even when instructors are provided", () => {
    expect(
      sortReviews(reviews, ["Offering teacher", "Other teacher"], false),
    ).toEqual([reviews[1], reviews[0]]);
  });

  test("course pages prioritize the offering instructors before date ordering", () => {
    expect(sortReviews(reviews, ["Offering teacher"], true)).toEqual([
      reviews[0],
      reviews[1],
    ]);
  });
});

describe("review loading states", () => {
  test("keeps a paused failed first load in the skeleton instead of empty state", async () => {
    activeDom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/zh/courses/module/CS%3A1355",
    });
    Object.assign(globalThis, {
      window: activeDom.window,
      document: activeDom.window.document,
      navigator: activeDom.window.navigator,
      HTMLElement: activeDom.window.HTMLElement,
      MutationObserver: activeDom.window.MutationObserver,
      Node: activeDom.window.Node,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    onlineManager.setOnline(false);
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount += 1;
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    const container = document.createElement("div");
    activeRoot = createRoot(container);
    await act(async () => {
      activeRoot!.render(
        createElement(ReactQuery, null, createElement(QueryClientProbe)),
      );
    });
    // The browser build gets React Query's implicit retry default (3). Set
    // that browser default explicitly because Bun may load query-core before
    // the test DOM exists and otherwise classify this as a server query.
    activeQueryClient!.setDefaultOptions({
      queries: {
        networkMode: "offlineFirst",
        gcTime: 1000 * 60 * 60 * 24,
        retry: 3,
      },
    });
    await act(async () => {
      activeRoot!.render(
        createElement(
          ReactQuery,
          null,
          createElement(QueryClientProbe),
          createElement(ReviewsSection, {
            moduleKey: "CS:1355",
            instructors: ["林教授"],
          }),
        ),
      );
    });

    await waitFor(
      () => {
        const query = activeQueryClient?.getQueryCache().findAll({
          queryKey: ["reviews"],
        })[0];
        return fetchCount === 1 && query?.state.fetchStatus === "paused";
      },
      () =>
        JSON.stringify({
          fetchCount,
          queries: activeQueryClient
            ?.getQueryCache()
            .getAll()
            .map((query) => ({
              key: query.queryKey,
              status: query.state.status,
              fetchStatus: query.state.fetchStatus,
              error: query.state.error?.message,
            })),
        }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(container.textContent).toContain(
      zh.course.details.native_reviews.title,
    );
    expect(container.textContent).not.toContain(
      zh.course.details.native_reviews.empty,
    );
  });
});
