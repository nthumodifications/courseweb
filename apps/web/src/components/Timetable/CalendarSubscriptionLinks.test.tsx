import {
  act,
  cloneElement,
  createElement,
  isValidElement,
  useCallback,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import * as actualUi from "@courseweb/ui";
import * as actualUsehooksTs from "usehooks-ts";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  mock,
  test,
} from "bun:test";
import { buildCalendarSubscriptionLinks } from "@/lib/calendar-subscription";
import { captureGlobalState } from "@/test-utils/global-state";
const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "HTMLElement",
  "Node",
  "Element",
  "Event",
  "MouseEvent",
  "CustomEvent",
  "StorageEvent",
  "navigator",
  "getComputedStyle",
  "MutationObserver",
  "IS_REACT_ACT_ENVIRONMENT",
]);

const authState: {
  isAuthenticated: boolean;
  user?: { access_token: string };
} = { isAuthenticated: false };
const feedGet = mock(
  async () =>
    new Response(
      JSON.stringify({
        url: "https://auth.example.test/api/calendar/ics/user?token=live-token",
        webcalUrl:
          "webcal://auth.example.test/api/calendar/ics/user?token=live-token",
        createdAt: "2026-10-14T00:00:00.000Z",
      }),
      { status: 200 },
    ),
);
const feedRotate = mock(
  async () =>
    new Response(
      JSON.stringify({
        url: "https://auth.example.test/api/calendar/ics/user?token=rotated-token",
        webcalUrl:
          "webcal://auth.example.test/api/calendar/ics/user?token=rotated-token",
        createdAt: "2026-10-14T00:00:00.000Z",
      }),
      { status: 200 },
    ),
);

const labels = {
  google: "Add to Google Calendar",
  apple: "Add to Apple Calendar",
  outlook: "Outlook",
  copy_link: "Copy link",
  copied: "Copied",
  copied_description: "Link copied to clipboard",
  calendar_name: "NTHUMods Timetable",
  include: "Include",
  classes: "Classes",
  events: "My events",
  academic: "Academic calendar",
  subscription_hint: "Subscriptions update automatically.",
  signed_out_hint: "Sign in to get a link that follows your timetable.",
  reset_link: "Reset link",
  resetting_link: "Resetting link…",
  reset_hint: "Old subscriptions stop updating after you reset the link.",
  reset_error: "Could not reset the calendar link.",
  live_feed_error: "Live link unavailable; this link will not follow changes.",
  retry_live_feed: "Try again",
  reset_confirm_title: "Reset calendar link?",
  reset_confirm_description:
    "Existing subscriptions on every device will stop updating.",
  reset_confirm_cancel: "Cancel",
  reset_confirm_action: "Reset link",
};

mock.module("react-oidc-context", () => ({
  useAuth: () => authState,
}));
mock.module("@/config/auth", () => ({
  default: {
    api: {
      calendar: {
        feed: { $get: feedGet, rotate: { $post: feedRotate } },
      },
    },
  },
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({ dialogs: { ShareSyncTimetableDialog: { links: labels } } }),
}));
const sharedDom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://app.example.test/",
});
const installSharedDom = () => {
  Object.assign(globalThis, {
    window: sharedDom.window,
    document: sharedDom.window.document,
    HTMLElement: sharedDom.window.HTMLElement,
    Node: sharedDom.window.Node,
    Element: sharedDom.window.Element,
    Event: sharedDom.window.Event,
    MouseEvent: sharedDom.window.MouseEvent,
    CustomEvent: sharedDom.window.CustomEvent,
    StorageEvent: sharedDom.window.StorageEvent,
    navigator: sharedDom.window.navigator,
    getComputedStyle: sharedDom.window.getComputedStyle,
    MutationObserver: sharedDom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
};

const withDom = () => {
  sharedDom.window.document.body.innerHTML = "";
  sharedDom.window.localStorage.clear();
  installSharedDom();
  return sharedDom;
};

const renderComponent = async (feedUrl: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(CalendarSubscriptionLinks, { feedUrl }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { container, root };
};

const useTestLocalStorage = <T,>(
  key: string,
  initialValue: T,
  options?: { deserializer?: (value: string) => T },
): [T, (next: T | ((previous: T) => T)) => void] => {
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return initialValueRef.current;
      return options?.deserializer
        ? options.deserializer(raw)
        : (JSON.parse(raw) as T);
    } catch {
      return initialValueRef.current;
    }
  }, [key, options?.deserializer]);
  const [value, setValue] = useState(read);
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const nextValue =
          typeof next === "function"
            ? (next as (previous: T) => T)(previous)
            : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // The component should keep working when storage is unavailable.
        }
        return nextValue;
      });
    },
    [key],
  );
  return [value, update];
};

installSharedDom();

mock.module("usehooks-ts", () => ({
  useLocalStorage: useTestLocalStorage,
}));
const testButton = ({ asChild, children, ...props }: Record<string, any>) =>
  asChild && isValidElement(children)
    ? cloneElement(children, props)
    : createElement("button", props, children);
const testCheckbox = ({
  checked,
  onCheckedChange,
  ...props
}: Record<string, any>) =>
  createElement("button", {
    ...props,
    role: "checkbox",
    type: "button",
    "data-state": checked ? "checked" : "unchecked",
    onClick: () => onCheckedChange?.(!checked),
  });
const testContainer = ({ children, ...props }: Record<string, any>) =>
  createElement("div", props, children);
const testDialog = ({ open, children }: Record<string, any>) =>
  open ? testContainer({ children }) : null;
mock.module("@courseweb/ui", () => ({
  AlertDialog: testDialog,
  AlertDialogAction: testButton,
  AlertDialogCancel: testButton,
  AlertDialogContent: testContainer,
  AlertDialogDescription: testContainer,
  AlertDialogFooter: testContainer,
  AlertDialogHeader: testContainer,
  AlertDialogTitle: testContainer,
  Button: testButton,
  Checkbox: testCheckbox,
  toast: () => undefined,
}));
const { CalendarSubscriptionLinkList, default: CalendarSubscriptionLinks } =
  await import("./CalendarSubscriptionLinks");
mock.module("@courseweb/ui", () => actualUi);
mock.module("usehooks-ts", () => actualUsehooksTs);

describe("calendar subscription links markup", () => {
  beforeEach(() => {
    mock.module("react-oidc-context", () => ({
      useAuth: () => authState,
    }));
    mock.module("@/config/auth", () => ({
      default: {
        api: {
          calendar: {
            feed: { $get: feedGet, rotate: { $post: feedRotate } },
          },
        },
      },
    }));
    mock.module("@/dictionaries/useDictionary", () => ({
      default: () => ({
        dialogs: { ShareSyncTimetableDialog: { links: labels } },
      }),
    }));
    mock.module("usehooks-ts", () => ({
      useLocalStorage: useTestLocalStorage,
    }));
    mock.module("@courseweb/ui", () => ({
      AlertDialog: testDialog,
      AlertDialogAction: testButton,
      AlertDialogCancel: testButton,
      AlertDialogContent: testContainer,
      AlertDialogDescription: testContainer,
      AlertDialogFooter: testContainer,
      AlertDialogHeader: testContainer,
      AlertDialogTitle: testContainer,
      Button: testButton,
      Checkbox: testCheckbox,
      toast: () => undefined,
    }));
  });

  afterEach(() => {
    authState.isAuthenticated = false;
    delete authState.user;
    feedGet.mockReset();
    feedGet.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            url: "https://auth.example.test/api/calendar/ics/user?token=live-token",
            webcalUrl:
              "webcal://auth.example.test/api/calendar/ics/user?token=live-token",
            createdAt: "2026-10-14T00:00:00.000Z",
          }),
          { status: 200 },
        ),
    );
    feedRotate.mockReset();
    feedRotate.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            url: "https://auth.example.test/api/calendar/ics/user?token=rotated-token",
            webcalUrl:
              "webcal://auth.example.test/api/calendar/ics/user?token=rotated-token",
            createdAt: "2026-10-14T00:00:00.000Z",
          }),
          { status: 200 },
        ),
    );
    jest.useRealTimers();
    sharedDom.window.document.body.innerHTML = "";
    try {
      sharedDom.window.localStorage.clear();
    } catch {
      // The throwing-storage test restores localStorage in its own finally block.
    }
    restoreGlobals();
  });

  test("keeps provider links in the existing left-aligned button contract", () => {
    const feedUrl =
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510";
    const links = buildCalendarSubscriptionLinks(feedUrl, labels.calendar_name);
    const markup = renderToStaticMarkup(
      <div className="flex flex-col space-y-2">
        <CalendarSubscriptionLinkList
          links={links}
          labels={labels}
          onCopy={() => undefined}
        />
      </div>,
    );

    const anchorPattern = /<a /g;
    let anchorCount = 0;
    while (anchorPattern.exec(markup) !== null) anchorCount += 1;

    expect(anchorCount).toBe(3);
    expect(markup).toContain("w-full justify-start");
    expect(markup).toContain(labels.copy_link);
    expect(markup).toContain(feedUrl);
  });

  test("uses the static feed and signed-out hint when signed out", async () => {
    authState.isAuthenticated = false;
    delete authState.user;
    withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    expect(container.querySelector('a[href*="api.nthumods.com"]')).toBeTruthy();
    expect(container.textContent).toContain(labels.signed_out_hint);
    expect(feedGet).not.toHaveBeenCalled();

    await act(async () => root.unmount());
  });

  test("loads the live URL for signed-in users and rotates it", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "access-token" };
    feedGet.mockClear();
    feedRotate.mockClear();
    const dom = withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    expect(feedGet).toHaveBeenCalledTimes(1);
    expect(container.querySelector('a[href*="live-token"]')).toBeTruthy();
    expect(container.textContent).toContain(labels.subscription_hint);

    const reset = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes(labels.reset_link),
    );
    expect(reset).toBeTruthy();
    await act(async () => {
      reset?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(feedRotate).toHaveBeenCalledTimes(0);

    await act(async () => root.unmount());
  });

  test("rebuilds all subscription URLs when an include checkbox changes", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "include-token" };
    feedGet.mockReset();
    feedGet.mockResolvedValue(
      new Response(
        JSON.stringify({
          webcalUrl: "webcal://auth.example.test/live-token",
        }),
        { status: 200 },
      ),
    );
    const dom = withDom();
    let copiedUrl = "";
    Object.defineProperty(dom.window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => (copiedUrl = value) },
    });
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    expect(checkboxes).toHaveLength(3);
    await act(async () => {
      (checkboxes[1] as HTMLElement).click();
      await Promise.resolve();
    });

    const anchors = [...container.querySelectorAll("a")];
    expect(anchors).toHaveLength(3);
    expect(anchors[0]?.getAttribute("href")).toContain(
      encodeURIComponent("include=classes%2Cacademic"),
    );
    expect(anchors[1]?.getAttribute("href")).toContain(
      "include=classes%2Cacademic",
    );
    expect(anchors[2]?.getAttribute("href")).toContain(
      "include%3Dclasses%252Cacademic",
    );
    const copy = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes(labels.copy_link),
    );
    await act(async () => {
      copy?.click();
      await Promise.resolve();
    });
    expect(copiedUrl).toContain("include=classes%2Cacademic");

    await act(async () => root.unmount());
    void dom;
  });

  test("disables subscription buttons when every include is off", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "all-off-token" };
    feedGet.mockReset();
    feedGet.mockResolvedValue(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/live-token" }),
        { status: 200 },
      ),
    );
    const dom = withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );
    const checkboxes = container.querySelectorAll('[role="checkbox"]');

    await act(async () => {
      checkboxes.forEach((checkbox) => (checkbox as HTMLElement).click());
      await Promise.resolve();
    });

    expect(container.querySelectorAll("button:disabled")).toHaveLength(4);
    await act(async () => root.unmount());
    void dom;
  });

  test("restores the persisted include choice", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "persisted-token" };
    feedGet.mockReset();
    feedGet.mockResolvedValue(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/live-token" }),
        { status: 200 },
      ),
    );
    const dom = withDom();
    dom.window.localStorage.setItem(
      "calendar_subscription_includes",
      JSON.stringify({ classes: false, events: true, academic: false }),
    );
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    const checkboxes = [...container.querySelectorAll('[role="checkbox"]')];
    expect(
      checkboxes.map((checkbox) => checkbox.getAttribute("data-state")),
    ).toEqual(["unchecked", "checked", "unchecked"]);
    await act(async () => root.unmount());
    void dom;
  });

  test.each(["null", "[]", '{"classes":"x"}', "invalid-json"])(
    "uses default includes for malformed persisted value %s",
    async (value) => {
      authState.isAuthenticated = true;
      authState.user = { access_token: "invalid-persisted-token" };
      feedGet.mockReset();
      feedGet.mockResolvedValue(
        new Response(
          JSON.stringify({
            webcalUrl: "webcal://auth.example.test/live-token",
          }),
          { status: 200 },
        ),
      );
      const dom = withDom();
      dom.window.localStorage.setItem("calendar_subscription_includes", value);
      const { container, root } = await renderComponent(
        "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
      );

      expect(
        [...container.querySelectorAll('[role="checkbox"]')].map((checkbox) =>
          checkbox.getAttribute("data-state"),
        ),
      ).toEqual(["checked", "checked", "checked"]);
      await act(async () => root.unmount());
      void dom;
    },
  );

  test("uses default includes when localStorage throws while reading", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "throwing-storage-token" };
    feedGet.mockReset();
    feedGet.mockResolvedValue(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/live-token" }),
        { status: 200 },
      ),
    );
    const dom = withDom();
    const storage = dom.window.localStorage;
    Object.defineProperty(dom.window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("storage unavailable");
      },
    });

    try {
      const { container, root } = await renderComponent(
        "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
      );
      expect(
        [...container.querySelectorAll('[role="checkbox"]')].map((checkbox) =>
          checkbox.getAttribute("data-state"),
        ),
      ).toEqual(["checked", "checked", "checked"]);
      await act(async () => root.unmount());
    } finally {
      Object.defineProperty(dom.window, "localStorage", {
        configurable: true,
        value: storage,
      });
    }
  });

  test("labels a failed live-feed request as static and offers retry", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "access-token" };
    feedGet.mockClear();
    feedGet.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const dom = withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    expect(container.querySelector('a[href*="api.nthumods.com"]')).toBeTruthy();
    expect(container.textContent).toContain(labels.live_feed_error);
    expect(container.textContent).not.toContain(labels.subscription_hint);
    expect(container.textContent).toContain(labels.retry_live_feed);

    await act(async () => root.unmount());
  });

  test("does not enable static subscriptions while the live URL loads", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "loading-token" };
    let resolveFeed!: (response: Response) => void;
    feedGet.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveFeed = resolve)),
    );
    const dom = withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    expect(
      container.querySelectorAll('a[href*="api.nthumods.com"]'),
    ).toHaveLength(0);
    resolveFeed(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/live" }),
        { status: 200 },
      ),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    await act(async () => root.unmount());
  });

  test("shows the failed-fetch state and aborts a live-feed request after 8 seconds", async () => {
    jest.useFakeTimers();
    try {
      authState.isAuthenticated = true;
      authState.user = { access_token: "timeout-token" };
      feedGet.mockReset();
      let signal!: AbortSignal;
      feedGet.mockImplementationOnce(
        (_input: unknown, options: { signal?: AbortSignal }) =>
          new Promise<Response>((_, reject) => {
            signal = options.signal!;
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );
      const dom = withDom();
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(CalendarSubscriptionLinks, {
            feedUrl:
              "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
          }),
        );
        await Promise.resolve();
      });

      jest.advanceTimersByTime(8_000);
      await act(async () => await Promise.resolve());

      expect(signal.aborted).toBe(true);
      expect(container.textContent).toContain(labels.live_feed_error);
      expect(container.textContent).toContain(labels.retry_live_feed);
      await act(async () => root.unmount());
      void dom;
    } finally {
      jest.useRealTimers();
    }
  });

  test("submits exactly one reset when the confirmation action is double-clicked", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "reset-token" };
    feedGet.mockReset();
    feedGet.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            webcalUrl: "webcal://auth.example.test/live-token",
          }),
          { status: 200 },
        ),
    );
    feedRotate.mockClear();
    let resolveRotate!: (response: Response) => void;
    feedRotate.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveRotate = resolve)),
    );
    const dom = withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );
    const reset = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes(labels.reset_link),
    );
    await act(async () => {
      reset?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const action = [...document.body.querySelectorAll("button")]
      .reverse()
      .find((button) =>
        button.textContent?.includes(labels.reset_confirm_action),
      );
    expect(action).toBeTruthy();
    await act(async () => {
      action?.click();
      await Promise.resolve();
      action?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(feedRotate).toHaveBeenCalledTimes(1);
    resolveRotate(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/rotated" }),
        {
          status: 200,
        },
      ),
    );
    await act(
      async () => await new Promise((resolve) => setTimeout(resolve, 0)),
    );
    await act(async () => root.unmount());
  });

  test("ignores a live-feed response after the access token changes", async () => {
    authState.isAuthenticated = true;
    authState.user = { access_token: "old-token" };
    let resolveOld!: (response: Response) => void;
    feedGet.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveOld = resolve)),
    );
    const dom = withDom();
    const { container, root } = await renderComponent(
      "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
    );

    authState.user = { access_token: "new-token" };
    feedGet.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/new" }),
        {
          status: 200,
        },
      ),
    );
    await act(async () => {
      root.render(
        createElement(CalendarSubscriptionLinks, {
          feedUrl:
            "webcal://api.nthumods.com/timetable/calendar.ics?semester=11510",
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    resolveOld(
      new Response(
        JSON.stringify({ webcalUrl: "webcal://auth.example.test/old" }),
        {
          status: 200,
        },
      ),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(container.querySelector('a[href*="/new"]')).toBeTruthy();
    expect(container.querySelector('a[href*="/old"]')).toBeNull();
    await act(async () => root.unmount());
  });
});
