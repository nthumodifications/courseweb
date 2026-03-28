import { Hono } from "hono";
import type { Bindings } from "./index";
import prismaClients from "./prisma/client";
import type { PeoOpeningTimesCache } from "./scheduled/peo-opening-times";
import { SPORTS_CACHE_KEY } from "./scheduled/peo-opening-times";

const app = new Hono<{ Bindings: Bindings }>().get(
  "/opening-times",
  async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB);
    const result = await prisma.cache.findUnique({
      where: { key: SPORTS_CACHE_KEY },
    });
    if (!result) {
      return c.json({ error: "Opening times not yet available" }, 404);
    }
    const data: PeoOpeningTimesCache = JSON.parse(result.data);
    return c.json(data);
  },
);

export default app;
