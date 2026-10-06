import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Bindings } from "../index";
import { venueRateLimitMiddleware } from "../utils/rate-limit";
import { SNAPSHOT_CACHE_KEY } from "./collector";
import { taipeiSlotAt } from "./model";
import type { UsageForecastResponse, UsageSource } from "./types";

const sourceSchema = z.object({ source: z.enum(["gym", "library"]) });

function emptyResponse(source: UsageSource): UsageForecastResponse {
  return {
    source,
    kind: source === "gym" ? "occupancy" : "vacancy",
    generatedAt: new Date().toISOString(),
    date: taipeiSlotAt(Date.now()).date,
    slotMinutes: 30,
    timezone: "Asia/Taipei",
    series: [],
  };
}

const app = new Hono<{ Bindings: Bindings }>()
  .use("*", venueRateLimitMiddleware)
  .get(
    "/:source/forecast",
    zValidator("param", sourceSchema),
    async (c) => {
      const { source } = c.req.valid("param");
      const result = await c.env.DB.prepare(`SELECT "data" FROM "Cache" WHERE "key" = ?`)
        .bind(SNAPSHOT_CACHE_KEY(source))
        .first<{ data: string }>();
      let response = emptyResponse(source);
      if (result?.data) {
        try {
          const parsed = JSON.parse(result.data) as UsageForecastResponse;
          if (parsed.source === source && Array.isArray(parsed.series)) response = parsed;
        } catch (error) {
          console.error(`Invalid cached usage snapshot for ${source}`, error);
        }
      }
      c.header("Cache-Control", "public, max-age=300");
      return c.json(response);
    },
  );

export default app;

