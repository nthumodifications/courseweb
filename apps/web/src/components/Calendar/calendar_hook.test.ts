import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { fromZonedTime } from "date-fns-tz";
import type {
  CalendarEvent,
  CalendarEventInternal,
  DisplayCalendarEvent,
} from "./calendar.types";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
process.env.VITE_NTHUMODS_AUTH_URL ??= "https://auth.example.test";

mock.module("@/config/auth", () => ({ default: {} }));

const actualRxdbHooks = await import("rxdb-hooks");
const actualOidcContext = await import("react-oidc-context");
const actualAuth = await import("@/config/auth");
const actualRxdb = await import("@/config/rxdb");

const previousReactActEnvironment = (
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const updateDocument = mock(async (_change: unknown) => {});
const removeDocument = mock(async () => {});
const insertDocument = mock(async (_change: unknown) => {});
const upsertDocument = mock(async (_change: unknown) => {});
const removeChildren = mock(async () => {});
const findDocument = mock((_query?: unknown) => ({}));
type StoredEvent = {
  id: string;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
  repeat: CalendarEvent["repeat"];
  color: string;
  tag: string;
  actualEnd: string | null;
  excludedDates: string[];
  parentId: string;
  courseId: string | null;
};

let storedEvent: StoredEvent = {
  id: "event-1",
  title: "Calendar event",
  allDay: false,
  start: "2026-09-10T01:00:00.000Z",
  end: "2026-09-10T02:00:00.000Z",
  repeat: {
    type: "daily" as const,
    interval: 1,
    mode: "count" as const,
    value: 5,
  },
  color: "#000000",
  tag: "other",
  actualEnd: "2026-09-14T02:00:00.000Z",
  excludedDates: [] as string[],
  parentId: "",
  courseId: null,
};
const rootDocument = {
  toJSON: () => storedEvent,
  update: updateDocument,
  remove: removeDocument,
};
const eventsCollection = {
  find: findDocument,
  findOne: () => rootDocument,
  insert: insertDocument,
  upsert: upsertDocument,
};
findDocument.mockImplementation((query?: unknown) =>
  query ? { remove: removeChildren } : {},
);

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

const {
  UpdateType,
  combinedReplicationStatus,
  isNotAuthorisedReplicationError,
  useCalendarProvider,
} = await import("./calendar_hook");

let restoreDom: (() => void) | undefined;

afterAll(() => {
  restoreDom?.();
  if (previousReactActEnvironment === undefined) {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT;
  } else {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = previousReactActEnvironment;
  }
  mock.module("rxdb-hooks", () => actualRxdbHooks);
  mock.module("react-oidc-context", () => actualOidcContext);
  mock.module("@/config/auth", () => actualAuth);
  mock.module("@/config/rxdb", () => actualRxdb);
});

afterEach(() => {
  restoreDom?.();
  restoreDom = undefined;
  storedEvent = {
    ...storedEvent,
    repeat: {
      type: "daily",
      interval: 1,
      mode: "count",
      value: 5,
    },
    actualEnd: "2026-09-14T02:00:00.000Z",
    excludedDates: [],
  };
  updateDocument.mockClear();
  removeDocument.mockClear();
  insertDocument.mockClear();
  upsertDocument.mockClear();
  removeChildren.mockClear();
  findDocument.mockClear();
});

const taipeiDate = (value: string) =>
  fromZonedTime(`${value}:00.000`, "Asia/Taipei");

const toCalendarEvent = (value: ReturnType<typeof rootDocument.toJSON>) =>
  ({
    ...value,
    start: taipeiDate("2026-09-10T09:00"),
    end: taipeiDate("2026-09-10T10:00"),
    actualEnd: value.actualEnd ? new Date(value.actualEnd) : null,
    repeat: value.repeat,
    excludedDates: value.excludedDates.map((date) => new Date(date)),
  }) as CalendarEventInternal;

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "event-1",
  title: "Calendar event",
  allDay: false,
  start: taipeiDate("2026-09-10T09:00"),
  end: taipeiDate("2026-09-10T10:00"),
  repeat: null,
  color: "#000000",
  tag: "other",
  ...overrides,
});

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
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
  });
  restoreDom = () => Object.assign(globalThis, previousGlobals);
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

const runProvider = async (
  callback: (value: ReturnType<typeof useCalendarProvider>) => Promise<void>,
) => {
  const { root, value } = await renderProvider();
  try {
    await act(async () => {
      await callback(value);
    });
  } finally {
    await act(async () => {
      root.unmount();
    });
  }
};

describe("calendar hook recurrence operations", () => {
  test("creates a calendar event with its serialized dates and materialized end", async () => {
    const newEvent = makeEvent({
      id: "new-event",
      start: taipeiDate("2026-09-15T09:00"),
      end: taipeiDate("2026-09-15T10:30"),
    });

    await runProvider((value) => value.addEvent(newEvent));

    expect(upsertDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-event",
        start: newEvent.start.toISOString(),
        end: newEvent.end.toISOString(),
        actualEnd: newEvent.end.toISOString(),
        courseId: null,
      }),
    );
  });

  test("edits and deletes a non-recurring event without a series operation", async () => {
    storedEvent = { ...storedEvent, repeat: null, actualEnd: null };
    const edited = makeEvent({
      title: "Edited event",
      end: taipeiDate("2026-09-10T11:00"),
    });
    const current = toCalendarEvent(rootDocument.toJSON());

    await runProvider(async (value) => {
      await value.updateEvent(
        edited,
        operationEvent(current, current.start, current.end),
      );
      await value.removeEvent(current);
    });

    expect(updateDocument).toHaveBeenCalledWith({
      $set: expect.objectContaining({
        title: "Edited event",
        end: edited.end.toISOString(),
        actualEnd: edited.end.toISOString(),
      }),
    });
    expect(removeDocument).toHaveBeenCalledTimes(1);
  });

  test("edits only this recurring occurrence by adding an exception and detached event", async () => {
    const current = toCalendarEvent(rootDocument.toJSON());
    const occurrenceStart = taipeiDate("2026-09-12T09:00");
    const edited = {
      ...current,
      title: "Moved occurrence",
      start: taipeiDate("2026-09-12T11:00"),
      end: taipeiDate("2026-09-12T12:00"),
    };

    await runProvider((value) =>
      value.updateEvent(
        edited,
        operationEvent(
          current,
          occurrenceStart,
          taipeiDate("2026-09-12T10:00"),
        ),
        UpdateType.THIS,
      ),
    );

    const rootChange = updateDocument.mock.calls[0]?.[0] as {
      $set: { excludedDates: string[] };
    };
    expect(rootChange.$set.excludedDates).toEqual([
      occurrenceStart.toISOString(),
    ]);
    expect(insertDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `event-1${edited.start.toISOString()}`,
        parentId: "event-1",
        repeat: null,
        start: edited.start.toISOString(),
        end: edited.end.toISOString(),
      }),
    );
  });

  test("edits this and following occurrences as a new anchored series", async () => {
    const current = toCalendarEvent(rootDocument.toJSON());
    const edited = {
      ...current,
      title: "Moved future series",
      start: taipeiDate("2026-09-12T11:00"),
      end: taipeiDate("2026-09-12T12:00"),
    };

    await runProvider((value) =>
      value.updateEvent(
        edited,
        operationEvent(
          current,
          taipeiDate("2026-09-12T09:00"),
          taipeiDate("2026-09-12T10:00"),
        ),
        UpdateType.FOLLOWING,
      ),
    );

    const rootChange = updateDocument.mock.calls[0]?.[0] as {
      $set: { repeat: { mode: string; value: number }; actualEnd: string };
    };
    expect(rootChange.$set.repeat).toMatchObject({
      mode: "date",
      value: taipeiDate("2026-09-11T09:00").getTime(),
    });
    expect(rootChange.$set.actualEnd).toBe(
      taipeiDate("2026-09-11T10:00").toISOString(),
    );
    expect(insertDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `event-1${edited.start.toISOString()}`,
        parentId: "event-1",
        repeat: expect.objectContaining({ mode: "count", value: 3 }),
      }),
    );
  });

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

  test("deletes only this recurring occurrence as an exception", async () => {
    const current = toCalendarEvent(rootDocument.toJSON());
    const occurrenceStart = taipeiDate("2026-09-12T09:00");

    await runProvider((value) =>
      value.removeEvent(
        operationEvent(
          current,
          occurrenceStart,
          taipeiDate("2026-09-12T10:00"),
        ),
        UpdateType.THIS,
      ),
    );

    const change = updateDocument.mock.calls[0]?.[0] as {
      $set: { actualEnd: string; excludedDates: string[] };
    };
    expect(change.$set).toMatchObject({
      actualEnd: taipeiDate("2026-09-14T10:00").toISOString(),
      excludedDates: [occurrenceStart.toISOString()],
    });
    expect(removeDocument).not.toHaveBeenCalled();
  });

  test("deletes all recurring series documents", async () => {
    const current = toCalendarEvent(rootDocument.toJSON());

    await runProvider((value) => value.removeEvent(current, UpdateType.ALL));

    expect(removeChildren).toHaveBeenCalledTimes(1);
    expect(removeDocument).toHaveBeenCalledTimes(1);
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

describe("calendar replication status helpers", () => {
  test("prioritises authorization failures over other replication states", () => {
    expect(combinedReplicationStatus("error", "not-authorised")).toBe(
      "not-authorised",
    );
    expect(combinedReplicationStatus("syncing", "error")).toBe("error");
    expect(combinedReplicationStatus("idle", "syncing")).toBe("syncing");
    expect(combinedReplicationStatus("idle", "idle")).toBe("idle");
  });

  test("recognises nested authorization failures without confusing generic errors", () => {
    const cyclic: { cause?: unknown; status?: number } = { status: 403 };
    cyclic.cause = cyclic;

    expect(isNotAuthorisedReplicationError(cyclic)).toBe(true);
    expect(isNotAuthorisedReplicationError(new Error("network timeout"))).toBe(
      false,
    );
  });
});
