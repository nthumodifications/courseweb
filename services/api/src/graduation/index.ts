import { Hono } from "hono";
import { scrapeAllColleges, findRequirementsPDF } from "./scraper";
import { getCachedRequirements, setCachedRequirements } from "./cache";

const graduation = new Hono()
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
  .post("/refresh", async (c) => {
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
