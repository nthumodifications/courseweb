import type { User } from "@prisma/client";

/**
 * Context shape inside the admin center's routers.
 *
 * `requireAuth` and `requireAdmin` are mounted once on the parent router, so
 * the sub-routers never see the middleware that populates `user` and would
 * otherwise have to reach for it untyped.
 */
export type AdminEnv = {
  Variables: {
    user: User;
  };
};
