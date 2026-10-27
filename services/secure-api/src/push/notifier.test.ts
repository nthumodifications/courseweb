import { describe, expect, mock, test } from "bun:test";
import {
  buildCourseNotifications,
  createPushNotifier,
  selectAnnouncementDigest,
  selectCourseChanges,
  shouldSendAnnouncementDigest,
} from "./notifier";
import { describeCourseChange } from "./text";

const change = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  raw_id: "11510CS 100100",
  semester: "11510",
  field: "venues",
  kind: "changed",
  old_value: ["DELTA台達101"],
  new_value: ["DELTA台達102"],
  detected_at: "2026-10-27T00:00:00Z",
  ...overrides,
});

test("selects timetable changes after a cursor once per course", () => {
  const selected = selectCourseChanges(
    [
      change({ id: 4 }),
      change({ id: 5, field: "times", old_value: ["M1"], new_value: ["M2"] }),
      change({ id: 6, raw_id: "11510EE 100100", semester: "11420" }),
    ],
    { "11510": ["11510CS 100100"] },
    3n,
  );
  expect(selected.map((item) => item.id)).toEqual([5]);
});

test("limits course notifications to four details plus a summary", () => {
  const changes = Array.from({ length: 6 }, (_, index) =>
    change({ id: index + 1, raw_id: `11510CS 10010${index}` }),
  );
  const notifications = buildCourseNotifications(changes, new Map(), "zh-cn");
  expect(notifications).toHaveLength(5);
  expect(notifications.at(-1)?.body).toBe("另有 2 门课程有变更");
  expect(notifications.at(0)?.body).toContain("教室变更");
});

test("uses localized room, time, and cancellation text", () => {
  expect(describeCourseChange(change(), "zh")).toContain("教室變更");
  expect(describeCourseChange(change({ field: "times" }), "en")).toContain(
    "Class time changed",
  );
  expect(describeCourseChange(change({ kind: "removed" }), "zh-cn")).toBe(
    "课程已取消",
  );
});

test("selects followed announcements after the previous digest date", () => {
  const articles = selectAnnouncementDigest(
    {
      articles: [
        {
          title: "Old",
          link: "/old",
          date: "2026-10-26",
          sourceIds: ["source-a"],
        },
        {
          title: "New",
          link: "/new",
          date: "2026-10-27",
          sourceIds: ["source-a"],
        },
        {
          title: "Other",
          link: "/other",
          date: "2026-10-27",
          sourceIds: ["source-b"],
        },
      ],
    },
    ["source-a"],
    "2026-10-26",
    new Date("2026-10-27T01:00:00Z"),
  );
  expect(articles.map((article) => article.title)).toEqual(["New"]);
});

describe("announcement schedule", () => {
  test("waits for 08:00 Taipei time", () => {
    expect(
      shouldSendAnnouncementDigest(null, new Date("2026-10-26T23:59:00Z")),
    ).toBe(false);
    expect(
      shouldSendAnnouncementDigest(null, new Date("2026-10-27T00:00:00Z")),
    ).toBe(true);
  });
});

test("fetches one announcement response per run and records the digest date", async () => {
  const current = new Date("2026-10-27T01:00:00Z");
  const subscription = (id: string, language: "zh" | "en") => ({
    id,
    userId: id,
    endpoint: `https://fcm.googleapis.com/${id}`,
    p256dh: "key",
    auth: "auth",
    failureCount: 0,
    language,
    courseChanges: false,
    announcementSources: ["source-a"],
    lastCourseChangeId: 0n,
    lastDigestDate: null,
  });
  const rows = [subscription("zh-sub", "zh"), subscription("en-sub", "en")];
  const updated: unknown[] = [];
  const fetcher = mock(
    async () =>
      new Response(
        JSON.stringify({
          articles: [
            {
              title: "Important",
              link: "https://example.test/a",
              date: "2026-10-27",
              sourceIds: ["source-a"],
            },
          ],
        }),
        { status: 200 },
      ),
  );
  const send = mock(async () => ({ status: 201, ok: true }));
  const transaction = {
    pushSubscription: {
      findMany: async () => rows,
      update: async (args: unknown) => updated.push(args),
      deleteMany: async () => ({ count: 0 }),
    },
    $queryRaw: async () => [{ id: 1 }],
  };
  const notifier = createPushNotifier({
    db: transaction as never,
    vapid: {
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    },
    fetcher,
    send: send as never,
    now: () => current,
  });
  expect(await notifier.run()).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledTimes(2);
  expect(updated).toHaveLength(2);
  expect(
    updated.every((value) => JSON.stringify(value).includes("2026-10-27")),
  ).toBe(true);
});

test("does not advance a course cursor after a retriable send failure", async () => {
  const updated: unknown[] = [];
  const transaction = {
    pushSubscription: {
      findMany: async () => [
        {
          id: "sub-1",
          userId: "user-1",
          endpoint: "https://fcm.googleapis.com/sub-1",
          p256dh: "key",
          auth: "auth",
          failureCount: 0,
          language: "en",
          courseChanges: true,
          announcementSources: [],
          lastCourseChangeId: 7n,
          lastDigestDate: null,
        },
      ],
      update: async (args: unknown) => updated.push(args),
      deleteMany: async () => ({ count: 0 }),
    },
    $queryRaw: async () => [{ id: 1 }],
  };
  const notifier = createPushNotifier({
    db: transaction as never,
    vapid: {
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    },
    getCourseChanges: async () => [change({ id: 8 })],
    getCourseNames: async () => new Map(),
    userStore: {
      get: async () => ({ value: { "11510": ["11510CS 100100"] } }),
    } as never,
    send: async () => ({ status: 503, ok: false }),
    now: () => new Date("2026-10-27T01:00:00Z"),
  });
  expect(await notifier.run()).toBe(true);
  expect(updated).toEqual([]);
});

test("does not mark a failed digest as sent", async () => {
  const updated: unknown[] = [];
  const transaction = {
    pushSubscription: {
      findMany: async () => [
        {
          id: "sub-1",
          userId: "user-1",
          endpoint: "https://fcm.googleapis.com/sub-1",
          p256dh: "key",
          auth: "auth",
          failureCount: 0,
          language: "en",
          courseChanges: false,
          announcementSources: ["source-a"],
          lastCourseChangeId: 0n,
          lastDigestDate: null,
        },
      ],
      update: async (args: unknown) => updated.push(args),
      deleteMany: async () => ({ count: 0 }),
    },
    $queryRaw: async () => [{ id: 1 }],
  };
  const notifier = createPushNotifier({
    db: transaction as never,
    vapid: {
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    },
    fetcher: async () =>
      new Response(
        JSON.stringify({
          articles: [
            {
              title: "A",
              link: "https://example.test/a",
              date: "2026-10-27",
              sourceIds: ["source-a"],
            },
          ],
        }),
      ),
    send: async () => ({ status: 503, ok: false }),
    now: () => new Date("2026-10-27T01:00:00Z"),
  });
  expect(await notifier.run()).toBe(true);
  expect(updated).toEqual([]);
});

test("starts at most eight subscription deliveries concurrently", async () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({
    id: `sub-${index}`,
    userId: `user-${index}`,
    endpoint: `https://fcm.googleapis.com/${index}`,
    p256dh: "key",
    auth: "auth",
    failureCount: 0,
    language: "en" as const,
    courseChanges: false,
    announcementSources: ["source-a"],
    lastCourseChangeId: 0n,
    lastDigestDate: null,
  }));
  let inFlight = 0;
  let maximum = 0;
  const transaction = {
    pushSubscription: {
      findMany: async (args: unknown) => {
        expect(args).toEqual(expect.objectContaining({ take: 500 }));
        return rows;
      },
      update: async () => undefined,
      deleteMany: async () => ({ count: 0 }),
    },
    $queryRaw: async () => [{ id: 1 }],
  };
  const notifier = createPushNotifier({
    db: transaction as never,
    vapid: {
      publicKey: "public",
      privateKey: "private",
      subject: "mailto:test@nthumods.com",
    },
    fetcher: async () =>
      new Response(
        JSON.stringify({
          articles: [
            {
              title: "A",
              link: "https://example.test/a",
              date: "2026-10-27",
              sourceIds: ["source-a"],
            },
          ],
        }),
      ),
    send: async () => {
      inFlight += 1;
      maximum = Math.max(maximum, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { status: 201, ok: true };
    },
    now: () => new Date("2026-10-27T01:00:00Z"),
  });
  await notifier.run();
  expect(maximum).toBe(8);
});

test("uses calendar-day boundaries for the first digest", () => {
  const articles = selectAnnouncementDigest(
    {
      articles: [
        { title: "Older", link: "/older", date: "2026-10-25", sourceIds: ["source-a"] },
        { title: "Yesterday", link: "/yesterday", date: "2026-10-26", sourceIds: ["source-a"] },
        { title: "Today", link: "/today", date: "2026-10-27", sourceIds: ["source-a"] },
      ],
    },
    ["source-a"],
    null,
    new Date("2026-10-27T01:00:00Z"),
  );
  expect(articles.map((article) => article.title)).toEqual(["Yesterday", "Today"]);
});
