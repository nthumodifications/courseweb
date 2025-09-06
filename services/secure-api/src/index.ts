import { Hono } from "hono";
import oidc from "./oidc";
import { logger } from "hono/logger";
import api from "./api";

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
