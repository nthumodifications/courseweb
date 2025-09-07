import { Hono } from "hono";
import supabase_server from "./config/supabase_server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono()
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
