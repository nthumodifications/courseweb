import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyApiKey, requireScope } from "../middleware/apikey";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createICalendar } from "../utils/icalendar";
import { addDays } from "date-fns";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { sha256hash } from "../utils/sha256";
import prisma from "../client";

const lazyRequireAuth = (scopes: string[]) =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return requireAuth(scopes)(c, next);
  }) as MiddlewareHandler;

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

const getEtag = async (body: string) => {
  // Weak because DTSTAMP is excluded so unchanged timetable identity stays stable.
  const identity = body.replace(/^DTSTAMP:[^\r\n]*\r\n/gm, "");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `W/"${hex}"`;
};

const matchesIfNoneMatch = (value: string | undefined, etag: string) =>
  value?.split(",").some((candidate) => {
    const trimmed = candidate.trim();
    return (
      trimmed === "*" ||
      trimmed.replace(/^W\//i, "") === etag.replace(/^W\//i, "")
    );
  }) ?? false;

const app = new Hono()
  .get("/share-tokens", lazyRequireAuth(["calendar"]), async (c) => {
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
    lazyRequireAuth(["calendar"]),
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
    lazyRequireAuth(["calendar"]),
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
  .on(
    ["GET", "HEAD"],
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
        c.header("Content-Type", "text/calendar; charset=utf-8");
        c.header(
          "Content-Disposition",
          `attachment; filename=${encodeURIComponent(userId)}_calendar.ics`,
        );
        c.header("Cache-Control", "private, max-age=300");
        c.header("Vary", "Accept-Encoding");
        const etag = await getEtag(calendar);
        c.header("ETag", etag);
        const ifNoneMatch = c.req.header("If-None-Match");
        if (matchesIfNoneMatch(ifNoneMatch, etag)) {
          return new Response(null, { status: 304, headers: c.res.headers });
        }

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
      const eventsSnapshot = await eventsRef
        .where("start", "<=", sixMonthsFromNow.toISOString())
        .where("end", ">=", currentDate.toISOString())
        .orderBy("start", "asc")
        .limit(50) // Reasonable limit for API response
        .get();

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
