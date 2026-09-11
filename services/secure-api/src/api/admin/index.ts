import { Hono } from "hono";
import { requireAuth } from "../../middleware/requireAuth";
import { requireAdmin } from "../../middleware/requireAdmin";
import type { AdminEnv } from "./env";
import statsHandler from "./stats";
import usersHandler from "./users";
import announcementsHandler from "./announcements";
import clientsHandler from "./clients";
import auditHandler from "./audit";

/**
 * The NTHUMods admin center's API.
 *
 * Authenticated as a person through our own OIDC provider, then authorised on
 * the account's role.
 */

/**
 * Everything behind the staff gate.
 *
 * Kept as its own router rather than a `use()` placed after `/me`, so the gate
 * does not depend on the reader knowing that Hono runs middleware in
 * registration order. Nothing can be added to this router without going
 * through requireAdmin.
 */
const gated = new Hono<AdminEnv>()
  .use("*", requireAdmin("ADMIN"))
  .route("/stats", statsHandler)
  .route("/users", usersHandler)
  .route("/announcements", announcementsHandler)
  .route("/clients", clientsHandler)
  .route("/audit", auditHandler);

const app = new Hono<AdminEnv>()
  .use("*", requireAuth())

  // Deliberately outside the staff gate: the web app asks this to decide
  // whether to show the admin center at all, and an ordinary 200 saying "you
  // are not staff" is easier to reason about than a 403 from a route the
  // caller was never meant to reach.
  .get("/me", (c) => {
    const user = c.get("user");
    return c.json({
      userId: user.userId,
      name: user.name,
      nameEn: user.nameEn,
      email: user.email,
      role: user.role,
      isAdmin: user.role === "ADMIN" || user.role === "SUPERUSER",
      isSuperuser: user.role === "SUPERUSER",
    });
  })

  .route("/", gated);

export default app;
