import { Hono } from "hono";
import { cors } from "hono/cors";

import kvHandler from "./kv_storage";
import replicationHandler from "./replication";
import apiKeysHandler from "./apikeys";
import calendarHandler from "./calendar";
import courseDatesHandler from "./course-dates";
import adminHandler from "./admin";

/**
 * Origins allowed to call the authenticated API with credentials.
 */
const ALLOWED_ORIGINS = [
  "https://nthumods.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

const app = new Hono()
  .use(
    cors({
      // An explicit list rather than a wildcard, because `credentials: true`
      // makes a reflected origin a real cross-site risk. The localhost entries
      // are what let the admin center be developed against a live auth server.
      origin: (origin) =>
        ALLOWED_ORIGINS.includes(origin) ? origin : "https://nthumods.com",
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
      credentials: true,
    }),
  )
  .route("/kv", kvHandler)
  .route("/replication", replicationHandler)
  .route("/apikeys", apiKeysHandler)
  .route("/calendar", calendarHandler)
  .route("/course-dates", courseDatesHandler)
  .route("/admin", adminHandler);

export default app;
