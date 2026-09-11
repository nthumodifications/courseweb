import type { AdminRole, User } from "@prisma/client";
import { createMiddleware } from "hono/factory";

/**
 * Gate a route on NTHUMods staff access.
 *
 * Runs after `requireAuth`, which has already put the account on the context.
 * This is a check on the person, not on the token's OAuth scopes: an access
 * token minted for any client belonging to an admin gets in, and a token
 * carrying every scope in the system does not if the account is not staff.
 */
const RANK: Record<AdminRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPERUSER: 2,
};

export const hasAtLeastRole = (role: AdminRole, minimum: AdminRole) =>
  RANK[role] >= RANK[minimum];

export const requireAdmin = (minimum: AdminRole = "ADMIN") =>
  createMiddleware<{
    Variables: {
      user: User;
    };
  }>(async (c, next) => {
    const user = c.get("user");

    // Without an authenticated user there is nothing to authorise. Saying
    // "forbidden" here would leak that the route exists to anyone unauthenticated.
    if (!user) {
      return c.json(
        { error: "unauthorized", error_description: "Access token required" },
        401,
      );
    }

    if (user.banned || !hasAtLeastRole(user.role, minimum)) {
      return c.json(
        {
          error: "forbidden",
          error_description: "Administrator access required",
        },
        403,
      );
    }

    await next();
  });
