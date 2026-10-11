import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { usePageLocation } from "@/hooks/usePageLocation";
import { installTestDom } from "@/testDom";

let active: ReturnType<typeof installTestDom> | undefined;
let activeRouter: ReturnType<typeof createMemoryRouter> | undefined;
let activeRoot: ReturnType<typeof createRoot> | undefined;

const MetadataProbe = () => {
  const location = usePageLocation();
  const realLocation = useLocation();
  useEffect(() => {
    document.title = location.pathname;
    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = location.pathname;

    let jsonLd = document.head.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify({ url: location.pathname });
  }, [location]);
  return createElement(
    "p",
    null,
    `${realLocation.pathname}:${location.pathname}`,
  );
};

const renderRouter = () => {
  const router = createMemoryRouter(
    [{ path: "*", element: createElement(MetadataProbe) }],
    { initialEntries: ["/en/courses"] },
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  activeRouter = router;
  activeRoot = root;
  act(() => {
    root.render(createElement(RouterProvider, { router }));
  });
  return { router, root, container };
};

const metadataSnapshot = () => ({
  title: document.title,
  canonical: document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )?.href,
  jsonLd: document.head.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )?.textContent,
});

describe("page location metadata source", () => {
  afterEach(() => {
    act(() => activeRoot?.unmount());
    activeRouter?.dispose();
    activeRoot = undefined;
    activeRouter = undefined;
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    active?.restore();
    active = undefined;
  });

  test("keeps global metadata on the background while a dialog is open", async () => {
    active = installTestDom("/en/courses");
    const { router } = renderRouter();
    await act(async () => {});
    const before = metadataSnapshot();

    await act(async () =>
      router.navigate("/en/courses/11410-CS%201010%201", {
        state: {
          dialog: {
            background: {
              pathname: "/en/courses",
              search: "",
              hash: "",
              key: "background",
            },
          },
        },
      }),
    );
    expect(document.body.textContent).toContain(
      "/en/courses/11410-CS%201010%201:/en/courses",
    );
    expect(metadataSnapshot()).toEqual(before);

    await act(async () => router.navigate("/en/courses"));
    expect(metadataSnapshot()).toEqual(before);
  });
});
