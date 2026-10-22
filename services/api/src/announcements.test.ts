import { afterEach, describe, expect, mock, test } from "bun:test";
import fixture from "./announcements.fixture.json";
import {
  createAnnouncementsApp,
  normalizeAnnouncements,
  sourceIdFor,
} from "./announcements";

const now = new Date("2026-10-21T00:00:00.000Z");

afterEach(() => mock.restore());

describe("announcement normalization", () => {
  test("drops invalid and out-of-retention dates and sorts newest first", () => {
    const result = normalizeAnnouncements(
      fixture.sources,
      [fixture.zh, fixture.en],
      now,
    );

    expect(result.articles).toEqual([
      {
        title: "Valid",
        link: "https://example/valid",
        date: "2026-10-20",
        sourceIds: [sourceIdFor(fixture.sources[0])],
      },
      {
        title: "English valid",
        link: "https://example/en",
        date: "2026-10-19",
        sourceIds: [sourceIdFor(fixture.sources[1])],
      },
    ]);
    expect(result.sources).toHaveLength(2);
  });

  test("uses every source identity field for a stable ID", () => {
    const source = fixture.sources[0];
    expect(sourceIdFor(source)).toBe(sourceIdFor({ ...source }));
    expect(sourceIdFor(source)).not.toBe(
      sourceIdFor({ ...source, language: "en" }),
    );
  });

  test("rejects invalid upstream shapes instead of treating them as empty", () => {
    expect(() =>
      normalizeAnnouncements({ error: "upstream down" }, [fixture.zh], now),
    ).toThrow();
    expect(() =>
      normalizeAnnouncements(
        fixture.sources,
        [{ error: "upstream down" }],
        now,
      ),
    ).toThrow();
    expect(() =>
      normalizeAnnouncements(
        [{ ...fixture.sources[0], title: 42 }],
        [fixture.zh],
        now,
      ),
    ).toThrow();
  });

  test("keeps only HTTP and HTTPS source and article links", () => {
    const result = normalizeAnnouncements(
      [
        ...fixture.sources,
        {
          ...fixture.sources[0],
          link: "javascript:alert(1)",
          title: "Unsafe source",
        },
      ],
      [
        [
          {
            ...fixture.zh[0],
            articles: [
              ...fixture.zh[0].articles,
              {
                title: "Unsafe article",
                link: "javascript:alert(1)",
                date: "2026-10-20",
              },
            ],
          },
        ],
      ],
      now,
    );

    expect(
      result.sources.every((source) =>
        /^https?:$/.test(new URL(source.link).protocol),
      ),
    ).toBe(true);
    expect(
      result.articles.some((article) => article.title === "Unsafe article"),
    ).toBe(false);
    expect(
      result.sources.some((source) => source.title === "Unsafe source"),
    ).toBe(false);
  });

  test("deduplicates canonical article URLs and preserves every source ID", () => {
    const firstSource = {
      ...fixture.sources[0],
      link: "https://example/source-a",
    };
    const secondSource = {
      ...fixture.sources[1],
      link: "https://example/source-b",
    };
    const result = normalizeAnnouncements(
      [firstSource, secondSource],
      [
        [
          {
            ...firstSource,
            articles: [
              {
                title: "Shared announcement",
                link: " https://example/article/?Lang=zh-tw ",
                date: "2026-10-20",
              },
            ],
          },
        ],
        [
          {
            ...secondSource,
            articles: [
              {
                title: "Shared announcement",
                link: "https://example/article?Lang=zh-tw",
                date: "2026-10-19",
              },
            ],
          },
        ],
      ],
      now,
    );

    expect(result.articles).toEqual([
      {
        title: "Shared announcement",
        link: "https://example/article?Lang=zh-tw",
        date: "2026-10-20",
        sourceIds: [sourceIdFor(firstSource), sourceIdFor(secondSource)],
      },
    ]);
  });

  test("deduplicates fixture cross-posts by title, date, and department", () => {
    const result = normalizeAnnouncements(
      fixture.sources,
      [fixture.dedup],
      now,
    );

    expect(result.articles).toEqual([
      {
        title: "116學年度碩、博士班甄試核定報名人數統計表",
        link: "https://example/doctoral",
        date: "2026-10-20",
        sourceIds: [
          sourceIdFor(fixture.dedup[0]),
          sourceIdFor(fixture.dedup[1]),
        ],
      },
      {
        title: "防颱 注意事項",
        link: "https://example/typhoon-announcement",
        date: "2026-10-19",
        sourceIds: [
          sourceIdFor(fixture.dedup[2]),
          sourceIdFor(fixture.dedup[3]),
        ],
      },
      {
        title: "防颱注意事項",
        link: "https://example/typhoon-health",
        date: "2026-10-19",
        sourceIds: [sourceIdFor(fixture.dedup[6])],
      },
      {
        title: "116年學生宿舍齋長改選辦法",
        link: "https://example/dorm-election",
        date: "2026-10-18",
        sourceIds: [
          sourceIdFor(fixture.dedup[4]),
          sourceIdFor(fixture.dedup[5]),
        ],
      },
    ]);
  });
});

describe("announcements route", () => {
  test("fetches the source index and supported language filters", async () => {
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/sources")) return Response.json(fixture.sources);
      return Response.json(
        url.includes("language=en") ? fixture.en : fixture.zh,
      );
    });
    const app = createAnnouncementsApp(fetchMock as unknown as typeof fetch);

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=900");
    expect((await response.json()).articles).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual(
      expect.arrayContaining([
        "https://api.nthusa.tw/announcements/sources",
        "https://api.nthusa.tw/announcements?language=zh-tw",
        "https://api.nthusa.tw/announcements?language=en",
      ]),
    );
  });

  test("returns a clear 502 when every cache is unavailable and upstream fails", async () => {
    const app = createAnnouncementsApp(
      mock(async () => {
        throw new Error("network failure");
      }) as unknown as typeof fetch,
    );

    const response = await app.request("/");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Announcements service unavailable",
    });
  });

  test("does not cache invalid upstream payloads", async () => {
    let cacheWrites = 0;
    const cache = {
      match: async () => undefined,
      put: async () => {
        cacheWrites += 1;
      },
    } as unknown as Cache;
    const app = createAnnouncementsApp(
      mock(async () =>
        Response.json({ error: "upstream down" }),
      ) as unknown as typeof fetch,
      cache,
    );

    const response = await app.request("/");

    expect(response.status).toBe(502);
    expect(cacheWrites).toBe(0);
  });

  test("continues upstream refresh when the initial cache read fails", async () => {
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/sources")) return Response.json(fixture.sources);
      return Response.json(
        url.includes("language=en") ? fixture.en : fixture.zh,
      );
    });
    const cache = {
      match: async () => {
        throw new Error("cache read failure");
      },
      put: async () => undefined,
    } as unknown as Cache;
    const app = createAnnouncementsApp(
      fetchMock as unknown as typeof fetch,
      cache,
    );

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("returns a clear 502 when cache read and upstream refresh both fail", async () => {
    const cache = {
      match: async () => {
        throw new Error("cache read failure");
      },
    } as unknown as Cache;
    const app = createAnnouncementsApp(
      mock(async () => {
        throw new Error("network failure");
      }) as unknown as typeof fetch,
      cache,
    );

    const response = await app.request("/");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Announcements service unavailable",
    });
  });

  test("does not fail a successful response when cache write fails", async () => {
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/sources")) return Response.json(fixture.sources);
      return Response.json(
        url.includes("language=en") ? fixture.en : fixture.zh,
      );
    });
    const cache = {
      match: async () => undefined,
      put: async () => {
        throw new Error("cache write failure");
      },
    } as unknown as Cache;
    const app = createAnnouncementsApp(
      fetchMock as unknown as typeof fetch,
      cache,
    );

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect((await response.json()).articles).toHaveLength(2);
  });

  test("serves the last cached response when a refresh fails", async () => {
    let fetchCalls = 0;
    let cacheMatches = 0;
    let cachedResponse: Response | undefined;
    const cache = {
      match: async () => {
        cacheMatches += 1;
        return cacheMatches > 2 ? cachedResponse : undefined;
      },
      put: async (_key: Request, response: Response) => {
        cachedResponse = response;
      },
    } as unknown as Cache;
    const fetcher = mock(async (input: RequestInfo | URL) => {
      fetchCalls += 1;
      if (fetchCalls > 3) throw new Error("refresh failure");
      const url = String(input);
      if (url.endsWith("/sources")) return Response.json(fixture.sources);
      return Response.json(
        url.includes("language=en") ? fixture.en : fixture.zh,
      );
    });
    const app = createAnnouncementsApp(
      fetcher as unknown as typeof fetch,
      cache,
    );

    expect((await app.request("/")).status).toBe(200);
    const staleResponse = await app.request("/");

    expect(staleResponse.status).toBe(200);
    expect(await staleResponse.json()).toEqual(
      expect.objectContaining({ articles: expect.any(Array) }),
    );
    expect(fetcher).toHaveBeenCalledTimes(6);
  });
});
