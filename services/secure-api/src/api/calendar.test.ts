import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
  setSystemTime,
  spyOn,
} from "bun:test";
import {
  mockPrismaClient,
  mockUserFindUnique,
  mockApiKeyFindUnique,
  mockApiKeyUpdate,
} from "../__mocks__/prisma";
import { mockFirebaseGet } from "../__mocks__/firebase";
import { setPrismaClient } from "../utils/apiKeyValidation";
import { semesterInfo as canonicalSemesterInfo } from "../../../../packages/shared/src/constants/semester";

process.env.JWT_PRIVATE_KEY ??= "test-calendar-feed-secret";

const mockFirebaseLimit = mock((limit: number) => ({
  get: async () => {
    const snapshot = await mockFirebaseGet();
    return { ...snapshot, docs: snapshot.docs.slice(0, limit) };
  },
}));
const mockCalendarShareFindUnique = mock();
const mockCalendarShareUpdate = mock();
const mockCalendarShareFindFirst = mock();
const mockCalendarShareFindMany = mock();
const mockCalendarShareCreate = mock();
const mockCalendarShareUpdateMany = mock();
const mockStorageGet = mock();
const mockTimetableFetch = mock();

// Mock firebase_admin module before importing
mock.module("../config/firebase_admin", () => {
  return {
    getFirebaseAdmin: () => ({
      adminFirestore: {
        collection: () => ({
          doc: () => ({
            collection: (name: string) =>
              name === "storage"
                ? { doc: () => ({ get: mockStorageGet }) }
                : {
                    where: () => ({
                      where: () => ({
                        orderBy: () => ({
                          get: mockFirebaseGet,
                          limit: mockFirebaseLimit,
                        }),
                      }),
                    }),
                  },
          }),
        }),
      },
    }),
  };
});

// Create mock clients for Prisma and Firebase
const mockClient = {
  ...mockPrismaClient(),
  calendarShareToken: {
    findUnique: mockCalendarShareFindUnique,
    update: mockCalendarShareUpdate,
    findFirst: mockCalendarShareFindFirst,
    findMany: mockCalendarShareFindMany,
    create: mockCalendarShareCreate,
    updateMany: mockCalendarShareUpdateMany,
  },
  token: {
    findFirst: mock(() =>
      Promise.resolve({
        userId: "test-user-id",
        expiresAt: new Date(Date.now() + 60_000),
        scopes: ["calendar"],
      }),
    ),
  },
} as any;
mock.module("../client", () => ({ default: mockClient }));

// Create a mock Firebase admin client for testing
const mockFirebase = {
  adminFirestore: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          where: () => ({
            where: () => ({
              orderBy: () => ({
                get: mockFirebaseGet,
                limit: mockFirebaseLimit,
              }),
            }),
          }),
        }),
      }),
    }),
  },
};

// Import after setting up mocks
import { createICalendar } from "../utils/icalendar";
import { validateApiKey } from "../utils/apiKeyValidation";
import { sha256hash } from "../utils/sha256";
const {
  createCalendarApp,
  clearAcademicCalendarCache,
  parseCalendarIncludes,
  SEMESTER_INFO: secureApiSemesterInfo,
  trimTrailingSlashes,
} = await import("./calendar");
const calendarHandler = createCalendarApp(
  () => async (c: any, next: () => Promise<unknown>) => {
    c.set("user", { userId: "test-user-id" });
    return next();
  },
);

const originalFetch = globalThis.fetch;
globalThis.fetch = mockTimetableFetch as unknown as typeof fetch;
const serialTest = test.serial;

const validFeedToken = async (id: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.JWT_PRIVATE_KEY!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const contextKey = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("courseweb/calendar-feed/v1"),
  );
  const feedKey = await crypto.subtle.importKey(
    "raw",
    contextKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    feedKey,
    new TextEncoder().encode(id),
  );
  const token = `cal_${Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
  return { token, tokenHash: await sha256hash(token) };
};

const prepareTimetableFeed = async (id = "feed-id") => {
  mockCalendarShareFindFirst.mockResolvedValueOnce({
    id,
    ...(await validFeedToken(id)),
    createdAt: new Date("2026-10-14T00:00:00.000Z"),
  });
  const feedResponse = await calendarHandler.request("http://auth.test/feed", {
    headers: { Authorization: "Bearer test-access-token" },
  });
  const feedUrl = ((await feedResponse.json()) as { url: string }).url.replace(
    "/api/calendar",
    "",
  );
  mockCalendarShareFindUnique.mockResolvedValue({
    id,
    name: "__timetable_feed__",
    revokedAt: null,
    expiresAt: null,
    includeFullDetails: false,
    user: { userId: "test-user-id" },
  });
  mockCalendarShareUpdate.mockResolvedValue({});
  return feedUrl;
};

describe("Calendar API", () => {
  beforeAll(() => {
    // Set our mock client before all tests
    setPrismaClient(mockClient as any);
  });

  afterAll(() => {
    // Reset the client after all tests
    setPrismaClient(null);
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockUserFindUnique.mockClear();
    mockApiKeyFindUnique.mockClear();
    mockApiKeyUpdate.mockClear();
    mockFirebaseGet.mockClear();
    mockFirebaseLimit.mockClear();
    mockCalendarShareFindUnique.mockClear();
    mockCalendarShareUpdate.mockClear();
    mockCalendarShareFindFirst.mockReset();
    mockCalendarShareFindMany.mockReset();
    mockCalendarShareCreate.mockClear();
    mockCalendarShareUpdateMany.mockClear();
    mockStorageGet.mockReset();
    mockTimetableFetch.mockReset();
    mockCalendarShareFindFirst.mockResolvedValue(null);
    mockCalendarShareFindMany.mockResolvedValue([]);
    mockCalendarShareUpdateMany.mockResolvedValue({ count: 0 });
    mockStorageGet.mockResolvedValue({
      exists: true,
      data: () => ({ value: { "11510": ["11510-COURSE-1"] } }),
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe("API Key Validation", () => {
    serialTest(
      "should validate an API key with the calendar:read scope",
      async () => {
        mockApiKeyFindUnique.mockImplementationOnce(() =>
          Promise.resolve({
            id: "test-id",
            name: "Test API Key",
            key: "test-api-key",
            scopes: ["calendar:read"],
            userId: "test-user-id",
            user: {
              userId: "test-user-id",
              name: "Test User",
              email: "test@example.com",
            },
            isRevoked: false,
            createdAt: new Date(),
            expiresAt: null,
          }),
        );

        const result = await validateApiKey(
          "test-api-key",
          "calendar:read",
          mockClient,
        );

        expect(result).toBeTruthy();
        expect(result.key).toBe("test-api-key");
        expect(mockApiKeyFindUnique).toHaveBeenCalledTimes(1);
        expect(mockApiKeyUpdate).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("iCalendar Generation", () => {
    serialTest("should generate a valid calendar for a user", async () => {
      const mockContext = {
        env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" },
      };

      const calendar = await createICalendar(
        "test-user-id",
        true,
        mockContext,
        mockClient,
        mockFirebase,
      );

      expect(calendar).toBeTruthy();
      expect(typeof calendar).toBe("string");
      expect(calendar.includes("BEGIN:VCALENDAR")).toBe(true);
      expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
      expect(mockFirebaseGet).toHaveBeenCalledTimes(1);
    });
  });

  serialTest(
    "reports a Firestore failure instead of returning an empty success",
    async () => {
      mockApiKeyFindUnique.mockResolvedValueOnce({
        id: "test-id",
        scopes: ["calendar:read"],
        isRevoked: false,
        expiresAt: null,
        userId: "test-user-id",
        user: {
          userId: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
      });
      mockFirebaseGet.mockRejectedValueOnce(new Error("Firestore unavailable"));

      const response = await calendarHandler.request("http://test/", {
        headers: { Authorization: "ApiKey test-api-key" },
      });

      expect(response.status).toBe(500);
    },
  );

  serialTest("preserves HEAD's 50-event calendar response bound", async () => {
    mockApiKeyFindUnique.mockResolvedValueOnce({
      id: "test-id",
      scopes: ["calendar:read"],
      isRevoked: false,
      expiresAt: null,
      userId: "test-user-id",
      user: {
        userId: "test-user-id",
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockFirebaseGet.mockResolvedValueOnce({
      docs: Array.from({ length: 51 }, (_, index) => ({
        id: `event-${index}`,
        data: () => ({ title: `Event ${index}` }),
      })),
    });

    const response = await calendarHandler.request("http://test/", {
      headers: { Authorization: "ApiKey test-api-key" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mockFirebaseLimit).toHaveBeenCalledWith(50);
    expect((await response.json()).events).toHaveLength(50);
  });

  serialTest("keeps unauthenticated calendar feeds compatible", async () => {
    mockCalendarShareFindUnique.mockResolvedValueOnce({
      id: "share-id",
      revokedAt: null,
      expiresAt: null,
      includeFullDetails: false,
      user: { userId: "test-user-id" },
    });
    mockCalendarShareUpdate.mockResolvedValueOnce({});

    const expectedBody = await createICalendar(
      "test-user-id",
      false,
      { env: { FIREBASE_SERVICE_ACCOUNT: "mock-service-account" } },
      mockClient,
      mockFirebase,
    );
    const response = await calendarHandler.request(
      "http://test/ics/test-user-id?token=share-token",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    const normalizeGeneratedIds = (body: string) =>
      body.replaceAll(/UID:[^\r\n]+/g, "UID:<generated>");
    expect(normalizeGeneratedIds(await response.text())).toBe(
      normalizeGeneratedIds(expectedBody),
    );
  });

  serialTest(
    "creates an idempotent timetable feed and returns webcal URL",
    async () => {
      const createdAt = new Date("2026-10-14T00:00:00.000Z");
      const feedToken = await validFeedToken("feed-id");
      mockCalendarShareCreate.mockResolvedValueOnce({
        id: "feed-id",
        createdAt,
        tokenHash: feedToken.tokenHash,
      });

      const first = await calendarHandler.request("http://auth.test/feed", {
        headers: { Authorization: "Bearer test-access-token" },
      });
      const firstBody = await first.json();

      mockCalendarShareFindFirst.mockResolvedValueOnce({
        id: "feed-id",
        createdAt,
        tokenHash: feedToken.tokenHash,
      });
      const second = await calendarHandler.request("http://auth.test/feed", {
        headers: { Authorization: "Bearer test-access-token" },
      });
      const secondBody = await second.json();

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(firstBody).toEqual(secondBody);
      expect(mockCalendarShareCreate).toHaveBeenCalledTimes(1);
      expect((firstBody as { url: string }).url).toContain(
        "http://auth.test/api/calendar/ics/test-user-id?token=cal_",
      );
      expect((firstBody as { webcalUrl: string }).webcalUrl).toStartWith(
        "webcal://",
      );
    },
  );

  serialTest("rotates the timetable feed and revokes the old URL", async () => {
    const oldFeed = {
      id: "old-feed-id",
      createdAt: new Date("2026-10-13T00:00:00.000Z"),
      ...(await validFeedToken("old-feed-id")),
    };
    const newFeed = {
      id: "new-feed-id",
      createdAt: new Date("2026-10-14T00:00:00.000Z"),
      ...(await validFeedToken("new-feed-id")),
    };
    mockCalendarShareFindFirst.mockResolvedValueOnce(oldFeed);
    const oldFeedResponse = await calendarHandler.request(
      "http://auth.test/feed",
      { headers: { Authorization: "Bearer test-access-token" } },
    );
    const oldUrl = ((await oldFeedResponse.json()) as { url: string }).url;

    mockCalendarShareFindFirst.mockReset();
    mockCalendarShareFindFirst
      .mockResolvedValueOnce(oldFeed)
      .mockResolvedValueOnce(null);
    mockCalendarShareCreate.mockResolvedValueOnce(newFeed);
    mockCalendarShareFindMany.mockResolvedValueOnce([oldFeed, newFeed]);

    const response = await calendarHandler.request(
      "http://auth.test/feed/rotate",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-access-token" },
      },
    );
    const responseText = await response.text();
    const body = JSON.parse(responseText) as { url: string };

    expect(response.status).toBe(200);
    expect(body.url).toContain("token=cal_");
    expect(mockCalendarShareUpdate).toHaveBeenCalledWith({
      where: { id: "old-feed-id" },
      data: { revokedAt: expect.any(Date) },
    });

    mockCalendarShareFindUnique.mockResolvedValueOnce({
      ...oldFeed,
      name: "__timetable_feed__",
      revokedAt: new Date(),
      expiresAt: null,
      user: { userId: "test-user-id" },
    });
    const oldResponse = await calendarHandler.request(
      oldUrl.replace("/api/calendar", ""),
    );
    expect(oldResponse.status).toBe(403);
    expect(oldResponse.headers.get("Cache-Control")).toBe("no-store");
  });

  serialTest(
    "ignores legacy reserved shares when converging and keeps their path working",
    async () => {
      const legacyToken = "legacy-reserved-token";
      const legacy = {
        id: "legacy-reserved-id",
        name: "__timetable_feed__",
        tokenHash: await sha256hash(legacyToken),
        userId: "test-user-id",
        user: { userId: "test-user-id" },
        revokedAt: null,
        expiresAt: null,
        includeFullDetails: false,
        createdAt: new Date("2026-10-13T00:00:00.000Z"),
      };
      const real = {
        id: "real-feed-id",
        name: "__timetable_feed__",
        ...(await validFeedToken("real-feed-id")),
        userId: "test-user-id",
        user: { userId: "test-user-id" },
        revokedAt: null,
        expiresAt: null,
        includeFullDetails: false,
        createdAt: new Date("2026-10-14T00:00:00.000Z"),
      };
      mockCalendarShareFindMany.mockResolvedValue([legacy, real]);
      mockCalendarShareFindUnique.mockImplementation(async ({ where }: any) =>
        where.tokenHash === legacy.tokenHash ? legacy : real,
      );
      mockCalendarShareUpdate.mockResolvedValue({});
      mockTimetableFetch.mockResolvedValue(
        new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
      );

      const feedResponse = await calendarHandler.request(
        "http://auth.test/feed",
        {
          headers: { Authorization: "Bearer test-access-token" },
        },
      );
      const feed = (await feedResponse.json()) as { url: string };

      expect(feed.url).toContain(real.token);
      const realResponse = await calendarHandler.request(
        feed.url.replace("/api/calendar", ""),
      );
      const legacyResponse = await calendarHandler.request(
        `/ics/test-user-id?token=${legacyToken}`,
      );

      expect(realResponse.status).toBe(200);
      expect(legacyResponse.status).toBe(200);
      expect(
        mockCalendarShareUpdate.mock.calls.some(
          ([call]) => "revokedAt" in (call as any).data,
        ),
      ).toBe(false);
    },
  );

  serialTest(
    "keeps the old feed working when rotation creation fails",
    async () => {
      const old = {
        id: "old-feed-id",
        name: "__timetable_feed__",
        ...(await validFeedToken("old-feed-id")),
        userId: "test-user-id",
        user: { userId: "test-user-id" },
        revokedAt: null,
        expiresAt: null,
        includeFullDetails: false,
        createdAt: new Date("2026-10-13T00:00:00.000Z"),
      };
      mockCalendarShareCreate.mockRejectedValueOnce(new Error("create failed"));
      mockCalendarShareFindUnique.mockResolvedValue(old);

      const response = await calendarHandler.request(
        "http://auth.test/feed/rotate",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-access-token" },
        },
      );
      const oldResponse = await calendarHandler.request(
        `/ics/test-user-id?token=${old.token}`,
      );

      expect(response.status).toBe(500);
      expect(oldResponse.status).toBe(200);
      expect(mockCalendarShareUpdateMany).not.toHaveBeenCalled();
    },
  );

  serialTest(
    "merges live timetable classes with user events and supports ETag",
    async () => {
      const feedUrl = await prepareTimetableFeed();
      const classCalendar = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:stable-class-uid",
        "SUMMARY:Live class",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
      mockTimetableFetch.mockImplementation(() =>
        Promise.resolve(new Response(classCalendar, { status: 200 })),
      );

      const response = await calendarHandler.request(feedUrl);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body).toContain("UID:stable-class-uid");
      expect(body).toContain("Lecture: Introduction to React");
      expect(response.headers.get("Cache-Control")).toBe(
        "private, max-age=900",
      );
      const etag = response.headers.get("ETag");
      expect(etag).toBeTruthy();

      const notModified = await calendarHandler.request(feedUrl, {
        headers: { "If-None-Match": etag! },
      });
      expect(notModified.status).toBe(304);
    },
  );

  serialTest(
    "serves user events when the timetable upstream fails",
    async () => {
      const feedUrl = await prepareTimetableFeed();
      mockTimetableFetch.mockResolvedValue(
        new Response("unavailable", { status: 503 }),
      );

      const response = await calendarHandler.request(feedUrl);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body).toContain("Lecture: Introduction to React");
      expect(body).not.toContain("stable-class-uid");
    },
  );

  serialTest(
    "converges interleaved feed creation to one active URL",
    async () => {
      const rows: Array<{ id: string; createdAt: Date; revokedAt?: Date }> = [];
      let created = 0;
      let releaseCreation!: () => void;
      const creationBarrier = new Promise<void>((resolve) => {
        releaseCreation = resolve;
      });

      mockCalendarShareFindFirst.mockResolvedValue(null);
      mockCalendarShareCreate.mockImplementation(async ({ data }: any) => {
        const row = {
          id: data.id,
          tokenHash: data.tokenHash,
          createdAt: new Date(),
        };
        rows.push(row);
        created += 1;
        if (created === 2) releaseCreation();
        await creationBarrier;
        return row;
      });
      mockCalendarShareFindMany.mockImplementation(async () =>
        rows.filter((row) => !row.revokedAt),
      );
      mockCalendarShareUpdate.mockImplementation(
        async ({ where, data }: any) => {
          const row = rows.find((candidate) => candidate.id === where.id);
          if (row) row.revokedAt = data.revokedAt;
          return row;
        },
      );

      const [first, second] = await Promise.all([
        calendarHandler.request("http://auth.test/feed", {
          headers: { Authorization: "Bearer test-access-token" },
        }),
        calendarHandler.request("http://auth.test/feed", {
          headers: { Authorization: "Bearer test-access-token" },
        }),
      ]);
      const firstBody = (await first.json()) as { url: string };
      const secondBody = (await second.json()) as { url: string };

      expect(firstBody.url).toBe(secondBody.url);
      expect(rows.filter((row) => !row.revokedAt)).toHaveLength(1);
    },
  );

  serialTest(
    "keeps supported current classes when a newer semester fails",
    async () => {
      const feedUrl = await prepareTimetableFeed();
      mockStorageGet.mockResolvedValue({
        exists: true,
        data: () => ({
          value: {
            "11510": ["11510-CURRENT"],
            "11520": ["11520-FUTURE"],
          },
        }),
      });
      mockTimetableFetch.mockImplementation(async (input: URL) =>
        input.searchParams.get("semester") === "11520"
          ? new Response("unsupported", { status: 400 })
          : new Response(
              "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:current-class\nEND:VEVENT\nEND:VCALENDAR\n",
              { status: 200 },
            ),
      );

      const response = await calendarHandler.request(feedUrl);
      const body = await response.text();

      expect(body).toContain("UID:current-class");
      expect(mockTimetableFetch).toHaveBeenCalledTimes(2);
    },
  );

  serialTest(
    "keeps ETag and cache headers for weak, list, and wildcard validators",
    async () => {
      const feedUrl = await prepareTimetableFeed();
      mockTimetableFetch.mockImplementation(() =>
        Promise.resolve(new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n")),
      );
      const first = await calendarHandler.request(feedUrl);
      const etag = first.headers.get("ETag")!;
      const expectedCacheControl = first.headers.get("Cache-Control");

      for (const validator of [`W/${etag}`, `"other", ${etag}`, "*"]) {
        const response = await calendarHandler.request(feedUrl, {
          headers: { "If-None-Match": validator },
        });
        expect(response.status).toBe(304);
        expect(response.headers.get("ETag")).toBe(etag);
        expect(response.headers.get("Cache-Control")).toBe(
          expectedCacheControl,
        );
      }
    },
  );

  serialTest(
    "treats a reserved-name legacy share as a normal share",
    async () => {
      mockCalendarShareFindUnique.mockResolvedValueOnce({
        id: "legacy-reserved-id",
        name: "__timetable_feed__",
        revokedAt: null,
        expiresAt: null,
        includeFullDetails: false,
        user: { userId: "test-user-id" },
      });
      mockCalendarShareUpdate.mockResolvedValue({});

      const response = await calendarHandler.request(
        "/ics/test-user-id?token=legacy-token",
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/calendar");
    },
  );

  test("parses the default and known include values while ignoring unknown values", () => {
    expect([...parseCalendarIncludes(undefined)]).toEqual([
      "classes",
      "events",
      "academic",
    ]);
    expect([
      ...parseCalendarIncludes("academic,unknown,classes,academic"),
    ]).toEqual(["academic", "classes"]);
    expect([...parseCalendarIncludes("")]).toEqual([]);
    expect([...parseCalendarIncludes("unknown,UNKNOWN,Academic")]).toEqual([]);
  });

  serialTest(
    "adds academic all-day events with exclusive dates and metadata",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      mockTimetableFetch.mockImplementation(async (input: URL) => {
        if (input.pathname.endsWith("/acacalendar")) {
          return new Response(
            JSON.stringify([
              {
                id: "holiday-1",
                summary: "Exam, summary; escaped",
                date: "2026-10-20",
              },
              {
                id: "selection-1",
                summary: "Course selection",
                date: "2026-10-21",
                courseSelectionPeriod: {
                  startDate: "2026-10-21",
                  endDate: "2026-10-23",
                },
              },
            ]),
            { status: 200 },
          );
        }
        return new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
      });

      const response = await calendarHandler.request(
        `${feedUrl}&include=academic`,
      );
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body).toContain("UID:aca-holiday-1@nthumods.com");
      expect(body).toContain("DTSTART;VALUE=DATE:20261020");
      expect(body).toContain("DTEND;VALUE=DATE:20261021");
      expect(body).toContain("SUMMARY:Exam\\, summary\\; escaped");
      expect(body).toContain("TRANSP:TRANSPARENT");
      expect(body).toContain("CATEGORIES:NTHU Academic");
      expect(body).toContain("DTSTART;VALUE=DATE:20261021");
      expect(body).toContain("DTEND;VALUE=DATE:20261024");
      expect(mockTimetableFetch).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/acacalendar" }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    },
  );

  serialTest("omits academic events after an upstream failure", async () => {
    clearAcademicCalendarCache();
    const feedUrl = await prepareTimetableFeed();
    mockTimetableFetch.mockImplementation(async (input: URL) =>
      input.pathname.endsWith("/acacalendar")
        ? new Response("unavailable", { status: 503 })
        : new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
    );

    const response = await calendarHandler.request(
      `${feedUrl}&include=academic`,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("UID:aca-");
  });

  serialTest(
    "generates the real academic payload shape with UTF-8-safe folding",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      const summary = "選課期間與學期重要日期".repeat(12);
      mockTimetableFetch.mockImplementation(async (input: URL) =>
        input.pathname.endsWith("/acacalendar")
          ? new Response(
              JSON.stringify([
                {
                  id: "course-selection-11510",
                  summary,
                  date: "2026-10-20",
                  courseSelectionPeriod: {
                    startDate: "2026-10-20",
                    endDate: "2026-10-23",
                  },
                },
              ]),
              { status: 200 },
            )
          : new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
      );

      const response = await calendarHandler.request(
        `${feedUrl}&include=academic`,
      );
      const body = await response.text();
      const decoder = new TextDecoder("utf-8", { fatal: true });

      expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(1);
      expect(body).toContain("DTSTART;VALUE=DATE:20261020");
      expect(body).toContain("DTEND;VALUE=DATE:20261024");
      for (const line of body.split("\r\n")) {
        expect(() =>
          decoder.decode(new TextEncoder().encode(line)),
        ).not.toThrow();
        expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      }
    },
  );

  serialTest(
    "retries academic data after a failed five-minute window",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      let academicRequests = 0;
      mockTimetableFetch.mockImplementation(async (input: URL) => {
        if (!input.pathname.endsWith("/acacalendar")) {
          return new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
        }
        academicRequests += 1;
        return academicRequests === 1
          ? new Response("unavailable", { status: 503 })
          : new Response(
              JSON.stringify([
                { id: "recovered", summary: "Recovered", date: "2026-10-20" },
              ]),
              { status: 200 },
            );
      });

      const first = await calendarHandler.request(
        `${feedUrl}&include=academic`,
      );
      expect(await first.text()).not.toContain("UID:aca-recovered");

      setSystemTime(new Date(Date.now() + 5 * 60 * 1000 + 1));
      try {
        const second = await calendarHandler.request(
          `${feedUrl}&include=academic`,
        );
        expect(await second.text()).toContain("UID:aca-recovered");
        expect(academicRequests).toBe(2);
      } finally {
        setSystemTime();
      }
    },
  );

  serialTest(
    "serves the last successful academic data during a later failure",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      let academicRequests = 0;
      mockTimetableFetch.mockImplementation(async (input: URL) => {
        if (!input.pathname.endsWith("/acacalendar")) {
          return new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
        }
        academicRequests += 1;
        return academicRequests === 1
          ? new Response(
              JSON.stringify([
                { id: "stale-success", summary: "Stale", date: "2026-10-20" },
              ]),
              { status: 200 },
            )
          : new Response("unavailable", { status: 503 });
      });

      const first = await calendarHandler.request(
        `${feedUrl}&include=academic`,
      );
      expect(await first.text()).toContain("UID:aca-stale-success");

      setSystemTime(new Date(Date.now() + 60 * 60 * 1000 + 1));
      try {
        const second = await calendarHandler.request(
          `${feedUrl}&include=academic`,
        );
        expect(await second.text()).toContain("UID:aca-stale-success");
        expect(academicRequests).toBe(2);
      } finally {
        setSystemTime();
      }
    },
  );

  serialTest(
    "uses a new academic request window after the Taipei date rolls over",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      mockTimetableFetch.mockImplementation(async (input: URL) =>
        input.pathname.endsWith("/acacalendar")
          ? new Response("[]", { status: 200 })
          : new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
      );

      setSystemTime(new Date("2026-10-14T15:59:00.000Z"));
      try {
        await calendarHandler.request(`${feedUrl}&include=academic`);
        setSystemTime(new Date("2026-10-14T16:01:00.000Z"));
        await calendarHandler.request(`${feedUrl}&include=academic`);

        const academicUrls = mockTimetableFetch.mock.calls
          .map(([input]) => input as URL)
          .filter((input) => input.pathname.endsWith("/acacalendar"));
        expect(academicUrls).toHaveLength(2);
        expect(academicUrls[0]?.search).not.toBe(academicUrls[1]?.search);
      } finally {
        setSystemTime();
      }
    },
  );

  serialTest(
    "hashes unsafe academic ids and strips line breaks from text",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      const id = "unsafe\r\nX-INJECT:yes";
      mockTimetableFetch.mockImplementation(async (input: URL) =>
        input.pathname.endsWith("/acacalendar")
          ? new Response(
              JSON.stringify([
                {
                  id,
                  summary: "Summary\r\nX-INJECT:yes",
                  date: "2026-10-20",
                },
              ]),
              { status: 200 },
            )
          : new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
      );

      const response = await calendarHandler.request(
        `${feedUrl}&include=academic`,
      );
      const body = await response.text();
      const digest = (await sha256hash(id)).slice(0, 16);

      expect(body).toContain(`UID:aca-${digest}@nthumods.com`);
      expect(body).not.toContain(id);
      expect(body).toContain("SUMMARY:SummaryX-INJECT:yes");
      expect(body).not.toContain("\r\nX-INJECT:yes\r\n");
    },
  );

  serialTest(
    "keeps class, user, and academic UID collisions in source order",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      mockFirebaseGet.mockResolvedValueOnce({
        docs: [
          {
            id: "aca-user@nthumods.com",
            data: () => ({
              title: "User collision",
              start: "2026-10-15T10:00:00.000Z",
              end: "2026-10-15T11:00:00.000Z",
              actualEnd: "2026-10-15T11:00:00.000Z",
              allDay: false,
            }),
          },
        ],
      });
      const classCalendar = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:aca-class@nthumods.com",
        "SUMMARY:Class collision",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
      mockTimetableFetch.mockImplementation(async (input: URL) => {
        if (input.pathname.endsWith("/acacalendar")) {
          return new Response(
            JSON.stringify([
              { id: "class", summary: "Academic class", date: "2026-10-20" },
              { id: "user", summary: "Academic user", date: "2026-10-21" },
            ]),
            { status: 200 },
          );
        }
        return new Response(classCalendar);
      });
      const warn = spyOn(console, "warn");

      try {
        const response = await calendarHandler.request(
          `${feedUrl}&include=classes,events,academic`,
        );
        const body = await response.text();

        expect(body).toContain("SUMMARY:Class collision");
        expect(body).toContain("SUMMARY:User collision");
        expect(body).not.toContain("SUMMARY:Academic class");
        expect(body).not.toContain("SUMMARY:Academic user");
        expect(warn).toHaveBeenCalledTimes(2);
      } finally {
        warn.mockRestore();
      }
    },
  );

  serialTest(
    "supports a 304 response for a non-default include selection",
    async () => {
      clearAcademicCalendarCache();
      const feedUrl = await prepareTimetableFeed();
      mockTimetableFetch.mockImplementation(async (input: URL) =>
        input.pathname.endsWith("/acacalendar")
          ? new Response(
              JSON.stringify([
                {
                  id: "etag-academic",
                  summary: "Academic",
                  date: "2026-10-20",
                },
              ]),
              { status: 200 },
            )
          : new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
      );

      const first = await calendarHandler.request(
        `${feedUrl}&include=academic`,
      );
      const etag = first.headers.get("ETag");
      const second = await calendarHandler.request(
        `${feedUrl}&include=academic`,
        {
          headers: { "If-None-Match": etag! },
        },
      );

      expect(etag).toBeTruthy();
      expect(second.status).toBe(304);
      expect(second.headers.get("ETag")).toBe(etag);
    },
  );

  serialTest("varies ETag by include selection", async () => {
    clearAcademicCalendarCache();
    const feedUrl = await prepareTimetableFeed();
    mockTimetableFetch.mockImplementation(async (input: URL) =>
      input.pathname.endsWith("/timetable/calendar.ics")
        ? new Response(
            "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:include-class\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
          )
        : new Response("[]", { status: 200 }),
    );

    const eventsResponse = await calendarHandler.request(
      `${feedUrl}&include=events`,
    );
    const classesResponse = await calendarHandler.request(
      `${feedUrl}&include=classes`,
    );

    expect(eventsResponse.headers.get("ETag")).not.toBe(
      classesResponse.headers.get("ETag"),
    );
    expect(await eventsResponse.text()).toContain(
      "Lecture: Introduction to React",
    );
    expect(await classesResponse.text()).toContain("UID:include-class");
  });

  serialTest(
    "rejects reserved timetable feed names for new shares",
    async () => {
      const response = await calendarHandler.request(
        "http://auth.test/share-tokens",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "__timetable_feed__" }),
        },
      );

      expect(response.status).toBe(400);
      expect(mockCalendarShareCreate).not.toHaveBeenCalled();
    },
  );

  serialTest(
    "normalizes and deduplicates timetable events before user events",
    async () => {
      const feedUrl = await prepareTimetableFeed();
      mockFirebaseGet.mockResolvedValueOnce({
        docs: [
          {
            id: "duplicate-uid",
            data: () => ({
              title: "User event",
              start: "2026-10-15T10:00:00.000Z",
              end: "2026-10-15T11:00:00.000Z",
              actualEnd: "2026-10-15T11:00:00.000Z",
              allDay: false,
            }),
          },
        ],
      });
      mockTimetableFetch.mockResolvedValueOnce(
        new Response(
          "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:duplicate-uid\nSUMMARY:Class\nEND:VEVENT\nEND:VCALENDAR\n",
          { status: 200 },
        ),
      );

      const response = await calendarHandler.request(feedUrl);
      const body = await response.text();

      expect(body.match(/UID:duplicate-uid/g)).toHaveLength(1);
      expect(body).toContain("SUMMARY:Class");
      expect(body).not.toContain("SUMMARY:User event");
      expect(body).not.toMatch(/(^|\n)[^\r\n]*\n/);
    },
  );

  serialTest("bounds upstream requests and skips oversized URLs", async () => {
    const feedUrl = await prepareTimetableFeed();
    mockStorageGet.mockResolvedValue({
      exists: true,
      data: () => ({
        value: { "11510": ["x".repeat(9000)], "11520": ["small-course"] },
      }),
    });
    mockTimetableFetch.mockImplementation(
      async (_input: URL, init?: RequestInit) => {
        expect(init?.signal).toBeDefined();
        return new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
      },
    );

    await calendarHandler.request(feedUrl);

    expect(mockTimetableFetch).toHaveBeenCalledTimes(1);
  });

  test("trims a long adversarial run of trailing slashes quickly", () => {
    const base = "https://api.example.test";
    expect(trimTrailingSlashes(`${base}${"/".repeat(1_000_000)}`)).toBe(base);
  });

  serialTest("keeps the secure-api semester mirror in sync with shared", () => {
    expect(
      secureApiSemesterInfo.map(({ id, begins, ends }) => [
        id,
        begins.getTime(),
        ends.getTime(),
      ]),
    ).toEqual(
      canonicalSemesterInfo.map(({ id, begins, ends }) => [
        id,
        begins.getTime(),
        ends.getTime(),
      ]),
    );
  });
});
