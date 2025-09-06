import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "hono/adapter";

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
      const CALENDAR_API_URL = `https://www.googleapis.com/calendar/v3/calendars/nthu.acad%40gmail.com/events?key=${CALENDAR_API_KEY}&timeMin=${start.toISOString().slice(0, 10)}T00:00:00Z&timeMax=${end.toISOString().slice(0, 10)}T00:00:00Z`;
      const res = await fetch(CALENDAR_API_URL);
      if (!res.ok) {
        throw new Error(
          "Failed to fetch data " + res.status + (await res.text()),
        );
      }
      const resJson = (await res.json()) as any;
      if (resJson.success === false) {
        throw new Error("Failed to fetch data " + resJson.result);
      }
      const calendarDatas = resJson.items as CalendarApiResponse[];

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
