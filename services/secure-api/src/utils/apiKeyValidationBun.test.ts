import { test, expect, beforeEach, beforeAll, afterAll, mock } from "bun:test";
import { HTTPException } from "hono/http-exception";

// Create mocks
const mockUpdate = mock(() => Promise.resolve(true));
const mockFindUnique = mock();

// Mock Prisma module
mock.module("@prisma/client", () => {
  return {
    PrismaClient: function () {
      return {
        apiKey: {
          findUnique: mockFindUnique,
          update: mockUpdate,
        },
      };
    },
  };
});

// Import after mocking
import { validateApiKey } from "./apiKeyValidation";

// Define a type for the API key return value
type ApiKeyRecord = {
  id: string;
  key: string;
  name: string;
  scopes: string[];
  isRevoked: boolean;
  expiresAt: Date | null;
  userId: string;
  user: {
    userId: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  lastUsedAt?: Date;
};

beforeEach(() => {
  // Reset mock call counts between tests
  mockFindUnique.mockReset();
  mockUpdate.mockReset();
});

test("should validate a valid API key with matching scope", async () => {
  // Setup mock response
  mockFindUnique.mockResolvedValue({
    id: "test-id",
    key: "test-key",
    name: "Test API Key",
    scopes: ["calendar:read"],
    isRevoked: false,
    expiresAt: null,
    userId: "user-1",
    user: {
      userId: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
    createdAt: new Date(),
  } as ApiKeyRecord);

  const result = await validateApiKey("test-key", "calendar:read");

  expect(result).toBeTruthy();
  expect(result.id).toBe("test-id");
  expect(mockUpdate).toHaveBeenCalled();
});

test("should validate a valid API key with parent scope", async () => {
  // Setup mock response
  mockFindUnique.mockResolvedValue({
    id: "test-id",
    key: "test-key",
    name: "Test API Key",
    scopes: ["calendar"],
    isRevoked: false,
    expiresAt: null,
    userId: "user-1",
    user: {
      userId: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
    createdAt: new Date(),
  } as ApiKeyRecord);

  const result = await validateApiKey("test-key", "calendar:read");

  expect(result).toBeTruthy();
  expect(result.id).toBe("test-id");
});

test("should reject non-existent API key", async () => {
  // Setup mock response
  mockFindUnique.mockResolvedValue(null);

  try {
    await validateApiKey("invalid-key", "calendar:read");
    expect.unreachable("Should have thrown an exception");
  } catch (error) {
    expect(error).toBeInstanceOf(HTTPException);
    expect((error as HTTPException).status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  }
});

test("should reject revoked API key", async () => {
  // Setup mock response
  mockFindUnique.mockResolvedValue({
    id: "test-id",
    key: "test-key",
    name: "Test API Key",
    scopes: ["calendar:read"],
    isRevoked: true,
    expiresAt: null,
    userId: "user-1",
    user: {
      userId: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
    createdAt: new Date(),
  } as ApiKeyRecord);

  try {
    await validateApiKey("test-key", "calendar:read");
    expect.unreachable("Should have thrown an exception");
  } catch (error) {
    expect(error).toBeInstanceOf(HTTPException);
    expect((error as HTTPException).status).toBe(401);
    expect((error as HTTPException).message).toContain("revoked");
  }
});

test("should reject expired API key", async () => {
  // Setup mock response with an expired date
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // One day ago

  mockFindUnique.mockResolvedValue({
    id: "test-id",
    key: "test-key",
    name: "Test API Key",
    scopes: ["calendar:read"],
    isRevoked: false,
    expiresAt: pastDate,
    userId: "user-1",
    user: {
      userId: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
    createdAt: new Date(),
  } as ApiKeyRecord);

  try {
    await validateApiKey("test-key", "calendar:read");
    expect.unreachable("Should have thrown an exception");
  } catch (error) {
    expect(error).toBeInstanceOf(HTTPException);
    expect((error as HTTPException).status).toBe(401);
    expect((error as HTTPException).message).toContain("expired");
  }
});

test("should reject API key with insufficient scope", async () => {
  // Setup mock response
  mockFindUnique.mockResolvedValue({
    id: "test-id",
    key: "test-key",
    name: "Test API Key",
    scopes: ["profile:read"],
    isRevoked: false,
    expiresAt: null,
    userId: "user-1",
    user: {
      userId: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
    createdAt: new Date(),
  } as ApiKeyRecord);

  try {
    await validateApiKey("test-key", "calendar:read");
    expect.unreachable("Should have thrown an exception");
  } catch (error) {
    expect(error).toBeInstanceOf(HTTPException);
    expect((error as HTTPException).status).toBe(403);
    expect((error as HTTPException).message).toContain("scope");
  }
});
