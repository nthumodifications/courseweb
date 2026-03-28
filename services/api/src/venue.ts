import { Hono } from "hono";
import supabase_server from "./config/supabase_server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Bindings } from "./index";
import { venueRateLimitMiddleware } from "./utils/rate-limit";
import prismaClients from "./prisma/client";
import type { PeoOpeningTimesCache } from "./scheduled/peo-opening-times";

const PEO_OCCUPANCY_API =
  "https://peo178.et.nthu.edu.tw/api/verify/count/report";

type PeoOccupancyItem = {
  project_id: string;
  project_name: string;
  entry_count_now: number;
  entry_count_today: number;
};

type PeoOccupancyResponse = {
  status: number;
  message: string;
  data: PeoOccupancyItem[];
};

const app = new Hono<{ Bindings: Bindings }>()
  // Rate limiting middleware for all venue routes
  .use("*", venueRateLimitMiddleware)
  .get("/", async (c) => {
    const { data, error } = await supabase_server(c)
      .from("distinct_venues")
      .select("*");
    if (error) {
      console.error(error);
      throw new Error("Failed to fetch classes");
    }
    const filteredData = data.filter((item) => item.venue !== null) as {
      venue: string;
    }[];
    return c.json(filteredData.map((item) => item.venue));
  })
  .get("/opening-times", async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB);
    const result = await prisma.cache.findUnique({
      where: { key: "peo_opening_times" },
    });
    if (!result) {
      return c.json({ error: "Opening times not yet available" }, 404);
    }
    const data: PeoOpeningTimesCache = JSON.parse(result.data);
    return c.json(data);
  })
  .get("/occupancy", async (c) => {
    const res = await fetch(PEO_OCCUPANCY_API);
    if (!res.ok) {
      return c.json({ error: "Failed to fetch occupancy data" }, 502);
    }
    const json = (await res.json()) as PeoOccupancyResponse;
    if (json.status !== 200) {
      return c.json({ error: "Upstream API error" }, 502);
    }
    return c.json(json.data);
  })
  .get(
    "/:venueId/courses",
    zValidator(
      "param",
      z.object({
        venueId: z.string(),
      }),
    ),
    zValidator(
      "query",
      z.object({
        semester: z.string(),
      }),
    ),
    async (c) => {
      const { venueId } = c.req.valid("param");
      const { semester } = c.req.valid("query");
      const { data, error } = await supabase_server(c)
        .from("courses")
        .select("*")
        .eq("semester", semester)
        .contains("venues", [venueId]);
      if (error) {
        console.error(error);
        throw new Error("Failed to fetch courses");
      }
      return c.json(data);
    },
  );

export default app;
