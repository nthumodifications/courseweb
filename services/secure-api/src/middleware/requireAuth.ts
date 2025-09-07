import { PrismaClient, type User } from "@prisma/client";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

const prisma = new PrismaClient();

// Middleware to check authentication and scopes
export const requireAuth = (requiredScopes: string[] = []) =>
  createMiddleware<{
    Variables: {
      user: User;
    };
  }>(async (c, next) => {
    // Extract access_token from cookie or Authorization header
    const accessToken =
      c.req.header("Authorization")?.split(" ")[1] ||
      getCookie(c, "access_token");

    if (!accessToken) {
      return c.json(
        { error: "unauthorized", error_description: "Access token required" },
        401,
      );
    }

    try {
      // Verify the token
      const token = await prisma.token.findUnique({
        where: { token: accessToken },
      });
      if (!token) throw new Error("Token not found");
      if (token.expiresAt < new Date()) throw new Error("Token expired");

      const user = await prisma.user.findUnique({
        where: { userId: token.userId },
      });

      if (!user) throw new Error("User not found");

      c.set("user", user);

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
