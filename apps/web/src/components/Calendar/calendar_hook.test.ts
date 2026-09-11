import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, describe, expect, mock, test } from "bun:test";
import { fromZonedTime } from "date-fns-tz";
import type {
  CalendarEventInternal,
  DisplayCalendarEvent,
} from "./calendar.types";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

const actualRxdbHooks = await import("rxdb-hooks");
const actualOidcContext = await import("react-oidc-context");
const actualAuth = await import("@/config/auth");
const actualRxdb = await import("@/config/rxdb");

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const updateDocument = mock(async (_change: unknown) => {});
const removeDocument = mock(async () => {});
const rootDocument = {
  toJSON: () => ({
    id: "event-1",
    title: "Calendar event",
    allDay: false,
    start: "2026-09-10T01:00:00.000Z",
    end: "2026-09-10T02:00:00.000Z",
    repeat: {
      type: "daily",
      interval: 1,
      mode: "count",
      value: 5,
    },
    color: "#000000",
    tag: "other",
    actualEnd: "2026-09-14T02:00:00.000Z",
    excludedDates: [],
    parentId: "",
    courseId: null,
  }),
  update: updateDocument,
  remove: removeDocument,
};
const eventsCollection = {
  find: () => ({}),
  findOne: () => rootDocument,
};

mock.module("rxdb-hooks", () => ({
  useRxCollection: (name: string) =>
    name === "events" ? eventsCollection : null,
  useRxQuery: () => ({ result: [rootDocument] }),
}));
mock.module("react-oidc-context", () => ({
  useAuth: () => ({ isAuthenticated: false, user: undefined }),
}));
mock.module("@/config/auth", () => ({ default: {} }));
mock.module("@/config/rxdb", () => ({
  getCalendarDatabaseName: () => "test-calendar",
  hasCalendarScope: () => false,
  migrateEventToV2: (document: unknown) => document,
}));

const { UpdateType, useCalendarProvider } = await import("./calendar_hook");

afterAll(() => {
  mock.module("rxdb-hooks", () => actualRxdbHooks);
  mock.module("react-oidc-context", () => actualOidcContext);
  mock.module("@/config/auth", () => actualAuth);
  mock.module("@/config/rxdb", () => actualRxdb);
});

const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, "Asia/Taipei");

const toCalendarEvent = (value: ReturnType<typeof rootDocument.toJSON>) =>
  ({
    ...value,
    start: taipeiDate("2026-09-10T09:00"),
    end: taipeiDate("2026-09-10T10:00"),
    actualEnd: taipeiDate("2026-09-14T10:00"),
    repeat: {
      type: "daily" as const,
      interval: 1,
      mode: "count" as const,
      value: 5,
    },
    excludedDates: [],
  }) as CalendarEventInternal;

const operationEvent = (
  event: CalendarEventInternal,
  displayStart: Date,
  displayEnd: Date,
) =>
  ({
    ...event,
    displayStart,
    displayEnd,
  }) as DisplayCalendarEvent;

const renderProvider = async () => {
  const dom = new JSDOM("<div id='root'></div>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
  });
  let value: ReturnType<typeof useCalendarProvider> | undefined;
  const Probe = () => {
    value = useCalendarProvider();
    return null as ReactNode;
  };
  const root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => {
    root.render(createElement(Probe));
  });
  return { root, value: value! };
};

describe("calendar hook recurrence operations", () => {
  test("edit-all keeps the stored series root when editing a later occurrence", async () => {
    updateDocument.mockClear();
    const { root, value } = await renderProvider();
    const current = toCalendarEvent(rootDocument.toJSON());
    const edited = {
      ...current,
      title: "Edited series",
      start: taipeiDate("2026-09-12T11:00"),
      end: taipeiDate("2026-09-12T12:00"),
    };

    await act(async () => {
      await value.updateEvent(
        edited,
        operationEvent(
          current,
          taipeiDate("2026-09-12T09:00"),
          taipeiDate("2026-09-12T10:00"),
        ),
        UpdateType.ALL,
      );
    });

    const change = updateDocument.mock.calls[0]?.[0] as {
      $set: { start: string; end: string; actualEnd: string };
    };
    expect(change.$set.start).toBe(
      taipeiDate("2026-09-10T11:00").toISOString(),
    );
    expect(change.$set.end).toBe(taipeiDate("2026-09-10T12:00").toISOString());
    expect(change.$set.actualEnd).toBe(
      taipeiDate("2026-09-14T12:00").toISOString(),
    );
    await act(async () => {
      root.unmount();
    });
  });

  test("delete-following keeps a count rule and truncates its count", async () => {
    updateDocument.mockClear();
    removeDocument.mockClear();
    const { root, value } = await renderProvider();
    const current = toCalendarEvent(rootDocument.toJSON());

    await act(async () => {
      await value.removeEvent(
        operationEvent(
          current,
          taipeiDate("2026-09-12T09:00"),
          taipeiDate("2026-09-12T10:00"),
        ),
        UpdateType.FOLLOWING,
      );
    });

    const change = updateDocument.mock.calls[0]?.[0] as {
      $set: {
        repeat: { mode: string; value: number };
        actualEnd: string;
      };
    };
    expect(change.$set.repeat).toMatchObject({ mode: "count", value: 2 });
    expect(change.$set.actualEnd).toBe(
      taipeiDate("2026-09-11T10:00").toISOString(),
    );
    expect(removeDocument).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });
});
