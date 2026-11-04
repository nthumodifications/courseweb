import { Hono } from "hono";
import { cors } from "hono/cors";

import replicationHandler from "./replication";
import apiKeysHandler from "./apikeys";
import courseDatesHandler from "./course-dates";
import adminHandler from "./admin";
import { createKvStorageApp } from "./kv_storage";
import { createCalendarApp } from "./calendar";
import { resolveUserStorageMode } from "../storage/userStore";
import reviewsHandler from "./reviews";
import pushHandler from "./push";

const userStorageMode = resolveUserStorageMode();

/**
 * Origins allowed to call the authenticated API with credentials.
 */
const ALLOWED_ORIGINS = new Set([
  "https://nthumods.com",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const app = new Hono()
  .use(
    cors({
      // An explicit list rather than a wildcard, because `credentials: true`
      // makes a reflected origin a real cross-site risk. The localhost entries
      // are what let the admin center be developed against a live auth server.
      origin: (origin) =>
        ALLOWED_ORIGINS.has(origin) ? origin : "https://nthumods.com",
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
      credentials: true,
    }),
  )
  .route("/kv", createKvStorageApp({ mode: userStorageMode }))
  .route("/replication", replicationHandler)
  .route("/apikeys", apiKeysHandler)
  .route("/calendar", createCalendarApp(undefined, userStorageMode))
  .route("/course-dates", courseDatesHandler)
  .route("/reviews", reviewsHandler)
  .route("/push", pushHandler)
  .route("/admin", adminHandler);

export default app;
