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
                    limit: () => ({
                      get: mockFirebaseGet,
                    }),
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
const mockClient = mockPrismaClient() as any;

// Create a mock Firebase admin client for testing
const mockFirebase = {
  adminFirestore: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          where: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  get: mockFirebaseGet,
                }),
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
});
