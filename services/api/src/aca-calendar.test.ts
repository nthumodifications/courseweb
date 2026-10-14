import {
  afterEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import app, {
  getNoClassDates,
  isNoClassSummary,
  parseCalendarPayload,
} from "./aca-calendar";
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
  test.each([
    "國慶日補假 Holiday-Double Tenth Day (no class)",
    "臺灣光復暨金門古寧頭大捷紀念日補假 Holiday-Taiwan Restoration Day (no class)",
    "全校運動大會(停課一天)  Sports Day (no class)",
    "校際活動週(停課一日，是否補課由教師自行決定) Intercollegiate Activities (no class: make-up classes are held at the teacher's discretion)",
    "校際活動週(停課一日，課程由教師自行擇期補課)Intercollegiate Activities (no class: make-up classes will be scheduled)",
    "中秋節 Mid-Autumn Festival (no class)",
    "兒童節 Children's Day (No Class)",
    "兒童節補假 Holiday- Children's Day (no class)",
    "兒童節補假Holiday-Children's Day (No Class)",
    "勞動節 International Labor’s Day (no class)",
    "勞動節補假 Holiday-International Labor’s Day (no class)",
    "和平紀念日 228 Peace Memorial Day (no class)",
    "和平紀念日補假 Holiday-228 Peace Memorial Day (no class)",
    "和平紀念日補假Holiday-228 Peace Memorial Day (No Class)",
    "國慶日 Double Tenth Day (no class)",
    "教師節 Teacher's Day (no class)",
    "民族掃墓節補假Holiday-Tomb Sweeping Day (no class)",
    "清明節 Tomb Sweeping Day (no class)",
    "臺灣光復暨金門古寧頭大捷紀念日 Taiwan Restoration Day (no class)",
    "臺灣光復暨金門古寧頭大捷紀念日補假 Holiday-Taiwan Restoration Day (no class)",
  ])("recognizes no-class summary: %s", (summary) => {
    expect(isNoClassSummary(summary)).toBe(true);
  });

  test.each([
    "梅竹賽( 26日至28日，26日下午停課，是否補課由教師自行決定 ；若停賽則正常上課) [Tentative] Mei-Chu Game (2/26-2/28)",
    "梅竹賽(6日至8日，6日下午停課，由教師自行擇期補課；若停賽則正常上課 Mei-Chu Game (3/6-3/8)",
    "114學年度第2學期申請課程停修開始(至5月8日止)Course Withdrawal Begins(4/20-5/8)",
    "停修 116/4/12（一）～ 4/29（四）",
    "停修申請 無法繼續修習時可申請停修，成績單顯示「W」且不退費。 115/11/02（一）～ 11/20（五）",
    "寒假開始 Winter Break Begins",
    "暑假開始 Summer Vacation Begins",
    "暑假開始Summer Vacation Begins",
    "教師進修及休假研究申請案送人事室截止 Deadline for Submission of Faculty Sabbatical Leave Application",
    "教師進修及休假研究申請案送人事室截止Deadline for Submission of Faculty Sabbatical Leave Application University Council Meeting",
    "暑期班申請課程停修開始(至7日止) Summer Session Withdrawal (8/3-8/7)",
    "新生領航營(至2日止)",
    "教師送繳...成績截止",
  ])("does not treat non-holiday summary as no-class: %s", (summary) => {
    expect(isNoClassSummary(summary)).toBe(false);
  });

  test("expands an all-day multi-day event with an exclusive end date", () => {
    const event = {
      ...academicEvent("sports", "Sports Day (no class)", "2026-11-11"),
      end: { date: "2026-11-13" },
    };

    expect(getNoClassDates([event])).toEqual(
      new Set(["2026-11-11", "2026-11-12"]),
    );
  });

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
