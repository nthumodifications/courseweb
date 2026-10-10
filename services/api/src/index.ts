import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Ai, RateLimit } from "@cloudflare/workers-types";

import acaCalendar from "./aca-calendar";
import calendarProxy from "./calendar-proxy";
import timetableIcs from "./timetable-ics";
import weather from "./weather";
import course from "./course";
import venue from "./venue";
import shortlink from "./shortlink";
import issue from "./issue";
import headlessAis from "./headless-ais";
import planner from "./planner-replication";
import timetableShare from "./timetable-share";
import mcpServer from "./mcp-server";
import search from "./search";
import bus from "./bus";
import citybus from "./citybus";
import chat from "./chat";
import ai from "./ai";
import graduation from "./graduation";
import shortlinkRedirect from "./shortlink-redirect";
import sports from "./sports";
import recruit from "./recruit";
import dining from "./dining";
import youbike from "./youbike";
import { syncPeoOpeningTimes } from "./scheduled/peo-opening-times";
import { syncSelectionDates } from "./scheduled/selection-dates";
import { D1Database } from "@cloudflare/workers-types";
import usage from "./usage";
import { syncUsageTick } from "./usage/collector";

export type Bindings = {
  DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALGOLIA_APP_ID: string;
  ALGOLIA_API_KEY: string;
  ALGOLIA_BACKUP_APP_ID?: string;
  ALGOLIA_BACKUP_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  GROQ_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  AI_PROVIDER_ORDER?: string;
  AI?: Ai;
  VENUE_RATE_LIMITER: RateLimit;
  AI_RATE_LIMITER?: RateLimit;
  MCP_RATE_LIMITER?: RateLimit;
  SEARCH_RATE_LIMITER?: RateLimit;
  SHORTLINK_RATE_LIMITER?: RateLimit;
  ISSUE_RATE_LIMITER?: RateLimit;
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
};

export const app = new Hono<{ Bindings: Bindings }>()
  .use(
    cors({
      origin:
        process.env.NODE_ENV === "production" ? "https://nthumods.com" : "*",
      // The search text tier versions its IndexedDB cache by ETag, which a
      // cross-origin fetch cannot read unless it is exposed.
      exposeHeaders: ["ETag"],
      allowHeaders: ["Content-Type", "Authorization", "X-Gemini-Api-Key"],
    }),
  )
  // .use(csrf({ origin: process.env.NODE_ENV === "production" ? 'nthumods.com': 'localhost' }))
  .use(logger())
  .get("/", (c) => {
    return c.text("I AM NTHUMODS UWU");
  })
  .route("/acacalendar", acaCalendar)
  .route("/calendar", calendarProxy)
  .route("/timetable", timetableIcs)
  .route("/weather", weather)
  .route("/course", course)
  .route("/venue", venue)
  .route("/shortlink", shortlink)
  .route("/ccxp", headlessAis)
  .route("/issue", issue)
  .route("/planner", planner)
  .route("/timetable-share", timetableShare)
  .route("/mcp", mcpServer)
  .route("/search", search)
  .route("/bus", bus)
  .route("/citybus", citybus)
  .route("/chat", chat)
  .route("/ai", ai)
  .route("/graduation", graduation)
  .route("/l", shortlinkRedirect)
  .route("/sports", sports)
  .route("/recruit", recruit)
  .route("/dining", dining)
  .route("/youbike", youbike)
  .route("/usage", usage);

export default {
  fetch: app.fetch.bind(app),
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    if (event.cron === "0 2 * * 1") {
      ctx.waitUntil(syncPeoOpeningTimes(env));
    }
    if (event.cron === "0 2 * * *") {
      // Three bounded GETs keep official selection data at <24h maximum
      // staleness while staying well below Worker subrequest/CPU limits.
      ctx.waitUntil(syncSelectionDates(env));
    } else if (event.cron === "*/10 * * * *") {
      ctx.waitUntil(syncUsageTick(env));
    } else if (event.cron !== "0 2 * * 1") {
      console.warn(`Ignoring unknown scheduled event: ${event.cron}`);
    }
  },
};
