import { act, createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import GoogleAnalytics from "./GoogleAnalytics";
import { useGTMPageTracking } from "@/hooks/useGTMPageTracking";
import { installTestDom } from "@/testDom";

const views: string[] = [];

const testDom = installTestDom("/en/courses");
window.dataLayer = [];
(globalThis.window as typeof window & { gtag?: unknown }).gtag = (
  _command: string,
  _trackingId: string,
  options: { page_path: string },
) => views.push(options.page_path);

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
  afterAll(() => {
    testDom.restore();
    testDom.dom.window.close();
  });

  afterEach(() => {
    views.length = 0;
    window.dataLayer = [];
    document.body.innerHTML = "";
  });

  test("tracks each dialog step once and not the close", async () => {
    const { router, root } = renderRouter();
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
    root.unmount();
  });
});
