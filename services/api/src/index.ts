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
import { D1Database } from "@cloudflare/workers-types";
import {
  scrapeArchivedCourses,
  scrapeSyllabus,
  syncCoursesToAlgolia,
  exportCoursesToAlgoliaFile,
} from "./scheduled/syllabus";

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
  .route("/planner", planner);

const APIHandler = {
  ...app,
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    console.log("cron processed");
    ctx.waitUntil(
      new Promise(async (resolve) => {
        const semester = "11410";
        // Scrape archived courses and syllabus
        try {
          const cache = await scrapeArchivedCourses(env, semester);
          await scrapeSyllabus(env, semester, cache);
          // await scrapeSyllabus(env, semester);
          // await syncCoursesToAlgolia(env, semester);
          // await exportCoursesToAlgoliaFile(env, semester);
          console.log("Scheduled tasks completed successfully.");
          resolve(void 0);
        } catch (error) {
          console.error("Error during scheduled task:", error);
        }
      }),
    );
  },
};

export default APIHandler;
