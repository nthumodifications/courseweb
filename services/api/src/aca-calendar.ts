import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";

export type CalendarApiResponse = {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  creator: unknown;
  organizer: unknown;
  start: { date: string };
  end: { date: string };
  transparency: string;
  iCalUID: string;
  sequence: number;
  eventType: string;
};

const app = new Hono()
  // we using bun, write test with bun:test
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        // check if start and end is a iso date string
        start: z.coerce.date(),
        end: z.coerce.date(),
      }),
    ),
    async (c) => {
      const { start, end } = c.req.valid("query");
      const { CALENDAR_API_KEY } = env<{ CALENDAR_API_KEY: string }>(c);

      if (!CALENDAR_API_KEY) {
        console.error("CALENDAR_API_KEY is not configured");
        throw new HTTPException(503, {
          message: "Academic calendar is not configured",
        });
      }

      const CALENDAR_API_URL = `https://www.googleapis.com/calendar/v3/calendars/nthu.acad%40gmail.com/events?key=${CALENDAR_API_KEY}&timeMin=${start.toISOString().slice(0, 10)}T00:00:00Z&timeMax=${end.toISOString().slice(0, 10)}T00:00:00Z`;
      const res = await fetch(CALENDAR_API_URL);
      if (!res.ok) {
        // Google reports a revoked, deleted or API-disabled key as a 400
        // API_KEY_INVALID. Surface that as a distinct upstream failure so it is
        // not mistaken for a bug in this handler.
        // The upstream error body echoes back the caller's own query
        // parameters, so strip control characters and cap the length before
        // logging it — otherwise a crafted `start`/`end` could forge log lines.
        const detail = (await res.text())
          .replace(/[\u0000-\u001F\u007F]+/g, " ")
          .slice(0, 500);
        console.error(
          `Google Calendar request failed (${res.status}): ${detail}`,
        );
        throw new HTTPException(502, {
          message:
            res.status === 400 || res.status === 403
              ? "Academic calendar upstream rejected the API key"
              : "Academic calendar upstream is unavailable",
        });
      }
      const resJson = (await res.json()) as { items?: CalendarApiResponse[] };
      if (!Array.isArray(resJson.items)) {
        console.error("Google Calendar response had no items array");
        throw new HTTPException(502, {
          message: "Academic calendar upstream returned an unexpected payload",
        });
      }
      const calendarDatas = resJson.items;

      return c.json(
        calendarDatas.map((item) => {
          return {
            summary: item.summary,
            date: item.start.date,
            id: item.id,
          };
        }),
      );
    },
  );

export default app;
