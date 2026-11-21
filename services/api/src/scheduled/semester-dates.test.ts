import { describe, expect, it, mock } from "bun:test";
import calendar11520 from "./fixtures/semester-calendar-11520.json";
import badLlmOutput from "./fixtures/semester-llm-bad-output.json";
import {
  extractSemesterDates,
  persistGoodSemesterDates,
  validateSemesterDate,
} from "./semester-dates";

const fallbackEvents = [
  {
    summary: "115學年度第2學期學期啟動",
    start: { date: "2027-02-15" },
    end: { date: "2027-02-16" },
  },
  {
    summary: "115學年度暑假期間",
    start: { date: "2027-06-07" },
    end: { date: "2027-06-08" },
  },
];

describe("semester date extraction", () => {
  it("extracts class start and the final day before summer break from calendar events", async () => {
    const llmExtractor = mock(async () => {
      throw new Error("rules should be sufficient");
    });
    const result = await extractSemesterDates(calendar11520, {}, llmExtractor);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "11520",
      begins: "2027-02-15",
      ends: "2027-06-06",
      extractionMethod: "rules",
    });
    expect(llmExtractor).not.toHaveBeenCalled();
  });

  it("anchors on the first class day, not the administrative term start (#1068)", async () => {
    const events = [
      ["2026-08-01", "115學年度第1學期開始 2026 Fall Semester Begins"],
      [
        "2026-08-25",
        "115學年度第1學期第3次選課開始(至27日止) 3rd Course Selection Period (8/25-8/27)",
      ],
      [
        "2026-09-03",
        "115學年度第1學期加退選開始(至20日止) Add-or-Drop Selection (9/3-9/20)",
      ],
      [
        "2026-09-07",
        "全校各級學生上課開始、註冊日 1. Class Begin 2. Registration",
      ],
      ["2026-12-28", "寒假開始 Winter Break Begins"],
    ].map(([date, summary]) => ({
      summary,
      start: { date },
      end: { date },
    }));
    const llmExtractor = mock(async () => ({
      semesterId: "11510",
      begins: "2026-08-01",
      ends: "2026-12-27",
      beginsEvidence: "115學年度第1學期開始",
      endsEvidence: "寒假開始",
    }));

    const result = await extractSemesterDates(events, {}, llmExtractor, []);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "11510",
      begins: "2026-09-07",
      ends: "2026-12-27",
      extractionMethod: "rules",
    });
    expect(llmExtractor).not.toHaveBeenCalled();
  });

  it("rejects an LLM start date that skips the explicit class-start event", async () => {
    const events = [
      ["2026-08-01", "115學年度第1學期開始 2026 Fall Semester Begins"],
      ["2026-09-07", "全校各級學生上課開始、註冊日 Class Begin"],
      ["2026-12-28", "115學年度第1學期寒假期間"],
    ].map(([date, summary]) => ({
      summary,
      start: { date },
      end: { date },
    }));

    const result = await extractSemesterDates(
      events,
      {},
      async () => ({
        semesterId: "11510",
        begins: "2026-08-01",
        ends: "2026-12-27",
        beginsEvidence: "115學年度第1學期開始",
        endsEvidence: "115學年度第1學期寒假期間",
      }),
      [],
    );

    expect(result.rows).toEqual([]);
    expect(result.failed).toEqual(["11510"]);
  });

  it("uses the LLM only when event wording needs interpretation and checks both evidence strings", async () => {
    const result = await extractSemesterDates(fallbackEvents, {}, async () => ({
      semesterId: "11520",
      begins: "2027-02-15",
      ends: "2027-06-06",
      beginsEvidence: "115學年度第2學期學期啟動",
      endsEvidence: "115學年度暑假期間",
    }));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.extractionMethod).toBe("llm");
  });

  it("rejects LLM dates whose claimed source text is absent", async () => {
    const result = await extractSemesterDates(
      fallbackEvents,
      {},
      async () => badLlmOutput,
    );

    expect(result.rows).toEqual([]);
    expect(result.failed).toEqual(["11520"]);
  });

  it("rejects overlaps and dates outside a plausible term", () => {
    expect(
      validateSemesterDate({
        id: "11520",
        begins: "2027-02-15",
        ends: "2027-06-06",
      }),
    ).toEqual([]);
    expect(
      validateSemesterDate({
        id: "11520",
        begins: "2027-02-15",
        ends: "2027-12-06",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      validateSemesterDate(
        {
          id: "11530",
          begins: "2027-06-01",
          ends: "2027-08-01",
        },
        [
          {
            id: "11520",
            begins: new Date("2027-02-15T00:00:00Z"),
            ends: new Date("2027-06-06T00:00:00Z"),
          },
        ],
      ),
    ).toContain("overlaps semester 11520");
  });

  it("does not replace a good deterministic row with an LLM parse", async () => {
    let upserts = 0;
    const db = {
      prepare: () => ({
        all: async () => ({
          results: [
            {
              semester: "11520",
              begins: "2027-02-15",
              ends: "2027-06-06",
              source_text: "previously verified",
              extraction_method: "rules",
              fetched_at: "2026-11-01T00:00:00.000Z",
            },
          ],
        }),
        bind: () => ({
          run: async () => {
            upserts += 1;
          },
        }),
      }),
    } as never;

    const saved = await persistGoodSemesterDates(
      db,
      [
        {
          id: "11520",
          begins: "2027-02-16",
          ends: "2027-06-07",
          sourceText: "new LLM text",
          extractionMethod: "llm",
        },
      ],
      new Date("2026-11-15T00:00:00.000Z"),
    );

    expect(saved).toEqual([]);
    expect(upserts).toBe(0);
  });
});
