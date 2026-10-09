import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, mock, test } from "bun:test";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const knownIssuesGet = mock(async () =>
  Response.json([
    {
      id: 42,
      number: 123,
      title: "Search issue",
      html_url: "https://github.com/example/issues/123",
      state: "open",
      body: "private report body",
      user: { login: "reporter" },
    },
  ]),
);
const issuePost = mock(async () => Response.json({ applied: [] }));

mock.module("@/config/api", () => ({
  default: {
    issue: {
      $get: knownIssuesGet,
      $post: issuePost,
    },
  },
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    forms: {
      issue: new Proxy({}, { get: (_target, property) => String(property) }),
    },
    issues: { form: { success: "submitted" } },
  }),
}));
const mockSettings = {
  useSettings: () => ({ darkMode: false, language: "en" }),
};
mock.module("@/hooks/contexts/settings", () => mockSettings);
mock.module("react-oidc-context", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
mock.module("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/en/courses" }),
}));
mock.module("react-turnstile", () => ({ default: () => null }));
mock.module("@/lib/gtag", () => ({ event: () => {} }));

const { default: EmptyIssueForm } = await import(
  "@/app/[lang]/(mods-pages)/(side-pages)/issues/EmptyIssueForm"
);
const { useIssueReport, useKnownIssues } = await import("./IssueReportForm");

const renderInQueryClient = async (element: React.ReactNode) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/en/issues",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    Node: dom.window.Node,
    DocumentFragment: dom.window.DocumentFragment,
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(QueryClientProvider, { client: queryClient }, element),
    );
  });
  return { container, dom, queryClient, root };
};

const waitFor = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
};

describe("issue report integration", () => {
  test("does not load known issues on the issues page until a title is typed", async () => {
    knownIssuesGet.mockClear();
    const rendered = await renderInQueryClient(createElement(EmptyIssueForm));

    await waitFor(() => false);
    expect(knownIssuesGet).not.toHaveBeenCalled();

    const title = rendered.container.querySelector(
      "#page-issue-title",
    ) as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(
      rendered.dom.window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setValue.call(title, "search issue");
      Simulate.change(title, { target: { value: "search issue" } });
    });

    await waitFor(() => knownIssuesGet.mock.calls.length === 1);
    expect(knownIssuesGet).toHaveBeenCalledTimes(1);
    expect(
      rendered.queryClient.getQueryData(["issue-report", "known"]),
    ).toEqual([
      {
        id: 42,
        number: 123,
        title: "Search issue",
        html_url: "https://github.com/example/issues/123",
        state: "open",
      },
    ]);

    await act(async () => rendered.root.unmount());
    rendered.queryClient.clear();
    rendered.dom.window.close();
  });

  test("accepts an old API success response without claiming diagnostics were attached", async () => {
    issuePost.mockResolvedValueOnce(Response.json({ id: 42 }));
    let report: ReturnType<typeof useIssueReport> | undefined;
    const Probe = () => {
      report = useIssueReport({ initialType: "suggestion" });
      return null;
    };
    const rendered = await renderInQueryClient(createElement(Probe));

    await act(async () => {
      report!.setTitle("A valid report title");
      report!.setDescription("A valid report description");
      report!.setToken("test-turnstile-token");
    });
    let submitted: boolean | undefined;
    await act(async () => {
      submitted = await report!.submit({ preventDefault: () => {} } as never);
    });

    expect(submitted).toBe(true);
    expect(report!.diagnosticsAttached).toBe(false);
    expect(report!.error).toBeNull();

    await act(async () => rendered.root.unmount());
    rendered.queryClient.clear();
    rendered.dom.window.close();
  });

  test("submits only once when two submit events arrive before a rerender", async () => {
    issuePost.mockClear();
    let report: ReturnType<typeof useIssueReport> | undefined;
    const Probe = () => {
      report = useIssueReport({ initialType: "suggestion" });
      return null;
    };
    const rendered = await renderInQueryClient(createElement(Probe));

    await act(async () => {
      report!.setTitle("A valid report title");
      report!.setDescription("A valid report description");
      report!.setToken("test-turnstile-token");
    });

    const event = { preventDefault: () => {} } as never;
    let submissions: boolean[] = [];
    await act(async () => {
      submissions = await Promise.all([
        report!.submit(event),
        report!.submit(event),
      ]);
    });

    expect(submissions).toEqual([true, false]);
    expect(issuePost).toHaveBeenCalledTimes(1);

    await act(async () => rendered.root.unmount());
    rendered.queryClient.clear();
    rendered.dom.window.close();
  });

  test("claims diagnostics only when the API echoes that field as applied", async () => {
    issuePost.mockResolvedValueOnce(
      Response.json({ applied: ["reportType", "reportArea", "diagnostics"] }),
    );
    let report: ReturnType<typeof useIssueReport> | undefined;
    const Probe = () => {
      report = useIssueReport({ initialType: "suggestion" });
      return null;
    };
    const rendered = await renderInQueryClient(createElement(Probe));

    await act(async () => {
      report!.setTitle("A valid report title");
      report!.setDescription("A valid report description");
      report!.setToken("test-turnstile-token");
      report!.setAttachDiagnostics(true);
    });
    await act(async () => {
      await report!.submit({ preventDefault: () => {} } as never);
    });

    expect(report!.diagnosticsAttached).toBe(true);

    await act(async () => rendered.root.unmount());
    rendered.queryClient.clear();
    rendered.dom.window.close();
  });
});
