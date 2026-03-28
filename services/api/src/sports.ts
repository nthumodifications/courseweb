import { Hono } from "hono";
import type { Bindings } from "./index";
import prismaClients from "./prisma/client";
import type { PeoOpeningTimesCache } from "./scheduled/peo-opening-times";
import { SPORTS_CACHE_KEY, syncPeoOpeningTimes } from "./scheduled/peo-opening-times";

const SPORTS_SYNCING_KEY = "peo_opening_times_syncing";

const app = new Hono<{ Bindings: Bindings }>().get(
  "/opening-times",
  async (c) => {
    const prisma = await prismaClients.fetch(c.env.DB);
    const result = await prisma.cache.findUnique({
      where: { key: SPORTS_CACHE_KEY },
    });

    if (result) {
      const data: PeoOpeningTimesCache = JSON.parse(result.data);
      return c.json(data);
    }

    // No cache yet — check if a sync is already in flight (race condition guard)
    const syncing = await prisma.cache.findUnique({
      where: { key: SPORTS_SYNCING_KEY },
    });

    if (!syncing) {
      // Atomically claim the sync slot before starting background work
      await prisma.cache.upsert({
        where: { key: SPORTS_SYNCING_KEY },
        update: { data: new Date().toISOString() },
        create: { key: SPORTS_SYNCING_KEY, data: new Date().toISOString() },
      });

      // Run sync in background; clear sentinel when done (success or failure)
      c.executionCtx.waitUntil(
        syncPeoOpeningTimes({ DB: c.env.DB, GOOGLE_AI_API_KEY: c.env.GOOGLE_AI_API_KEY })
          .finally(() =>
            prismaClients.fetch(c.env.DB).then((p) =>
              p.cache.delete({ where: { key: SPORTS_SYNCING_KEY } })
            )
          )
      );
    }

    return c.json({ status: "loading" }, 202);
  },
);

export default app;
