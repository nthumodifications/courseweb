// Common mock for all Prisma related functionality
import { mock } from "bun:test";

// Default mock implementations that accept any parameters
export const mockUserFindUnique = mock(() =>
  Promise.resolve({
    id: "mock-user-id",
    userId: "test-user-id",
    name: "Test User",
    nameEn: "Test User",
    email: "test@example.com",
    inschool: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);

export const mockApiKeyFindUnique = mock(() =>
  Promise.resolve({
    id: "mock-key-id",
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

export const mockApiKeyUpdate = mock(() => Promise.resolve(true));
export const mockDisconnect = mock(() => Promise.resolve());

// Mock the PrismaClient class
export const mockPrismaClient = () => ({
  user: {
    findUnique: mockUserFindUnique,
  },
  apiKey: {
    findUnique: mockApiKeyFindUnique,
    update: mockApiKeyUpdate,
  },
  $disconnect: mockDisconnect,
});

export default mockPrismaClient;
