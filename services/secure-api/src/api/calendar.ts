import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyApiKey, requireScope } from "../middleware/apikey";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createICalendar } from "../utils/icalendar";
import { addDays } from "date-fns";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/requireAuth";
import { sha256hash } from "../utils/sha256";

const prisma = new PrismaClient();

const generateCalendarShareToken = () =>
  "cal_" +
  Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

const publicCalendarUrl = (c: any, userId: string, token: string) => {
  const url = new URL(c.req.url);
  url.pathname = `/api/calendar/ics/${encodeURIComponent(userId)}`;
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
};

const app = new Hono()
  .get("/share-tokens", requireAuth(["calendar"]), async (c) => {
    const tokens = await prisma.calendarShareToken.findMany({
      where: {
        userId: c.var.user.userId,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        includeFullDetails: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return c.json(tokens);
  })
  .post(
    "/share-tokens",
    requireAuth(["calendar"]),
    zValidator(
      "json",
      z.object({
        name: z.string().trim().min(1).max(80).default("Calendar share"),
        includeFullDetails: z.boolean().default(false),
        expiresAt: z.string().datetime().optional(),
      }),
    ),
    async (c) => {
      const user = c.var.user;
      const { name, includeFullDetails, expiresAt } = c.req.valid("json");
      const token = generateCalendarShareToken();
      const tokenHash = await sha256hash(token);

      const shareToken = await prisma.calendarShareToken.create({
        data: {
          name,
          tokenHash,
          userId: user.userId,
          includeFullDetails,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
        select: {
          id: true,
          name: true,
          includeFullDetails: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      return c.json(
        {
          ...shareToken,
          token,
          url: publicCalendarUrl(c, user.userId, token),
        },
        201,
      );
    },
  )
  .delete(
    "/share-tokens/:id",
    requireAuth(["calendar"]),
    zValidator(
      "param",
      z.object({
        id: z.string().uuid(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const existing = await prisma.calendarShareToken.findFirst({
        where: {
          id,
          userId: c.var.user.userId,
          revokedAt: null,
        },
      });

      if (!existing) {
        return c.json({ error: "Calendar share token not found" }, 404);
      }

      await prisma.calendarShareToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      return c.json({ success: true });
    },
  )
  // Public endpoint for accessing calendar via dedicated share token
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
        token: z.string(),
        type: z.enum(["basic", "full"]).default("basic"),
      }),
    ),
    async (c) => {
      const { userId } = c.req.valid("param");
      const { token, type: calendarType } = c.req.valid("query");

      let includeFullDetails = false;

      const tokenHash = await sha256hash(token);
      const shareToken = await prisma.calendarShareToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (
        !shareToken ||
        shareToken.revokedAt ||
        (shareToken.expiresAt && shareToken.expiresAt < new Date()) ||
        shareToken.user.userId !== userId
      ) {
        throw new HTTPException(403, {
          message: "Unauthorized access to this calendar",
        });
      }

      includeFullDetails =
        shareToken.includeFullDetails && calendarType === "full";

      await prisma.calendarShareToken.update({
        where: { id: shareToken.id },
        data: { lastUsedAt: new Date() },
      });

      try {
        // Generate calendar data using the iCalendar utility
        const calendar = await createICalendar(userId, includeFullDetails, c);

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
