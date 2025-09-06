// Common test helper for setting up mocks and dependencies
import { beforeAll, afterAll } from "bun:test";
import { mockPrismaClient } from "./__mocks__/prisma";
import { mockFirebaseAdmin } from "./__mocks__/firebase";
import { setPrismaClient } from "./utils/apiKeyValidation";
import * as firebaseAdminModule from "./config/firebase_admin";

// Create mock clients
export const mockClient = mockPrismaClient() as any;
export const mockFirebase = mockFirebaseAdmin();

// Setup function to be called in beforeAll blocks
export function setupTestMocks() {
  // Set our mock Prisma client
  setPrismaClient(mockClient as any);

  // Mock the Firebase admin
  // @ts-ignore - Override the module's exported function
  firebaseAdminModule.getFirebaseAdmin = () => mockFirebase;
}

// Teardown function to be called in afterAll blocks
export function teardownTestMocks() {
  // Reset the Prisma client
  setPrismaClient(null);
}

// Setup and teardown hooks that can be used in test suites
export function setupGlobalMocks() {
  beforeAll(() => {
    setupTestMocks();
  });

  afterAll(() => {
    teardownTestMocks();
  });
}

export default {
  mockClient,
  mockFirebase,
  setupTestMocks,
  teardownTestMocks,
  setupGlobalMocks,
};
