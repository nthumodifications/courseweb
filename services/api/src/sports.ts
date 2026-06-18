import { Hono } from "hono";
import type { Bindings } from "./index";
import prismaClients from "./prisma/client";
import type { PeoOpeningTimesCache } from "./scheduled/peo-opening-times";
import {
  SPORTS_CACHE_KEY,
  syncPeoOpeningTimes,
} from "./scheduled/peo-opening-times";
import peoSeedData from "./scheduled/peo-opening-times-seed.json";

const app = new Hono<{ Bindings: Bindings }>()
  .get("/opening-times", async (c) => {
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
  })
  .post("/refresh", async (c) => {
    const semester = c.req.query("semester") ?? undefined;

    // Debounce: reject if cache was updated in the last 5 minutes
    const prisma = await prismaClients.fetch(c.env.DB);
    const existing = await prisma.cache.findUnique({
      where: { key: SPORTS_CACHE_KEY },
    });
    if (existing) {
      try {
        const cached: PeoOpeningTimesCache = JSON.parse(existing.data);
        const ageMs = Date.now() - new Date(cached.lastUpdated).getTime();
        if (ageMs < 5 * 60 * 1000) {
          return c.json(
            {
              ok: false,
              reason: "recently_updated",
              lastUpdated: cached.lastUpdated,
            },
            429,
          );
        }
      } catch {}
    }

    await syncPeoOpeningTimes(c.env, semester);
    return c.json({ ok: true, semester: semester ?? "all" });
  });

export default app;
