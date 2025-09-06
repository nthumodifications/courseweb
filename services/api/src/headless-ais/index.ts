import { Hono } from "hono";

import auth from "./auth";
import courses from "./courses";
import inthu from "./inthu";
import eeclass from "./eeclass";
import grades from "./grades";
import type { ScheduledController, Scheduler } from "@cloudflare/workers-types";
import { scrapeArchivedCourses } from "../scheduled/syllabus";

const app = new Hono()
  .route("/auth", auth)
  .route("/courses", courses)
  .route("/inthu", inthu)
  .route("/eeclass", eeclass)
  .route("/grades", grades);

export default app;
