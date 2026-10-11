import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";
import {
  parseCourseSelectionPeriod,
  parseCourseSelectionPeriods,
  type AcademicCalendarEvent,
} from "./course-selection-periods";

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
  start: { date: string; dateTime?: string };
  end: { date: string; dateTime?: string };
  transparency: string;
  iCalUID: string;
  sequence: number;
  eventType: string;
};

const eventDate = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const date = (value as { date?: unknown }).date;
  if (typeof date === "string") return date;
  const dateTime = (value as { dateTime?: unknown }).dateTime;
  return typeof dateTime === "string" ? dateTime.slice(0, 10) : null;
};

const nextDate = (date: string): string => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

export function parseCalendarPayload(
  payload: unknown,
): CalendarApiResponse[] | null {
  if (!payload || typeof payload !== "object") return null;
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  const parsed: CalendarApiResponse[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const value = item as Record<string, unknown>;
    const start = value.start;
    const end = value.end;
    if (
      value.status === "cancelled" &&
      (!(start && typeof start === "object") ||
        !(end && typeof end === "object"))
    ) {
      continue;
    }
    const startDate = eventDate(start);
    const endDate = eventDate(end);
    if (!startDate || !endDate) return null;
    const startIsTimed = Boolean(
      start && typeof start === "object" && "dateTime" in start,
    );
    const endIsTimed = Boolean(
      end && typeof end === "object" && "dateTime" in end,
    );
    if (!startIsTimed && !endIsTimed) {
      parsed.push(item as CalendarApiResponse);
      continue;
    }
    parsed.push({
      ...(item as CalendarApiResponse),
      start: { ...(start as object), date: startDate },
      end: {
        ...(end as object),
        date: endIsTimed ? nextDate(endDate) : endDate,
      },
    });
  }
  return parsed;
}

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

      const upstreamStart = new Date(start);
      upstreamStart.setUTCDate(upstreamStart.getUTCDate() - 120);
      const windowStart = start.toISOString().slice(0, 10);
      const windowEnd = end.toISOString().slice(0, 10);
      const CALENDAR_API_URL = `https://www.googleapis.com/calendar/v3/calendars/nthu.acad%40gmail.com/events?key=${CALENDAR_API_KEY}&timeMin=${upstreamStart.toISOString().slice(0, 10)}T00:00:00Z&timeMax=${windowEnd}T00:00:00Z`;
      try {
        const res = await fetch(CALENDAR_API_URL, {
          signal: AbortSignal.timeout(8_000),
        });
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
        const calendarDatas = parseCalendarPayload(await res.json());
        if (!calendarDatas) {
          console.error("Google Calendar response had an invalid items array");
          throw new HTTPException(502, {
            message:
              "Academic calendar upstream returned an unexpected payload",
          });
        }
        return c.json(
          calendarDatas
            .filter((item) => {
              const event = {
                id: item.id,
                summary: item.summary,
                date: item.start.date,
              } satisfies AcademicCalendarEvent;
              const selectionPeriod = parseCourseSelectionPeriods([event])[0];
              const eventStart = selectionPeriod?.startDate ?? item.start.date;
              const eventEnd =
                selectionPeriod?.endDate ??
                (() => {
                  const end = new Date(`${item.end.date}T00:00:00Z`);
                  end.setUTCDate(end.getUTCDate() - 1);
                  return end.toISOString().slice(0, 10);
                })();
              return eventStart <= windowEnd && eventEnd >= windowStart;
            })
            .map((item) => {
              const event = {
                summary: item.summary,
                date: item.start.date,
                id: item.id,
              } satisfies AcademicCalendarEvent;
              return {
                ...event,
                courseSelectionPeriod: parseCourseSelectionPeriod(event),
              };
            }),
        );
      } catch (error) {
        if (error instanceof HTTPException) throw error;
        console.error("Failed to fetch academic calendar", error);
        throw new HTTPException(502, {
          message: "Academic calendar upstream is unavailable",
        });
      }
    },
  );

export default app;
