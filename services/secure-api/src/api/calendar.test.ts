import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
  setSystemTime,
} from "bun:test";
import {
  mockPrismaClient,
  mockUserFindUnique,
  mockApiKeyFindUnique,
  mockApiKeyUpdate,
} from "../__mocks__/prisma";
import { mockFirebaseGet } from "../__mocks__/firebase";
import { setPrismaClient } from "../utils/apiKeyValidation";

const mockFirebaseLimit = mock((limit: number) => ({
  get: async () => {
    const snapshot = await mockFirebaseGet();
    return { ...snapshot, docs: snapshot.docs.slice(0, limit) };
  },
}));
const mockCalendarShareFindUnique = mock();
const mockCalendarShareUpdate = mock();

// Mock firebase_admin module before importing
mock.module("../config/firebase_admin", () => {
  return {
    getFirebaseAdmin: () => ({
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
    }),
  };
});

// Create mock clients for Prisma and Firebase
const mockClient = {
  ...mockPrismaClient(),
  calendarShareToken: {
    findUnique: mockCalendarShareFindUnique,
    update: mockCalendarShareUpdate,
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
const { default: calendarHandler } = await import("./calendar");

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
  });

  describe("API Key Validation", () => {
    test("should validate an API key with the calendar:read scope", async () => {
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
    });
  });

  describe("iCalendar Generation", () => {
    test("should generate a valid calendar for a user", async () => {
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

  test("reports a Firestore failure instead of returning an empty success", async () => {
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
  });

  test("preserves HEAD's 50-event calendar response bound", async () => {
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

  test("keeps unauthenticated calendar feeds compatible", async () => {
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
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      "attachment; filename=test-user-id_calendar.ics",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(response.headers.get("Vary")).toBe("Accept-Encoding");
    const etag = response.headers.get("ETag");
    expect(etag).toMatch(/^W\/"[0-9a-f]{64}"$/);
    const normalizeGeneratedIds = (body: string) =>
      body.replaceAll(/UID:[^\r\n]+/g, "UID:<generated>");
    const body = await response.text();
    expect(normalizeGeneratedIds(body)).toBe(
      normalizeGeneratedIds(expectedBody),
    );

    mockCalendarShareFindUnique.mockResolvedValue({
      id: "share-id",
      revokedAt: null,
      expiresAt: null,
      includeFullDetails: false,
      user: { userId: "test-user-id" },
    });
    mockCalendarShareUpdate.mockResolvedValue({});
    const head = await calendarHandler.request(
      "http://test/ics/test-user-id?token=share-token",
      { method: "HEAD" },
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  test("keeps unchanged secure feed ETags stable across different DTSTAMP values", async () => {
    setSystemTime(new Date("2026-10-09T12:00:00Z"));
    try {
      const url = "http://test/ics/test-user-id?token=share-token";
      const getFeed = async () => {
        mockCalendarShareFindUnique.mockResolvedValueOnce({
          id: "share-id",
          revokedAt: null,
          expiresAt: null,
          includeFullDetails: false,
          user: { userId: "test-user-id" },
        });
        mockCalendarShareUpdate.mockResolvedValueOnce({});
        return calendarHandler.request(url);
      };

      const first = await getFeed();
      const firstBody = await first.text();
      const firstEtag = first.headers.get("ETag");

      setSystemTime(new Date("2026-10-09T12:10:00Z"));
      const second = await getFeed();
      const secondBody = await second.text();
      const secondEtag = second.headers.get("ETag");

      expect(firstBody).not.toBe(secondBody);
      expect(firstBody.match(/DTSTAMP:[^\r\n]+/)?.[0]).not.toBe(
        secondBody.match(/DTSTAMP:[^\r\n]+/)?.[0],
      );
      expect(firstEtag).toBe(secondEtag);

      mockCalendarShareFindUnique.mockResolvedValueOnce({
        id: "share-id",
        revokedAt: null,
        expiresAt: null,
        includeFullDetails: false,
        user: { userId: "test-user-id" },
      });
      mockCalendarShareUpdate.mockResolvedValueOnce({});
      mockFirebaseGet.mockResolvedValueOnce({
        docs: [
          {
            id: "changed-event",
            data: () => ({
              title: "Changed event",
              start: "2026-10-09T01:00:00.000Z",
              end: "2026-10-09T02:00:00.000Z",
              actualEnd: "2026-10-09T02:00:00.000Z",
              allDay: false,
              repeat: null,
            }),
          },
        ],
      });
      const changed = await calendarHandler.request(url);
      expect(changed.headers.get("ETag")).not.toBe(firstEtag);
    } finally {
      setSystemTime();
    }
  });

  test.each(["strong", "weak", "list", "wildcard"] as const)(
    "returns 304 for %s If-None-Match validators",
    async (kind) => {
      setSystemTime(new Date("2026-10-09T12:00:00Z"));
      try {
        mockCalendarShareFindUnique.mockResolvedValueOnce({
          id: "share-id",
          revokedAt: null,
          expiresAt: null,
          includeFullDetails: false,
          user: { userId: "test-user-id" },
        });
        mockCalendarShareUpdate.mockResolvedValueOnce({});
        const url = "http://test/ics/test-user-id?token=share-token";
        const first = await calendarHandler.request(url);
        const etag = first.headers.get("ETag")!;
        const ifNoneMatch = {
          strong: etag.slice(2),
          weak: etag,
          list: `"unrelated", ${etag}`,
          wildcard: "*",
        }[kind];

        mockCalendarShareFindUnique.mockResolvedValueOnce({
          id: "share-id",
          revokedAt: null,
          expiresAt: null,
          includeFullDetails: false,
          user: { userId: "test-user-id" },
        });
        mockCalendarShareUpdate.mockResolvedValueOnce({});
        const response = await calendarHandler.request(url, {
          headers: { "If-None-Match": ifNoneMatch },
        });

        expect(response.status).toBe(304);
        expect(response.headers.get("ETag")).toBe(etag);
        expect(await response.text()).toBe("");
      } finally {
        setSystemTime();
      }
    },
  );

  test("returns origin/main's exact 200 body for a truly empty feed", async () => {
    mockCalendarShareFindUnique.mockResolvedValueOnce({
      id: "share-id",
      revokedAt: null,
      expiresAt: null,
      includeFullDetails: false,
      user: { userId: "test-user-id" },
    });
    mockCalendarShareUpdate.mockResolvedValueOnce({});
    mockFirebaseGet.mockResolvedValueOnce({ docs: [], empty: true });

    const response = await calendarHandler.request(
      "http://test/ics/test-user-id?token=share-token",
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NTHUMods//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "NAME:Test User's Calendar",
        "X-WR-CALNAME:Test User's Calendar",
        "REFRESH-INTERVAL;VALUE=DURATION:PT5M",
        "X-PUBLISHED-TTL:PT5M",
        "END:VCALENDAR",
      ].join("\r\n"),
    );
  });

  test.each([
    ["valid token", "http://test/ics/test-user-id?token=share-token", 200],
    ["empty calendar", "http://test/ics/test-user-id?token=share-token", 200],
    ["missing token", "http://test/ics/test-user-id", 400],
    [
      "malformed type",
      "http://test/ics/test-user-id?token=share-token&type=other",
      400,
    ],
    ["bad token", "http://test/ics/test-user-id?token=bad-token", 403],
  ] as const)(
    "keeps origin/main status for %s",
    async (_name, url, expectedStatus) => {
      mockCalendarShareFindUnique.mockResolvedValue(
        url.includes("bad-token")
          ? undefined
          : {
              id: "share-id",
              revokedAt: null,
              expiresAt: null,
              includeFullDetails: false,
              user: { userId: "test-user-id" },
            },
      );
      mockCalendarShareUpdate.mockResolvedValue({});

      const response = await calendarHandler.request(url);

      expect(response.status).toBe(expectedStatus);
    },
  );
});
