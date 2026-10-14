import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";
import type { D1Database } from "@cloudflare/workers-types";
import {
  parseCourseSelectionPeriod,
  parseCourseSelectionPeriods,
  type AcademicCalendarEvent,
} from "./course-selection-periods";
import {
  readStoredSelectionSchedules,
  selectionSchedulesToEvents,
} from "./scheduled/selection-dates";
import { fetchUpstream, UpstreamHttpError } from "./utils/upstream";

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

const calendarApiDate = (date: Date): string => date.toISOString().slice(0, 10);

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

/**
 * Fetch the Google academic calendar without applying the route-specific
 * course-selection filtering. Consumers that need the raw academic events
 * should use this function so the Google request and payload parsing stay in
 * one place.
 */
export async function fetchAcademicCalendarEvents(
  start: Date,
  end: Date,
  apiKey: string,
  timeoutMs = 8_000,
): Promise<CalendarApiResponse[]> {
  const upstreamStart = new Date(start);
  upstreamStart.setUTCDate(upstreamStart.getUTCDate() - 120);
  const CALENDAR_API_URL = `https://www.googleapis.com/calendar/v3/calendars/nthu.acad%40gmail.com/events?key=${apiKey}&timeMin=${calendarApiDate(upstreamStart)}T00:00:00Z&timeMax=${calendarApiDate(end)}T00:00:00Z`;
  const res = await fetchUpstream(CALENDAR_API_URL, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  const parsedCalendarDatas = parseCalendarPayload(await res.json());
  if (!parsedCalendarDatas) {
    console.error("Google Calendar response had an invalid items array");
    throw new HTTPException(502, {
      message: "Academic calendar upstream returned an unexpected payload",
    });
  }
  return parsedCalendarDatas;
}

const BREAK_START_MARKER =
  /(?:寒假|暑假|winter\s+break|summer\s+break)[^\n,，;；]{0,30}(?:開始|begins?)|(?:開始|begins?)[^\n,，;；]{0,30}(?:寒假|暑假|winter\s+break|summer\s+break)/iu;
const PARTIAL_DAY_OR_CONDITIONAL_MARKER =
  /(?:上午|下午|晚上|中午)\s*停課|停課\s*(?:上午|下午|晚上|中午)|\b(?:morning|afternoon|evening)\b|若[^\n。]{0,80}正常上課/iu;

/** Return whether an academic event explicitly means that classes do not run. */
export function isNoClassSummary(summary: string): boolean {
  if (
    BREAK_START_MARKER.test(summary) ||
    PARTIAL_DAY_OR_CONDITIONAL_MARKER.test(summary)
  ) {
    return false;
  }
  return /no\s+class/i.test(summary) || /停課|放假/.test(summary);
}

export type InclusiveDateRange = { start: string; end: string };

/**
 * Expand no-class academic events into Taipei calendar dates. Google all-day
 * event end dates are exclusive, so an event 10/26--10/28 yields 10/26 and
 * 10/27 only.
 */
export function getNoClassDates(
  events: CalendarApiResponse[],
  range?: InclusiveDateRange,
): Set<string> {
  const dates = new Set<string>();
  const rangeEndExclusive = range ? nextDate(range.end) : undefined;

  for (const event of events) {
    if (!isNoClassSummary(event.summary)) continue;

    const eventStart = event.start.date;
    const eventEndExclusive = event.end.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventStart)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventEndExclusive)) continue;

    let date = range
      ? eventStart < range.start
        ? range.start
        : eventStart
      : eventStart;
    const endExclusive =
      range && rangeEndExclusive && eventEndExclusive > rangeEndExclusive
        ? rangeEndExclusive
        : eventEndExclusive;

    while (date < endExclusive) {
      dates.add(date);
      date = nextDate(date);
    }
  }

  return dates;
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

      const windowStart = start.toISOString().slice(0, 10);
      const windowEnd = end.toISOString().slice(0, 10);
      let calendarDatas: CalendarApiResponse[];
      try {
        calendarDatas = await fetchAcademicCalendarEvents(
          start,
          end,
          CALENDAR_API_KEY,
        );
      } catch (error) {
        if (error instanceof HTTPException) throw error;
        if (error instanceof UpstreamHttpError) {
          const detail = (await error.response.text())
            .replace(/[\u0000-\u001F\u007F]+/g, " ")
            .slice(0, 500);
          console.error(
            `Google Calendar request failed (${error.response.status}): ${detail}`,
          );
          throw new HTTPException(502, {
            message:
              error.response.status === 400 || error.response.status === 403
                ? "Academic calendar upstream rejected the API key"
                : "Academic calendar upstream is unavailable",
          });
        }
        console.error("Failed to fetch academic calendar", error);
        throw new HTTPException(502, {
          message: "Academic calendar upstream is unavailable",
        });
      }

      const filteredCalendarDatas = calendarDatas.filter((item) => {
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
            const itemEnd = new Date(`${item.end.date}T00:00:00Z`);
            itemEnd.setUTCDate(itemEnd.getUTCDate() - 1);
            return itemEnd.toISOString().slice(0, 10);
          })();
        return eventStart <= windowEnd && eventEnd >= windowStart;
      });

      const storedSchedules = await readStoredSelectionSchedules(
        (c.env as { DB?: D1Database } | undefined)?.DB,
      );
      const storedPhases = new Set(
        storedSchedules.flatMap((schedule) =>
          schedule.periods.map(
            (period) => `${schedule.semester}:${period.phase}`,
          ),
        ),
      );
      const googleEvents = filteredCalendarDatas
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
        })
        .filter(
          (event) =>
            !event.courseSelectionPeriod ||
            !storedPhases.has(
              `${event.courseSelectionPeriod.semester}:${event.courseSelectionPeriod.phase}`,
            ),
        );
      const scrapedEvents = selectionSchedulesToEvents(
        storedSchedules,
        windowStart,
        windowEnd,
      );

      return c.json([...googleEvents, ...scrapedEvents]);
    },
  );

export default app;
