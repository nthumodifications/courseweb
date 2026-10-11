import { act, createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import GoogleAnalytics from "./GoogleAnalytics";
import { useGTMPageTracking } from "@/hooks/useGTMPageTracking";
import { installTestDom } from "@/testDom";

const views: string[] = [];

let active: ReturnType<typeof installTestDom> | undefined;
let activeRouter: ReturnType<typeof createMemoryRouter> | undefined;
let activeRoot: ReturnType<typeof createRoot> | undefined;

const renderRouter = () => {
  const GtmTracker = () => {
    useGTMPageTracking();
    return null;
  };
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: createElement(
          Fragment,
          null,
          createElement(GoogleAnalytics),
          createElement(GtmTracker),
        ),
      },
    ],
    { initialEntries: ["/en/courses"] },
  );
  const root = createRoot(document.createElement("div"));
  activeRouter = router;
  activeRoot = root;
  act(() => {
    root.render(createElement(RouterProvider, { router }));
  });
  return { router, root };
};

const dialogState = {
  dialog: {
    background: {
      pathname: "/en/courses",
      search: "",
      hash: "",
      key: "background",
    },
  },
};

describe("Google Analytics dialog page views", () => {
  afterEach(() => {
    act(() => activeRoot?.unmount());
    activeRouter?.dispose();
    activeRoot = undefined;
    activeRouter = undefined;
    views.length = 0;
    window.dataLayer = [];
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    active?.restore();
    active = undefined;
  });

  test("tracks each dialog step once and not the close", async () => {
    active = installTestDom("/en/courses");
    window.dataLayer = [];
    (globalThis.window as typeof window & { gtag?: unknown }).gtag = (
      _command: string,
      _trackingId: string,
      options: { page_path: string },
    ) => views.push(options.page_path);
    const { router } = renderRouter();
    await act(async () => {});
    await act(async () =>
      router.navigate("/en/courses/11410-CS%201010%201", {
        state: dialogState,
      }),
    );
    await act(async () =>
      router.navigate("/en/courses/instructor/Alice", {
        state: dialogState,
      }),
    );
    await act(async () =>
      router.navigate("/en/courses/11410-CS%201010%201", {
        state: dialogState,
      }),
    );
    await act(async () => router.navigate("/en/courses"));

    expect(views).toEqual([
      "/en/courses",
      "/en/courses/11410-CS%201010%201",
      "/en/courses/instructor/Alice",
      "/en/courses/11410-CS%201010%201",
    ]);
    expect(
      window.dataLayer
        ?.filter((entry) => entry.event === "pageview")
        .map((entry) => entry["page.path"]),
    ).toEqual(views);
  });
});
