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
