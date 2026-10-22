import { PrismaClient, type Token, type User } from "@prisma/client";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Context } from "hono";

const prisma = new PrismaClient();

const getAccessToken = (c: Context) =>
  c.req.header("Authorization")?.split(" ")[1] || getCookie(c, "access_token");

/** Verify an access token using the same database lookup as requireAuth. */
export const verifyAccessToken = async (
  accessToken: string,
): Promise<{ user: User; token: Token }> => {
  const token = await prisma.token.findFirst({
    where: { token: accessToken, type: "ACCESS" },
  });
  if (!token) throw new Error("Token not found");
  if (token.expiresAt < new Date()) throw new Error("Token expired");

  const user = await prisma.user.findUnique({
    where: { userId: token.userId },
  });
  if (!user) throw new Error("User not found");
  return { user, token };
};

/** Optional authentication for public endpoints that expose a `mine` flag. */
export const getOptionalAuthUser = async (
  c: Context,
): Promise<User | undefined> => {
  const accessToken = getAccessToken(c);
  if (!accessToken) return undefined;

  try {
    return (await verifyAccessToken(accessToken)).user;
  } catch {
    return undefined;
  }
};

// Middleware to check authentication and scopes
export const requireAuth = (
  requiredScopes: string[] = [],
  options: { allowBanned?: boolean } = {},
) =>
  createMiddleware<{
    Variables: {
      user: User;
    };
  }>(async (c, next) => {
    // Extract access_token from cookie or Authorization header
    const accessToken = getAccessToken(c);

    if (!accessToken) {
      return c.json(
        { error: "unauthorized", error_description: "Access token required" },
        401,
      );
    }

    try {
      const { user, token } = await verifyAccessToken(accessToken);

      // A ban has to bite immediately. Access tokens live 30 minutes and
      // refresh tokens 30 days, so waiting for expiry would leave a suspended
      // account with a working session for the rest of the month.
      if (user.banned && !options.allowBanned) {
        return c.json(
          {
            error: "account_suspended",
            error_description: "This account has been suspended",
          },
          403,
        );
      }

      c.set("user", user);
      c.header("Cache-Control", "private, no-store");

      if (requiredScopes.length > 0) {
        const tokenScopes = token.scopes;

        // Check if all required scopes are satisfied
        const hasRequiredScopes = requiredScopes.every((requiredScope) => {
          const [reqResource, reqPermission] = requiredScope.split(":");

          // If no permission is specified (e.g., "user"), just check resource presence
          if (!reqPermission) {
            return tokenScopes.some(
              (scope) => scope.split(":")[0] === reqResource,
            );
          }

          // Otherwise, check exact match (e.g., "user:read")
          return tokenScopes.includes(requiredScope);
        });

        if (!hasRequiredScopes) {
          return c.json(
            {
              error: "insufficient_scope",
              error_description: `Required scopes: ${requiredScopes.join(", ")}`,
            },
            403,
          );
        }
      }

      await next();
    } catch (error) {
      return c.json(
        {
          error: "invalid_token",
          error_description: "Invalid or expired token",
        },
        401,
      );
    }
  });
