import { Hono } from "hono";
import type { Bindings } from "./index";
import prismaClients from "./prisma/client";
import type { PeoOpeningTimesCache } from "./scheduled/peo-opening-times";
import { SPORTS_CACHE_KEY } from "./scheduled/peo-opening-times";
import peoSeedData from "./scheduled/peo-opening-times-seed.json";

const app = new Hono<{ Bindings: Bindings }>().get(
  "/opening-times",
  async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB);
    let result = null;

    try {
      result = await prisma.cache.findUnique({
        where: { key: SPORTS_CACHE_KEY },
      });
    } catch (e) {
      console.error(
        "Failed to read SPORTS_CACHE_KEY, clearing corrupted data:",
        e,
      );
      await c.env.DB.prepare("DELETE FROM Cache WHERE key = ? OR key = ?")
        .bind(SPORTS_CACHE_KEY, "peo_opening_times_syncing")
        .run();
    }

    if (result) {
      const data: PeoOpeningTimesCache = JSON.parse(result.data);
      return c.json(data);
    }

    // No cache yet — populate from seed data to prevent API quotas and loading screens
    try {
      await prisma.cache.upsert({
        where: { key: SPORTS_CACHE_KEY },
        update: { data: JSON.stringify(peoSeedData) },
        create: { key: SPORTS_CACHE_KEY, data: JSON.stringify(peoSeedData) },
      });
    } catch (e) {
      console.error("Failed to seed PEO data:", e);
    }

    return c.json(peoSeedData);
  },
);

export default app;
