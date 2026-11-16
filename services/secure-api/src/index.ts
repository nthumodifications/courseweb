import { Hono } from "hono";
import oidc from "./oidc";
import { logger } from "hono/logger";
import api from "./api";
import { getVapidConfig } from "./config/push";
import { startPushNotifier } from "./push/notifier";

if (process.env["PUSH_NOTIFIER_ENABLED"] === "true" && getVapidConfig()) {
  startPushNotifier();
}

export const app = new Hono()
  .use(logger())
  .get("/", async (c) => {
    return c.text("Hello, world!");
  })
  .route("/", oidc)
  .route("/api", api);

export default {
  fetch: app.fetch,
  port: 5002,
};
