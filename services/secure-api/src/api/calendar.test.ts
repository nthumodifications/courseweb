import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
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
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    const normalizeGeneratedIds = (body: string) =>
      body.replaceAll(/UID:[^\r\n]+/g, "UID:<generated>");
    expect(normalizeGeneratedIds(await response.text())).toBe(
      normalizeGeneratedIds(expectedBody),
    );
  });
});
