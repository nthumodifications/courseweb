import { afterEach, describe, expect, mock, test } from "bun:test";
import app, { parseCalendarPayload } from "./aca-calendar";

const originalFetch = globalThis.fetch;
const originalCalendarApiKey = process.env.CALENDAR_API_KEY;

const academicEvent = (id: string, summary: string, date: string) => ({
  id,
  summary,
  start: { date },
  end: { date },
});

const googleCalendarResponse = (request: Request) => {
  const url = new URL(request.url);
  const timeMin = url.searchParams.get("timeMin")?.slice(0, 10) ?? "";
  const timeMax = url.searchParams.get("timeMax")?.slice(0, 10) ?? "";
  const events = [
    academicEvent(
      "straddles-today",
      "115學年度第1學期加退選開始(至20日止) Add-or-Drop Selection (9/3-9/20)",
      "2026-09-03",
    ),
    academicEvent(
      "straddles-month",
      "115學年度第1學期課程停修開始 Course Withdrawal (9/28-10/3)",
      "2026-09-28",
    ),
    academicEvent(
      "already-ended",
      "115學年度第1學期加退選開始(至2日止) Add-or-Drop Selection (8/1-8/2)",
      "2026-08-01",
    ),
  ].filter(({ start: { date } }) => date >= timeMin && date < timeMax);

  return new Response(JSON.stringify({ items: events }), { status: 200 });
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCalendarApiKey === undefined) {
    delete process.env.CALENDAR_API_KEY;
  } else {
    process.env.CALENDAR_API_KEY = originalCalendarApiKey;
  }
});

describe("academic calendar overlap filtering", () => {
  test("preserves normal event shape and allows a closed window", () => {
    const event = academicEvent("holiday", "校慶補假", "2026-10-12");
    expect(parseCalendarPayload({ items: [event, event] })).toEqual([
      event,
      event,
    ]);
    expect(parseCalendarPayload({ items: [] })).toEqual([]);
    expect(parseCalendarPayload({ items: [{ id: "missing" }] })).toBeNull();
  });

  test("normalizes a timed Google event to its calendar dates", () => {
    const timed = {
      id: "timed",
      summary: "Timed event",
      start: { dateTime: "2026-10-15T10:00:00+08:00" },
      end: { dateTime: "2026-10-15T11:00:00+08:00" },
    };
    expect(parseCalendarPayload({ items: [timed] })).toEqual([
      {
        ...timed,
        start: { ...timed.start, date: "2026-10-15" },
        end: { ...timed.end, date: "2026-10-16" },
      },
    ]);
  });

  test("returns a period that overlaps a visible day and month boundary", async () => {
    process.env.CALENDAR_API_KEY = "test-key";
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      googleCalendarResponse(new Request(input)),
    ) as unknown as typeof fetch;

    const todayWindow = await app.request(
      "/?start=2026-09-14T00:00:00.000Z&end=2026-09-21T00:00:00.000Z",
    );
    const monthBoundaryWindow = await app.request(
      "/?start=2026-10-01T00:00:00.000Z&end=2026-10-08T00:00:00.000Z",
    );

    expect(await todayWindow.json()).toEqual([
      expect.objectContaining({ id: "straddles-today" }),
    ]);
    expect(await monthBoundaryWindow.json()).toEqual([
      expect.objectContaining({ id: "straddles-month" }),
    ]);
  });

  test("sets a timeout on the Google Calendar request", async () => {
    process.env.CALENDAR_API_KEY = "test-key";
    let requestInit: RequestInit | undefined;
    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestInit = init;
        return googleCalendarResponse(new Request(String(_input)));
      },
    ) as unknown as typeof fetch;

    const response = await app.request(
      "/?start=2026-09-14T00:00:00.000Z&end=2026-09-21T00:00:00.000Z",
    );

    expect(response.status).toBe(200);
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
  });

  test.each([
    ["5xx", new Response("down", { status: 503 })],
    ["empty body", new Response("")],
    ["HTML error page with 200", new Response("<html>error</html>")],
    ["timeout", new Error("timeout")],
  ])("surfaces upstream %s as 502", async (_label, result) => {
    process.env.CALENDAR_API_KEY = "test-key";
    globalThis.fetch = mock(async () => {
      if (result instanceof Error) throw result;
      return result;
    }) as unknown as typeof fetch;
    const response = await app.request(
      "/?start=2026-09-14T00:00:00.000Z&end=2026-09-21T00:00:00.000Z",
    );
    expect(response.status).toBe(502);
  });
});
