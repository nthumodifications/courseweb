import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("react-oidc-context", () => ({
  useAuth: () => ({ user: undefined }),
}));
mock.module("./contexts/useUserTimetable", () => ({
  default: () => ({
    courses: {},
    semester: undefined,
    getSemesterCourses: () => [],
  }),
}));

const { useAIChat } = await import("./useAIChat");
type HookResult = ReturnType<typeof useAIChat>;

const originalFetch = globalThis.fetch;
const fetchMock = mock(
  async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) =>
    new Response(),
);
let active: { dom: JSDOM; root: Root } | undefined;

const setupDom = () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  return dom;
};

const streamResponse = (...events: Record<string, unknown>[]) =>
  new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    { headers: { "Content-Type": "text/event-stream" } },
  );

const renderChat = async () => {
  const dom = setupDom();
  let result: HookResult | undefined;
  const Probe = () => {
    result = useAIChat({ apiEndpoint: "http://localhost/chat" });
    return null;
  };
  const root = createRoot(document.createElement("div"));
  active = { dom, root };
  await act(async () => {
    root.render(createElement(Probe));
  });
  return { getResult: () => result };
};

afterEach(async () => {
  if (active) {
    await act(async () => active?.root.unmount());
    active.dom.window.close();
    active = undefined;
  }
  fetchMock.mockReset();
  globalThis.fetch = originalFetch;
});

describe("useAIChat empty completed streams", () => {
  test("removes a blank placeholder, reports an error, and retries the prompt", async () => {
    const requestBodies: string[] = [];
    fetchMock.mockImplementation(async (_input, init) => {
      requestBodies.push(String(init?.body));
      return requestBodies.length === 1
        ? streamResponse({ type: "done" })
        : streamResponse(
            { type: "text", data: "Retry answer" },
            { type: "done" },
          );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const rendered = await renderChat();

    await act(async () => {
      await rendered.getResult()?.sendMessage("Try this");
    });
    expect(rendered.getResult()?.messages).toHaveLength(1);
    expect(rendered.getResult()?.messages[0]?.role).toBe("user");
    expect(rendered.getResult()?.error).toBe(
      "The AI service is temporarily unavailable.",
    );
    expect(rendered.getResult()?.chatError?.code).toBe("unavailable");

    await act(async () => {
      await rendered.getResult()?.retryLastMessage();
    });
    expect(requestBodies).toHaveLength(2);
    expect(JSON.parse(requestBodies[1]!).messages.at(-1)).toEqual({
      role: "user",
      content: "Try this",
    });
    expect(rendered.getResult()?.messages.at(-1)?.content).toBe("Retry answer");
  });

  test("keeps a tool-only completed stream", async () => {
    fetchMock.mockImplementation(async () =>
      streamResponse(
        {
          type: "tool_call",
          data: { name: "search_courses", args: { query: "AI" } },
        },
        {
          type: "tool_result",
          data: { name: "search_courses", result: { count: 1 } },
        },
        { type: "done" },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const rendered = await renderChat();

    await act(async () => {
      await rendered.getResult()?.sendMessage("Search");
    });
    const assistant = rendered
      .getResult()
      ?.messages.find((message) => message.role === "assistant");
    expect(assistant).toMatchObject({
      content: "",
      isStreaming: false,
      toolCalls: [
        {
          name: "search_courses",
          args: { query: "AI" },
          result: { count: 1 },
        },
      ],
    });
    expect(rendered.getResult()?.error).toBeNull();
    expect(rendered.getResult()?.chatError).toBeNull();
  });
});
