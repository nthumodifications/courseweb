import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

const originalEnvironment = {
  VITE_COURSEWEB_API_URL: process.env.VITE_COURSEWEB_API_URL,
  VITE_NTHUMODS_AUTH_URL: process.env.VITE_NTHUMODS_AUTH_URL,
};
process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

const previousOidcContext = await import("react-oidc-context");
mock.module("react-oidc-context", () => ({
  useAuth: () => ({ user: undefined }),
}));

const { useAIChat } = await import("./useAIChat");
mock.module("react-oidc-context", () => previousOidcContext);
for (const [key, value] of Object.entries(originalEnvironment)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
type HookResult = ReturnType<typeof useAIChat>;

let active: { dom: JSDOM; root: Root } | undefined;
let fetchSpy: ReturnType<typeof spyOn> | undefined;

const globalKeys = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "IS_REACT_ACT_ENVIRONMENT",
] as const;
const originalGlobals = new Map(
  globalKeys.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);

const restoreGlobal = (key: (typeof globalKeys)[number]) => {
  const descriptor = originalGlobals.get(key);
  if (descriptor) Object.defineProperty(globalThis, key, descriptor);
  else Reflect.deleteProperty(globalThis, key);
};

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

const sendMessage = async (
  rendered: Awaited<ReturnType<typeof renderChat>>,
  prompt: string,
) => {
  await act(async () => {
    await rendered.getResult()?.sendMessage(prompt);
  });
};

afterEach(async () => {
  try {
    if (active) {
      await act(async () => active?.root.unmount());
      active.dom.window.close();
      active = undefined;
    }
  } finally {
    fetchSpy?.mockRestore();
    fetchSpy = undefined;
    for (const key of globalKeys) restoreGlobal(key);
  }
});

const installFetch = (implementation: typeof fetch) => {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(implementation);
};

describe("useAIChat empty completed streams", () => {
  test("removes a blank placeholder, reports an error, and retries the prompt", async () => {
    const requestBodies: string[] = [];
    installFetch(async (_input, init) => {
      requestBodies.push(String(init?.body));
      return requestBodies.length === 1
        ? streamResponse({ type: "done" })
        : streamResponse(
            { type: "text", data: "Retry answer" },
            { type: "done" },
          );
    });
    const rendered = await renderChat();

    await sendMessage(rendered, "Try this");
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
    installFetch(async () =>
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
    const rendered = await renderChat();

    await sendMessage(rendered, "Search");
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
