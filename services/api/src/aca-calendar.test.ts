import {
  afterEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import app, { parseCalendarPayload } from "./aca-calendar";
import { failingFetch, upstreamFailureCases } from "./test-helpers/upstream";

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
      "google-round-1",
      "115學年度第1學期第1次選課開始(至27日止) 1st Course Selection (8/25-8/27)",
      "2026-08-25",
    ),
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
  setSystemTime();
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

  test("keeps the pre-scraper Google-only response when the cache has no row", async () => {
    process.env.CALENDAR_API_KEY = "test-key";
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      googleCalendarResponse(new Request(input)),
    ) as unknown as typeof fetch;

    const emptyDb = {
      prepare: () => ({
        bind: () => ({ all: async () => ({ results: [] }) }),
      }),
    };
    const response = await app.request(
      "/?start=2026-09-14T00:00:00.000Z&end=2026-09-21T00:00:00.000Z",
      {},
      { DB: emptyDb, CALENDAR_API_KEY: "test-key" } as never,
    );

    expect(await response.json()).toEqual([
      expect.objectContaining({
        id: "straddles-today",
        summary:
          "115學年度第1學期加退選開始(至20日止) Add-or-Drop Selection (9/3-9/20)",
        date: "2026-09-03",
        courseSelectionPeriod: expect.objectContaining({
          semester: "11510",
          startDate: "2026-09-03",
          endDate: "2026-09-20",
        }),
      }),
    ]);
  });

  test("suppresses only Google phases represented by the stored schedule", async () => {
    setSystemTime(new Date("2026-10-10T00:00:00.000Z"));
    process.env.CALENDAR_API_KEY = "test-key";
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      googleCalendarResponse(new Request(input)),
    ) as unknown as typeof fetch;
    const db = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                data: JSON.stringify({
                  semester: "11510",
                  periods: [
                    {
                      id: "course-selection:11510:round-1",
                      semester: "11510",
                      phase: "round-1",
                      audience: "unspecified",
                      startDate: "2026-08-25",
                      endDate: "2026-08-27",
                      sourceEventId: "scraped:11510:round-1",
                      sourceSummary: "第1次選課 115/8/25～115/8/27",
                    },
                  ],
                  metadata: { fetchedAt: "2026-10-09T18:00:00.000Z" },
                }),
              },
            ],
          }),
        }),
      }),
    };

    const response = await app.request(
      "/?start=2026-08-20T00:00:00.000Z&end=2026-09-21T00:00:00.000Z",
      {},
      { DB: db, CALENDAR_API_KEY: "test-key" } as never,
    );
    const body = await response.json();

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "straddles-today" }),
        expect.objectContaining({ id: "scraped:11510:round-1" }),
      ]),
    );
    expect(body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "google-round-1" }),
      ]),
    );
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

  test.each(upstreamFailureCases)(
    "surfaces upstream %s as 502",
    async (_label, makeResult) => {
      process.env.CALENDAR_API_KEY = "test-key";
      globalThis.fetch = failingFetch(makeResult);
      const response = await app.request(
        "/?start=2026-09-14T00:00:00.000Z&end=2026-09-21T00:00:00.000Z",
      );
      expect(response.status).toBe(502);
    },
  );
});
