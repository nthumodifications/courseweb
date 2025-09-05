import { PrismaClient } from "@prisma/client";
import { HTTPException } from "hono/http-exception";
import { sha256hash } from "./sha256";

// Create a default Prisma client that can be overridden in tests
let _prismaClient: PrismaClient | null = null;

/**
 * Get the current Prisma client or create one if none exists
 */
export function getPrismaClient(): PrismaClient {
  if (!_prismaClient) {
    _prismaClient = new PrismaClient();
  }
  return _prismaClient;
}

/**
 * Used for testing - allows injecting a mock
 */
export function setPrismaClient(client: PrismaClient | null): void {
  _prismaClient = client;
}

/**
 * Validates an API key and checks if it has the required scope
 *
 * @param apiKeyString The API key string to validate
 * @param requiredScope The required scope for the API key
 * @param prismaOverride Optional Prisma client override for testing
 * @returns The validated API key record with user information
 */
export async function validateApiKey(
  apiKeyString: string,
  requiredScope?: string,
  prismaOverride?: PrismaClient,
) {
  // Use the provided prisma client or get the default one
  const prisma = prismaOverride || getPrismaClient();

  const hashedkey = await sha256hash(apiKeyString);

  // Find the API key in the database
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedkey },
    include: {
      user: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Validate the API key exists
  if (!apiKeyRecord) {
    throw new HTTPException(401, { message: "Invalid API key" });
  }

  // Check if the API key is revoked
  if (apiKeyRecord.isRevoked) {
    throw new HTTPException(401, { message: "API key has been revoked" });
  }

  // Check if the API key has expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    throw new HTTPException(401, { message: "API key has expired" });
  }

  // Check if the API key has the required scope (if specified)
  if (requiredScope) {
    const hasValidScope = apiKeyRecord.scopes.some((scopeStr: string) => {
      // Exact match
      if (scopeStr === requiredScope) return true;

      // Check if parent scope exists
      const scopeParts = requiredScope.split(":");
      if (scopeParts.length > 1) {
        return scopeStr === scopeParts[0];
      }

      return false;
    });

    if (!hasValidScope) {
      throw new HTTPException(403, {
        message: `API key does not have the required scope (${requiredScope})`,
      });
    }
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKeyRecord;
}
