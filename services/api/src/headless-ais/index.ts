import { Hono } from "hono";

import courses from "./courses";
import inthu from "./inthu";
import grades from "./grades";

// These routes act on a school session the caller already holds. Signing in
// with a student ID and password is deliberately not offered here: an open
// endpoint that solves the CAPTCHA for the caller is a password-guessing proxy.
const app = new Hono()
  .route("/courses", courses)
  .route("/inthu", inthu)
  .route("/grades", grades);

export default app;
