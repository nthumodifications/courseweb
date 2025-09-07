import { Hono } from "hono";
import { cors } from "hono/cors";

import kvHandler from "./kv_storage";
import replicationHandler from "./replication";
import apiKeysHandler from "./apikeys";
import calendarHandler from "./calendar";

const app = new Hono()
  .use(
    cors({
      origin: "https://nthumods.com",
      allowHeaders: ["Authorization"],
      allowMethods: ["GET", "POST", "OPTIONS", "DELETE", "PUT"],
      credentials: true,
    }),
  )
  .route("/kv", kvHandler)
  .route("/replication", replicationHandler)
  .route("/apikeys", apiKeysHandler)
  .route("/calendar", calendarHandler);

export default app;
