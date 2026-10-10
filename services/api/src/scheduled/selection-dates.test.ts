import { afterEach, describe, expect, mock, test } from "bun:test";
import currentHtml from "./fixtures/selection-11510.html" with { type: "text" };
import nextHtml from "./fixtures/selection-11520.html" with { type: "text" };
import {
  discoverSelectionSources,
  extractSelectionDocument,
  findSelectionSourceLinks,
  getSelectionSourceTargets,
  getSemesterBounds,
  parseSelectionHtml,
  readStoredSelectionSchedules,
  SELECTION_SOURCE_URLS,
  sha256,
  syncSelectionDates,
  validateSelectionPeriods,
  type ScrapedSelectionPeriod,
  type SelectionSourceTarget,
} from "./selection-dates";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const target = (semester: string): SelectionSourceTarget => ({
  semester,
  url: SELECTION_SOURCE_URLS[semester as keyof typeof SELECTION_SOURCE_URLS],
});

describe("official selection schedule parser", () => {
  test.each([
    ["11510", currentHtml, 7, "2026-06-15", "2026-11-20"],
    ["11520", nextHtml, 6, "2026-12-28", "2027-04-29"],
  ] as const)(
    "parses %s with ROC dates and known phase ids",
    (semester, html, count, firstDate, lastDate) => {
      const result = parseSelectionHtml(html, target(semester));
      expect(result.extractionMethod).toBe("parser");
      expect(result.periods).toHaveLength(count);
      expect(result.periods[0]!.startDate).toBe(firstDate);
      expect(result.periods.at(-1)!.endDate).toBe(lastDate);
      expect(result.periods.map((period) => period.phase)).not.toContain(
        "preselect",
      );
      expect(
        result.periods.find((period) => period.phase === "inter-school"),
      ).toMatchObject({
        startTime: "12:00",
        endTime: semester === "11510" ? "17:00" : "09:00",
      });
    },
  );

  test("handles a range whose end date has an explicit next ROC year", () => {
    const result = parseSelectionHtml(nextHtml, target("11520"));
    expect(
      result.periods.find((period) => period.phase === "add-drop"),
    ).toMatchObject({ startDate: "2027-02-12", endDate: "2027-03-01" });
  });

  test("keeps Taipei wall-clock dates and the next-day daily closing window", () => {
    const result = parseSelectionHtml(currentHtml, target("11510"));
    expect(result.periods[0]).toMatchObject({
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      startTime: "12:00",
      endTime: "09:00",
    });
  });

  test("selects the target semester table when one page contains two semesters", () => {
    const html = `
      <section><h2>115下重要選課日期</h2><table><tr><th>選課階段</th><th>開放日期</th></tr>
        <tr><td>第1次選課</td><td>115/12/28～116/1/11</td></tr>
      </table></section>
      <section><h2>115上重要選課日期</h2><table><tr><th>選課階段</th><th>開放日期</th></tr>
        <tr><td>第1次選課</td><td>115/6/15～115/6/17</td></tr>
      </table></section>`;
    expect(parseSelectionHtml(html, target("11510")).periods[0]).toMatchObject({
      startDate: "2026-06-15",
      endDate: "2026-06-17",
    });
  });

  test("handles a date cell that spans rows without shifting the date column", () => {
    const html = `
      <table><thead><tr><th>選課階段</th><th>開放日期</th><th>備註</th></tr></thead>
        <tbody><tr><td>第1次選課</td><td rowspan="2">115/6/15～115/6/17</td><td rowspan="2">每日開放</td></tr>
        <tr><td>不相關列</td></tr></tbody>
      </table>`;
    expect(parseSelectionHtml(html, target("11510")).periods[0]).toMatchObject({
      phase: "round-1",
      startDate: "2026-06-15",
    });
  });

  test("handles a 1 MB adversarial phase label promptly", () => {
    const html = `<table><tr><th>選課階段</th><th>開放日期</th></tr>
      <tr><td>add${" ".repeat(1_000_000)}drop</td><td>not a date</td></tr>
    </table>`;
    const startedAt = performance.now();

    expect(() => parseSelectionHtml(html, target("11510"))).toThrow(
      /no known selection phases found/,
    );
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });
});

const replacePeriod = (
  periods: ScrapedSelectionPeriod[],
  phase: ScrapedSelectionPeriod["phase"],
  changes: Partial<ScrapedSelectionPeriod>,
) =>
  periods.map((period) =>
    period.phase === phase ? { ...period, ...changes } : period,
  );

describe("selection schedule validation", () => {
  const validPeriods = parseSelectionHtml(currentHtml, target("11510")).periods;

  test.each([
    [
      "unknown phase",
      [{ ...validPeriods[0]!, phase: "unknown" }],
      "unknown phase",
    ],
    [
      "same-day period",
      replacePeriod(validPeriods, "round-1", { endDate: "2026-06-15" }),
      "start must be before",
    ],
    [
      "outside the semester margin",
      replacePeriod(validPeriods, "round-1", {
        startDate: "2020-01-01",
        endDate: "2020-01-02",
      }),
      "outside",
    ],
    [
      "forbidden overlap",
      replacePeriod(validPeriods, "round-2", {
        startDate: "2026-06-16",
        endDate: "2026-06-24",
      }),
      "forbidden overlap",
    ],
    [
      "implausible order",
      replacePeriod(validPeriods, "round-2", {
        startDate: "2026-06-10",
        endDate: "2026-06-11",
      }),
      "implausible phase order",
    ],
  ] as const)("rejects %s", (_name, periods, expected) => {
    expect(
      validateSelectionPeriods(
        periods as ScrapedSelectionPeriod[],
        "11510",
      ).some((error) => error.includes(expected)),
    ).toBe(true);
  });

  test("permits the official add-drop and inter-school overlap", () => {
    expect(validateSelectionPeriods(validPeriods, "11510")).toEqual([]);
  });

  test("uses a bounded margin around the semester instead of rejecting preselection", () => {
    const bounds = getSemesterBounds("11510");
    expect(bounds.startDate < "2026-06-15").toBe(true);
    expect("2026-11-20" < bounds.endDate).toBe(true);
  });

  test("rejects a page from the adjacent semester", () => {
    const wrongSemester = parseSelectionHtml(nextHtml, target("11510"));
    expect(validateSelectionPeriods(wrongSemester.periods, "11510")).toEqual(
      expect.arrayContaining([expect.stringContaining("outside")]),
    );
  });

  test("uses the conservative academic-year bounds when the table has no row", () => {
    const bounds = getSemesterBounds("11520");
    expect(bounds.startDate).toBe("2026-10-04");
    expect(bounds.endDate).toBe("2027-11-28");
  });
});

class FakeD1 {
  readonly rows = new Map<string, string>();
  runCount = 0;

  prepare(sql: string) {
    return {
      bind: (...values: string[]) => ({
        first: async <T>() => {
          const data = this.rows.get(values[0]!);
          return (data ? { data } : null) as T | null;
        },
        run: async () => {
          this.runCount += 1;
          this.rows.set(values[0]!, values[1]!);
          return { success: true };
        },
        all: async <T>() => ({
          results: [...this.rows.entries()]
            .filter(([key]) => key.startsWith("course_selection_schedule:"))
            .map(([, data]) => ({ data })) as T[],
        }),
      }),
      sql,
    };
  }
}

describe("scheduled sync", () => {
  test("skips an unchanged source hash without writing", async () => {
    const html = currentHtml;
    const hash = await sha256(html);
    const db = new FakeD1();
    db.rows.set(
      "course_selection_schedule:11510",
      JSON.stringify({
        semester: "11510",
        periods: [],
        metadata: {
          sourceUrl: SELECTION_SOURCE_URLS["11510"],
          fetchedAt: "2099-10-09T18:00:00.000Z",
          contentHash: hash,
          extractionMethod: "parser",
        },
      }),
    );
    globalThis.fetch = mock(async () => new Response(html)) as typeof fetch;

    const result = await syncSelectionDates(
      { DB: db } as never,
      new Date("2026-10-10T00:00:00Z"),
      [target("11510")],
    );

    expect(result).toEqual({ saved: [], skipped: ["11510"], failed: [] });
    expect(db.runCount).toBe(0);
  });

  test("does not replace prior data after an unreadable source", async () => {
    const db = new FakeD1();
    const previous = JSON.stringify({
      semester: "11510",
      periods: [{ phase: "round-1" }],
      metadata: {
        sourceUrl: SELECTION_SOURCE_URLS["11510"],
        fetchedAt: "2026-10-09T18:00:00.000Z",
        contentHash: "old-hash",
        extractionMethod: "parser",
      },
    });
    db.rows.set("course_selection_schedule:11510", previous);
    globalThis.fetch = mock(
      async () => new Response("<p>unreadable source</p>"),
    ) as typeof fetch;

    const result = await syncSelectionDates(
      { DB: db } as never,
      new Date("2026-10-10T00:00:00Z"),
      [target("11510")],
    );

    expect(result).toEqual({ saved: [], skipped: [], failed: ["11510"] });
    expect(db.runCount).toBe(0);
    expect(db.rows.get("course_selection_schedule:11510")).toBe(previous);
  });

  test("retains a previously stored phase when the new page omits it", async () => {
    const db = new FakeD1();
    const previous = parseSelectionHtml(currentHtml, target("11510")).periods;
    db.rows.set(
      "course_selection_schedule:11510",
      JSON.stringify({
        semester: "11510",
        periods: previous,
        metadata: {
          sourceUrl: SELECTION_SOURCE_URLS["11510"],
          fetchedAt: "2026-10-09T18:00:00.000Z",
          contentHash: "old-hash",
          extractionMethod: "parser",
        },
      }),
    );
    const missingWithdrawal = currentHtml.replace(
      /<tr class="stage-withdraw">[\s\S]*?<\/tr>/,
      "",
    );
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      String(input).includes("403-1208")
        ? new Response(
            '<a href="/p/404-1208-306079.php?Lang=zh-tw">115上重要選課日期</a>',
          )
        : new Response(missingWithdrawal),
    ) as unknown as typeof fetch;

    const result = await syncSelectionDates(
      { DB: db } as never,
      new Date("2026-10-10T00:00:00Z"),
      [target("11510")],
    );

    expect(result).toEqual({ saved: ["11510"], skipped: [], failed: [] });
    expect(
      JSON.parse(db.rows.get("course_selection_schedule:11510")!).periods,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: "withdrawal" }),
      ]),
    );
  });

  test("reads dynamically discovered future semester cache rows", async () => {
    const db = new FakeD1();
    db.rows.set(
      "course_selection_schedule:11610",
      JSON.stringify({
        semester: "11610",
        periods: [],
        metadata: { fetchedAt: "2099-10-09T18:00:00.000Z" },
      }),
    );
    db.rows.set(
      "course_selection_schedule:11420",
      JSON.stringify({
        semester: "11420",
        periods: [],
        metadata: { fetchedAt: "2020-10-09T18:00:00.000Z" },
      }),
    );
    await expect(readStoredSelectionSchedules(db as never)).resolves.toEqual([
      expect.objectContaining({ semester: "11610" }),
    ]);
  });

  test("uses the LLM only after deterministic parsing fails", async () => {
    const result = await extractSelectionDocument(
      "<p>unreadable source</p>",
      target("11510"),
      {},
      async () => ({
        periods: [
          {
            phase: "round-1",
            startDate: "2026-06-15",
            endDate: "2026-06-17",
            sourceSummary: "第1次選課 115/6/15-6/17",
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      extractionMethod: "llm",
      periods: [{ phase: "round-1", audience: "unspecified" }],
    });
  });

  test("rejects LLM dates that belong outside the requested semester", async () => {
    const result = await extractSelectionDocument(
      "<p>unreadable source</p>",
      target("11510"),
      {},
      async () => ({
        periods: [
          {
            phase: "round-1",
            startDate: "2027-04-27",
            endDate: "2027-04-29",
            sourceSummary: "wrong-semester fallback",
          },
        ],
      }),
    );

    expect(
      validateSelectionPeriods(result.periods, "11510").some((error) =>
        error.includes("outside"),
      ),
    ).toBe(true);
  });

  test.each([
    ["blank response", "", /empty JSON response/i],
    ["malformed response", "not json", /JSON Parse/i],
  ] as const)(
    "rejects an LLM provider %s",
    async (_name, content, expected) => {
      globalThis.fetch = mock(
        async () =>
          new Response(
            JSON.stringify({ choices: [{ message: { content } }] }),
            { headers: { "Content-Type": "application/json" } },
          ),
      ) as typeof fetch;
      await expect(
        extractSelectionDocument("<p>unreadable source</p>", target("11510"), {
          GROQ_API_KEY: "test-key",
          AI_PROVIDER_ORDER: "groq",
        }),
      ).rejects.toThrow(expected);
    },
  );

  test("discovers the current and next configured semesters", () => {
    expect(getSelectionSourceTargets(new Date("2026-10-10T00:00:00Z"))).toEqual(
      [
        { semester: "11510", url: SELECTION_SOURCE_URLS["11510"] },
        { semester: "11520", url: SELECTION_SOURCE_URLS["11520"] },
      ],
    );
  });

  test("discovers links by ROC academic year and semester title", async () => {
    const listing = `
      <a href="/p/404-1208-306079.php?Lang=zh-tw">115上重要選課日期</a>
      <a href="/p/404-1208-306080.php?Lang=zh-tw">115學年度第2學期選課日程</a>
      <a href="/p/404-1208-summer.php?Lang=zh-tw">115暑期選課日期</a>`;
    expect(findSelectionSourceLinks(listing, "11520")).toEqual([
      SELECTION_SOURCE_URLS["11520"],
    ]);
    const fetcher = mock(async () => new Response(listing));
    const discovered = await discoverSelectionSources(
      ["11510", "11520"],
      fetcher as unknown as typeof fetch,
    );
    expect([...discovered.values()]).toEqual([
      expect.objectContaining({
        semester: "11510",
        url: SELECTION_SOURCE_URLS["11510"],
        resolution: "discovery",
      }),
      expect.objectContaining({
        semester: "11520",
        url: SELECTION_SOURCE_URLS["11520"],
        resolution: "discovery",
      }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("rolls ROC semesters over at Taipei midnight", () => {
    expect(
      getSelectionSourceTargets(new Date("2027-01-31T15:59:59Z"))[0]!.semester,
    ).toBe("11520");
    expect(
      getSelectionSourceTargets(new Date("2027-01-31T16:00:00Z"))[0]!.semester,
    ).toBe("11520");
    expect(
      getSelectionSourceTargets(new Date("2027-07-31T16:00:00Z"))[0]!.semester,
    ).toBe("11610");
  });
});
