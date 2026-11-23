import { Hono } from "hono";
import type { Bindings } from "../index";
import { rateLimitMiddleware } from "../utils/rate-limit";
import { scrapeAllColleges, findRequirementsPDF } from "./scraper";
import {
  getCachedRequirements,
  getRequirementsCacheAgeMs,
  setCachedRequirements,
} from "./cache";

// A refresh re-scrapes every college page on the registrar's site. The route
// is open, so it is limited per caller and refuses to run again while the
// cache is this fresh, whoever is asking.
const REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;

const refreshRateLimit = rateLimitMiddleware({
  limiter: "VENUE_RATE_LIMITER",
  errorMessage: "Too many refresh requests. Please try again in a minute.",
});

const graduation = new Hono<{ Bindings: Bindings }>()
  // Get all colleges and departments
  .get("/colleges", async (c) => {
    // Try cache first
    let colleges = await getCachedRequirements(c);

    if (!colleges) {
      // Scrape and cache
      colleges = await scrapeAllColleges();
      await setCachedRequirements(c, colleges);
    }

    return c.json({
      colleges,
      note: "Department names and entrance years are in Chinese",
    });
  })

  // Find specific requirements PDF
  .get("/find", async (c) => {
    const department = c.req.query("department"); // Chinese department name
    const year = c.req.query("year"); // Entrance year like "113"

    if (!department || !year) {
      return c.json({ error: "Missing department or year parameter" }, 400);
    }

    let colleges = await getCachedRequirements(c);
    if (!colleges) {
      colleges = await scrapeAllColleges();
      await setCachedRequirements(c, colleges);
    }

    const result = await findRequirementsPDF(colleges, department, year);

    if (!result) {
      return c.json(
        {
          error: "Requirements not found",
          searched: { department, year },
        },
        404,
      );
    }

    return c.json(result);
  })

  // Force refresh cache
  .post("/refresh", refreshRateLimit, async (c) => {
    const cacheAgeMs = await getRequirementsCacheAgeMs(c);
    if (cacheAgeMs !== null && cacheAgeMs < REFRESH_MIN_INTERVAL_MS) {
      return c.json({ error: "Cache was refreshed recently" }, 429);
    }

    const colleges = await scrapeAllColleges();
    await setCachedRequirements(c, colleges);

    return c.json({
      message: "Cache refreshed",
      collegeCount: colleges.length,
      totalDepartments: colleges.reduce(
        (sum, col) => sum + col.departments.length,
        0,
      ),
    });
  });

export default graduation;
