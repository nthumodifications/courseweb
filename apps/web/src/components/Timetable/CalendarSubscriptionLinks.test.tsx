import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { describe, expect, jest, mock, test } from "bun:test";
import { buildCalendarSubscriptionLinks } from "@/lib/calendar-subscription";

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
const sharedDom = new JSDOM("<!doctype html><html><body></body></html>");
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
    getComputedStyle: sharedDom.window.getComputedStyle,
    MutationObserver: sharedDom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
};
installSharedDom();

const { CalendarSubscriptionLinkList, default: CalendarSubscriptionLinks } =
  await import("./CalendarSubscriptionLinks");

const withDom = () => {
  sharedDom.window.document.body.innerHTML = "";
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

describe("calendar subscription links markup", () => {
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
      reset?.dispatchEvent(
        new dom.window.MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: dom.window,
        }),
      );
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
      action?.click();
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
