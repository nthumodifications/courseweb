import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import acaCalendar from "./aca-calendar";
import calendarProxy from "./calendar-proxy";
import weather from "./weather";
import course from "./course";
import venue from "./venue";
import shortlink from "./shortlink";
import issue from "./issue";
import headlessAis from "./headless-ais";
import planner from "./planner-replication";
import mcpServer from "./mcp-server";
import search from "./search";
import { D1Database } from "@cloudflare/workers-types";
// Scheduled functions moved to @courseweb/data-sync package

export type Bindings = {
  DB: D1Database;
};

export const app = new Hono<{ Bindings: Bindings }>()
  .use(
    cors({
      origin:
        process.env.NODE_ENV === "production" ? "https://nthumods.com" : "*",
    }),
  )
  // .use(csrf({ origin: process.env.NODE_ENV === "production" ? 'nthumods.com': 'localhost' }))
  .use(logger())
  .get("/", (c) => {
    return c.text("I AM NTHUMODS UWU");
  })
  .route("/acacalendar", acaCalendar)
  .route("/calendar", calendarProxy)
  .route("/weather", weather)
  .route("/course", course)
  .route("/venue", venue)
  .route("/shortlink", shortlink)
  .route("/ccxp", headlessAis)
  .route("/issue", issue)
  .route("/planner", planner)
  .route("/mcp", mcpServer)
  .route("/search", search);

// Note: Scheduled data sync functionality has been moved to @courseweb/data-sync package
// This service now only handles API endpoints
export default app;
