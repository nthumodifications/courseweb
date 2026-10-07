import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "hono/adapter";

// Define the app context type to include environment variables
interface AppEnv {
  NTHUMODS_AUTH_URL: string;
}

const isCalendarData = (value: string) =>
  value.startsWith("BEGIN:VCALENDAR") && value.includes("END:VCALENDAR");

const app = new Hono<{ Bindings: AppEnv }>().get(
  "/ical/:userId",
  zValidator(
    "query",
    z.object({
      token: z.string(),
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
      const { token, type } = c.req.valid("query");

      // Get the secure API URL from environment variable
      const { NTHUMODS_AUTH_URL: secureApiUrl } = env<{
        NTHUMODS_AUTH_URL: string;
      }>(c);

      // Construct the URL for the secure API request
      const url = new URL(
        `/calendar/ics/${encodeURIComponent(userId)}`,
        secureApiUrl,
      );
      url.searchParams.set("token", token);
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
        console.error("Error fetching calendar", response.status);
        return c.json({
          error: `Failed to fetch calendar: ${response.statusText}`,
          status: response.status,
        });
      }

      const contentType = response.headers
        .get("Content-Type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase();
      if (contentType !== "text/calendar") {
        return c.json({ error: "Unexpected calendar response" }, 502);
      }

      // Get the calendar data
      const calendarData = await response.text();
      if (!isCalendarData(calendarData)) {
        return c.json({ error: "Invalid calendar response" }, 502);
      }

      // Set the appropriate headers for the iCalendar file
      c.header("Content-Type", "text/calendar; charset=utf-8");
      c.header("Content-Disposition", 'attachment; filename="calendar.ics"');
      c.header("Content-Security-Policy", "default-src 'none'");
      c.header("X-Content-Type-Options", "nosniff");
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
