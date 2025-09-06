import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyApiKey, requireScope } from "../middleware/apikey";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createICalendar } from "../utils/icalendar";
import { addDays } from "date-fns";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { validateApiKey } from "../utils/apiKeyValidation";

const app = new Hono()
  // Public endpoint for accessing calendar via API key in query parameter
  .get(
    "/ics/:userId",
    zValidator(
      "param",
      z.object({
        userId: z.string(),
      }),
    ),
    zValidator(
      "query",
      z.object({
        key: z.string(),
        type: z.enum(["basic", "full"]).default("basic"),
      }),
    ),
    async (c) => {
      const { userId } = c.req.valid("param");
      const { key: apiKey, type: calendarType } = c.req.valid("query");

      // Validate the API key using our utility function
      // This function handles validation and updates the lastUsedAt timestamp
      const apiKeyRecord = await validateApiKey(apiKey, "calendar:read");

      // Check if the user ID in the URL matches the API key's user ID
      if (apiKeyRecord.user.userId !== userId) {
        throw new HTTPException(403, {
          message: "Unauthorized access to this calendar",
        });
      }

      try {
        // Generate calendar data using the iCalendar utility
        const calendar = await createICalendar(
          userId,
          calendarType === "full",
          c,
        );

        // Set proper content type for iCalendar file
        c.header("Content-Type", "text/calendar");
        c.header(
          "Content-Disposition",
          `attachment; filename=${userId}_calendar.ics`,
        );
        c.header("Cache-Control", "private, max-age=3600"); // Cache for 1 hour

        return c.body(calendar);
      } catch (error) {
        console.error("Error generating calendar:", error);
        throw new HTTPException(500, {
          message: "Failed to generate calendar",
        });
      }
    },
  )
  // Authenticated endpoint for accessing calendar data
  .get("/", verifyApiKey, requireScope("calendar:read"), async (c) => {
    // Type assertion for user to handle the 'unknown' type issue
    const user = c.get("user") as {
      userId: string;
      name: string;
      email: string;
    };

    try {
      const currentDate = new Date();
      const sixMonthsFromNow = addDays(currentDate, 180); // Look ahead 6 months

      // Use Firebase to fetch calendar events with optimized query
      const { adminFirestore } = getFirebaseAdmin(c);
      const eventsRef = adminFirestore
        .collection("users")
        .doc(user.userId)
        .collection("events");

      // Optimized query with proper indexing for date range filtering
      let eventsSnapshot;
      try {
        eventsSnapshot = await eventsRef
          .where("start", "<=", sixMonthsFromNow.toISOString())
          .where("end", ">=", currentDate.toISOString())
          .orderBy("start", "asc")
          .limit(50) // Reasonable limit for API response
          .get();
      } catch (firebaseError) {
        console.error(
          `Firebase query error for user ${user.userId}:`,
          firebaseError,
        );
        // Return empty snapshot to avoid breaking the API
        eventsSnapshot = { docs: [], empty: true };
      }

      // Convert Firebase documents to event objects
      const formattedEvents = eventsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data["title"],
          details: data["details"],
          location: data["location"],
          start: data["start"],
          end: data["end"],
          allDay: data["allDay"] || false,
          repeat: data["repeat"],
          color: data["color"],
          tag: data["tag"],
        };
      });
      return c.json({
        userId: user.userId,
        events: formattedEvents,
      });
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      throw new HTTPException(500, {
        message: "Failed to fetch calendar data",
      });
    }
  });

export default app;
