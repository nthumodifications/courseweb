import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "hono/adapter";

// Define the app context type to include environment variables
interface AppEnv {
  NTHUMODS_AUTH_URL: string;
}

const app = new Hono<{ Bindings: AppEnv }>().get(
  "/ical/:userId",
  zValidator(
    "query",
    z.object({
      key: z.string().optional(),
      type: z.enum(["basic", "full"]).default("basic"),
    }),
  ),
  zValidator(
    "param",
    z.object({
      userId: z.string(),
    }),
  ),
  async (c) => {
    try {
      const { userId } = c.req.valid("param");
      const { key, type } = c.req.valid("query");

      if (!key) {
        return c.json({ error: "Missing API key" }, 400);
      }

      // Get the secure API URL from environment variable
      const { NTHUMODS_AUTH_URL: secureApiUrl } = env<{
        NTHUMODS_AUTH_URL: string;
      }>(c);

      // Construct the URL for the secure API request
      const url = new URL(`${secureApiUrl}/calendar/ics/${userId}`);
      url.searchParams.set("key", key);
      url.searchParams.set("type", type);

      // Forward the request to the secure API
      const response = await fetch(url.toString(), {
        headers: {
          // Forward any necessary headers
          Accept: "text/calendar",
        },
      });

      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error fetching calendar: ${response.status} ${errorText}`,
        );
        return c.json({
          error: `Failed to fetch calendar: ${response.statusText}`,
          status: response.status,
        });
      }

      // Get the calendar data
      const calendarData = await response.text();

      // Set the appropriate headers for the iCalendar file
      c.header("Content-Type", "text/calendar");
      c.header(
        "Content-Disposition",
        `attachment; filename=${userId}_calendar.ics`,
      );
      c.header("Cache-Control", "private, max-age=3600"); // Cache for 1 hour

      // Return the calendar data
      return c.body(calendarData);
    } catch (error) {
      console.error("Error proxying calendar request:", error);
      return c.json(
        { error: "Internal server error while fetching calendar" },
        500,
      );
    }
  },
);

export default app;
