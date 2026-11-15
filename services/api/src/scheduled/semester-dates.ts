import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";
import {
  mergeSemesterRows,
  semesterInfo as bundledSemesterInfo,
  type SemesterInfo,
} from "@courseweb/shared/semester";
import {
  fetchAcademicCalendarEvents,
  type CalendarApiResponse,
} from "../aca-calendar";
import { generateJSON, type LlmEnv, type ProviderName } from "../ai/llm";

export type SemesterDate = {
  id: string;
  begins: string;
  ends: string;
  sourceText: string;
  extractionMethod: "rules" | "llm";
};

type SemesterDatesEnv = LlmEnv & {
  DB: D1Database;
  CALENDAR_API_KEY?: string;
  SEMESTER_LLM_PROVIDER?: ProviderName;
  SEMESTER_LLM_MODEL?: string;
};

type CalendarEvent = Pick<CalendarApiResponse, "summary" | "start" | "end">;
type SemesterLlmExtractor = (input: {
  id: string;
  sourceText: string;
  env: LlmEnv;
}) => Promise<unknown>;

export const SEMESTER_LLM_SCHEMA = {
  type: "object",
  properties: {
    semesterId: { type: "string" },
    begins: { type: "string" },
    ends: { type: "string" },
    beginsEvidence: { type: "string" },
    endsEvidence: { type: "string" },
  },
  required: ["semesterId", "begins", "ends", "beginsEvidence", "endsEvidence"],
} as const;

const llmSemesterSchema = z
  .object({
    semesterId: z.string().regex(/^\d{3}(10|20|30)$/),
    begins: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ends: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    beginsEvidence: z.string().trim().min(1),
    endsEvidence: z.string().trim().min(1),
  })
  .strict();

const SOURCE_FETCH_TIMEOUT_MS = 12_000;
const LLM_TIMEOUT_MS = 12_000;
const MIN_TERM_DAYS = 70;
const MAX_TERM_DAYS = 180;
const MIN_SUMMER_DAYS = 14;
const MAX_SUMMER_DAYS = 150;

const asDateKey = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return value;
};

const shiftDate = (date: string, days: number): string => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const eventDate = (event: CalendarEvent): string | undefined =>
  asDateKey(event.start?.date ?? event.start?.dateTime?.slice(0, 10));

const academicYearFromLabel = (summary: string): number | undefined => {
  const yearRange =
    /(?:academic\s*year\s*)?(\d{4})\s*[-–/]\s*\d{4}(?:\s*academic\s*year)?/iu.exec(
      summary,
    );
  const match =
    /(?:民國\s*)?(\d{3,4})\s*(?:學年度|學年)/iu.exec(summary) ??
    /academic\s*year\s*(\d{4})/iu.exec(summary);
  const value = Number(yearRange?.[1] ?? match?.[1]);
  if (!Number.isFinite(value)) return undefined;
  return value < 1000 ? value : value - 1911;
};

const termFromLabel = (summary: string): number | undefined => {
  const chinese = /第\s*([一二三123])\s*學期/u.exec(summary)?.[1];
  if (chinese) {
    return ({ 一: 1, 二: 2, 三: 3, "1": 1, "2": 2, "3": 3 } as const)[
      chinese as "一" | "二" | "三" | "1" | "2" | "3"
    ];
  }
  if (/\b(?:first|1st)\s+semester\b|\bfall\s+semester\b/iu.test(summary)) {
    return 1;
  }
  if (/\b(?:second|2nd)\s+semester\b|\bspring\s+semester\b/iu.test(summary)) {
    return 2;
  }
  if (
    /\b(?:third|3rd)\s+semester\b|\bsummer\s+(?:session|semester)\b/iu.test(
      summary,
    )
  ) {
    return 3;
  }
  return undefined;
};

const isClassStart = (summary: string) =>
  /上課開始|開始上課|開學日?|始業|學期開始|正式上課|classes?\s+begin|start\s+of\s+classes|semester\s+begins?/iu.test(
    summary,
  );

const hasBeginEvidence = (summary: string) =>
  /上課|開學|始業|開課|classes?/iu.test(summary) ||
  /(?:學期|semester)[^\n]{0,20}(?:開始|啟動|起|begin|start)|(?:開始|啟動|begin|start)[^\n]{0,20}(?:學期|semester)/iu.test(
    summary,
  );

const isBreakStart = (summary: string) =>
  /(?:寒假|冬假|winter\s+(?:break|vacation))[^\n]{0,30}(?:開始|起|begin|start)|(?:暑假|summer\s+(?:break|vacation))[^\n]{0,30}(?:開始|起|begin|start)|(?:開始|起|begin|start)[^\n]{0,30}(?:寒假|冬假|暑假|winter\s+(?:break|vacation)|summer\s+(?:break|vacation))/iu.test(
    summary,
  );

const hasBreakEvidence = (summary: string) =>
  /寒假|冬假|暑假|winter\s+(?:break|vacation)|summer\s+(?:break|vacation)/iu.test(
    summary,
  );

const idForCalendarDate = (
  date: string,
  summary: string,
  boundary: "begin" | "break",
): string | undefined => {
  const labelYear = academicYearFromLabel(summary);
  const labelTerm = termFromLabel(summary);
  const [year, month] = date.split("-").map(Number);
  let term = labelTerm;
  let rocYear = labelYear;

  if (term === undefined || rocYear === undefined) {
    if (boundary === "break" && /寒假|冬假|winter/iu.test(summary)) {
      term ??= 1;
      rocYear ??= month! === 1 ? year! - 1912 : year! - 1911;
    } else if (boundary === "break" && /暑假|summer/iu.test(summary)) {
      term ??= 2;
      rocYear ??= year! - 1912;
    } else if (month! >= 8 || month! <= 1) {
      term ??= 1;
      rocYear ??= month! === 1 ? year! - 1912 : year! - 1911;
    } else if (month! >= 2 && month! <= 7) {
      term ??= 2;
      rocYear ??= year! - 1912;
    }
  }

  if (rocYear === undefined || term === undefined) return undefined;
  return `${String(rocYear).padStart(3, "0")}${term}0`;
};

const normalizedEvents = (events: readonly CalendarEvent[]) =>
  events.flatMap((event) => {
    const date = eventDate(event);
    const summary =
      typeof event.summary === "string" ? event.summary.trim() : "";
    if (!date || !summary) return [];
    return [{ event, date, summary }];
  });

type SemesterEvidence = {
  begins: Array<{ date: string; summary: string }>;
  breaks: Array<{ date: string; summary: string }>;
  ruleBegins: Array<{ date: string; summary: string }>;
  ruleBreaks: Array<{ date: string; summary: string }>;
  all: Array<{ date: string; summary: string }>;
};

const collectEvidence = (events: readonly CalendarEvent[]) => {
  const evidence = new Map<string, SemesterEvidence>();
  const add = (
    id: string | undefined,
    kind: "begins" | "breaks" | "ruleBegins" | "ruleBreaks" | "all",
    item: { date: string; summary: string },
  ) => {
    if (!id) return;
    const current = evidence.get(id) ?? {
      begins: [],
      breaks: [],
      ruleBegins: [],
      ruleBreaks: [],
      all: [],
    };
    current[kind].push(item);
    evidence.set(id, current);
  };

  for (const item of normalizedEvents(events)) {
    const { date, summary } = item;
    const labeledId = idForCalendarDate(date, summary, "begin");
    add(labeledId, "all", { date, summary });
    if (hasBeginEvidence(summary)) {
      add(labeledId, "begins", {
        date,
        summary,
      });
    }
    if (isClassStart(summary)) {
      add(labeledId, "ruleBegins", { date, summary });
    }
    if (hasBreakEvidence(summary)) {
      add(labeledId, "breaks", { date, summary });
    }
    if (isBreakStart(summary)) {
      add(idForCalendarDate(date, summary, "break"), "ruleBreaks", {
        date,
        summary,
      });
    }
  }
  return evidence;
};

const daysInclusive = (begins: string, ends: string) =>
  (Date.parse(`${ends}T00:00:00Z`) - Date.parse(`${begins}T00:00:00Z`)) /
    86_400_000 +
  1;

const monthIsPlausible = (id: string, begins: string, ends: string) => {
  const term = id.slice(3);
  const startMonth = Number(begins.slice(5, 7));
  const endMonth = Number(ends.slice(5, 7));
  if (term === "10")
    return (
      startMonth >= 8 && startMonth <= 10 && (endMonth >= 11 || endMonth === 1)
    );
  if (term === "20")
    return startMonth >= 1 && startMonth <= 4 && endMonth >= 5 && endMonth <= 8;
  return startMonth >= 5 && startMonth <= 8 && endMonth >= 6 && endMonth <= 10;
};

export const validateSemesterDate = (
  candidate: Pick<SemesterDate, "id" | "begins" | "ends">,
  neighbours: readonly Pick<
    SemesterInfo,
    "id" | "begins" | "ends"
  >[] = bundledSemesterInfo,
): string[] => {
  const errors: string[] = [];
  const begins = asDateKey(candidate.begins);
  const ends = asDateKey(candidate.ends);
  if (!/^\d{3}(10|20|30)$/.test(candidate.id))
    errors.push("invalid semester ID");
  if (!begins || !ends || begins > ends) errors.push("invalid date range");
  if (!begins || !ends) return errors;

  const summer = candidate.id.endsWith("30");
  const duration = daysInclusive(begins, ends);
  if (
    duration < (summer ? MIN_SUMMER_DAYS : MIN_TERM_DAYS) ||
    duration > (summer ? MAX_SUMMER_DAYS : MAX_TERM_DAYS)
  ) {
    errors.push("implausible semester duration");
  }
  if (!monthIsPlausible(candidate.id, begins, ends)) {
    errors.push("implausible semester months");
  }

  for (const neighbour of neighbours) {
    if (neighbour.id === candidate.id) continue;
    const otherBegins = neighbour.begins.toISOString().slice(0, 10);
    const otherEnds = neighbour.ends.toISOString().slice(0, 10);
    if (begins <= otherEnds && otherBegins <= ends) {
      errors.push(`overlaps semester ${neighbour.id}`);
    }
  }
  return errors;
};

const defaultSemesterLlmExtractor: SemesterLlmExtractor = async ({
  id,
  sourceText,
  env,
}) => {
  const configured = env as SemesterDatesEnv;
  return (
    await generateJSON({
      env,
      provider:
        configured.SEMESTER_LLM_PROVIDER ??
        configured.SELECTION_LLM_PROVIDER ??
        "workers-ai",
      model: configured.SEMESTER_LLM_MODEL ?? configured.SELECTION_LLM_MODEL,
      timeoutMs: LLM_TIMEOUT_MS,
      schema: SEMESTER_LLM_SCHEMA,
      system:
        "Extract one NTHU semester's first class day and the last day before its winter or summer break. Use only events for the requested semester. Google all-day break events begin on the first break day, so the semester ends one calendar day earlier. Return exact event summaries as evidence.",
      text: `Semester ID: ${id}\nCalendar events (date — summary):\n${sourceText}`,
    })
  ).data;
};

const evidenceText = (evidence: SemesterEvidence) =>
  evidence.all
    .map((item) => `${item.date} — ${item.summary}`)
    .join("\n")
    .slice(0, 24_000);

const validateLlmCandidate = (
  value: unknown,
  id: string,
  evidence: SemesterEvidence,
): Pick<SemesterDate, "begins" | "ends"> | undefined => {
  const parsed = llmSemesterSchema.safeParse(value);
  if (!parsed.success || parsed.data.semesterId !== id) return undefined;
  const { begins, ends, beginsEvidence, endsEvidence } = parsed.data;
  const beginEvent = evidence.begins.find(
    (item) => item.date === begins && item.summary.includes(beginsEvidence),
  );
  const breakEvent = evidence.breaks.find(
    (item) =>
      item.date === shiftDate(ends, 1) &&
      item.summary.includes(endsEvidence) &&
      /(?:寒假|冬假|暑假|winter|summer|break|vacation)/iu.test(item.summary),
  );
  if (!beginEvent || !breakEvent) return undefined;
  return { begins, ends };
};

export async function extractSemesterDates(
  events: readonly CalendarEvent[],
  env: LlmEnv,
  llmExtractor: SemesterLlmExtractor = defaultSemesterLlmExtractor,
  neighbours: readonly Pick<
    SemesterInfo,
    "id" | "begins" | "ends"
  >[] = bundledSemesterInfo,
): Promise<{ rows: SemesterDate[]; failed: string[] }> {
  const grouped = collectEvidence(events);
  const rows: SemesterDate[] = [];
  const failed: string[] = [];

  for (const id of [...grouped.keys()].sort((left, right) =>
    left.localeCompare(right),
  )) {
    const evidence = grouped.get(id)!;
    const begins = [...evidence.ruleBegins].sort((left, right) =>
      left.date.localeCompare(right.date),
    )[0];
    const breakStart = begins
      ? evidence.ruleBreaks
          .filter((item) => item.date > begins.date)
          .sort((left, right) => left.date.localeCompare(right.date))[0]
      : undefined;
    let candidate =
      begins && breakStart
        ? { begins: begins.date, ends: shiftDate(breakStart.date, -1) }
        : undefined;
    let extractionMethod: SemesterDate["extractionMethod"] = "rules";

    if (
      !candidate ||
      validateSemesterDate({ id, ...candidate }, neighbours).length
    ) {
      try {
        const parsed = validateLlmCandidate(
          await llmExtractor({ id, sourceText: evidenceText(evidence), env }),
          id,
          evidence,
        );
        if (parsed) {
          candidate = parsed;
          extractionMethod = "llm";
        }
      } catch (error) {
        console.warn(`[semester-dates] LLM extraction failed for ${id}`, error);
      }
    }

    if (!candidate) {
      if (evidence.begins.length || evidence.breaks.length) failed.push(id);
      continue;
    }
    const errors = validateSemesterDate({ id, ...candidate }, neighbours);
    if (errors.length) {
      console.warn(`[semester-dates] rejected ${id}: ${errors.join(", ")}`);
      failed.push(id);
      continue;
    }
    const sourceText = evidenceText(evidence);
    rows.push({ id, ...candidate, sourceText, extractionMethod });
  }
  return { rows, failed };
}

type StoredSemesterDate = SemesterDate & { fetchedAt: string };

export async function readMergedSemesterInfo(
  db: D1Database | undefined,
  now = new Date(),
): Promise<SemesterInfo[]> {
  if (!db) return bundledSemesterInfo;
  try {
    const result = await db
      .prepare('SELECT "semester", "begins", "ends" FROM "semester_dates"')
      .all<{ semester: string; begins: string; ends: string }>();
    const rows = (result.results ?? []).map((row) => ({
      id: row.semester,
      begins: row.begins,
      ends: row.ends,
      hasCourses: false,
    }));
    return mergeSemesterRows(rows, now);
  } catch (error) {
    console.warn(
      "[semester-dates] stored dates unavailable; using bundled dates",
      error,
    );
    return bundledSemesterInfo;
  }
}

const readStoredSemesterDates = async (
  db: D1Database,
): Promise<StoredSemesterDate[]> => {
  const result = await db
    .prepare(
      'SELECT "semester", "begins", "ends", "source_text", "extraction_method", "fetched_at" FROM "semester_dates"',
    )
    .all<{
      semester: string;
      begins: string;
      ends: string;
      source_text: string;
      extraction_method: "rules" | "llm";
      fetched_at: string;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.semester,
    begins: row.begins,
    ends: row.ends,
    sourceText: row.source_text,
    extractionMethod: row.extraction_method,
    fetchedAt: row.fetched_at,
  }));
};

const extractionRank = (method: SemesterDate["extractionMethod"]) =>
  method === "rules" ? 2 : 1;

export const persistGoodSemesterDates = async (
  db: D1Database,
  candidates: readonly SemesterDate[],
  now: Date,
): Promise<string[]> => {
  const storedRows = await readStoredSemesterDates(db);
  const stored = new Map(storedRows.map((row) => [row.id, row]));
  const saved: string[] = [];
  const fetchedAt = now.toISOString();
  for (const row of candidates) {
    if (validateSemesterDate(row).length) continue;
    const previous = stored.get(row.id);
    if (
      previous &&
      !validateSemesterDate(previous).length &&
      extractionRank(row.extractionMethod) <
        extractionRank(previous.extractionMethod)
    ) {
      continue;
    }
    await db
      .prepare(
        `INSERT INTO "semester_dates" ("semester", "begins", "ends", "source_text", "extraction_method", "fetched_at")
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT("semester") DO UPDATE SET
           "begins" = excluded."begins",
           "ends" = excluded."ends",
           "source_text" = excluded."source_text",
           "extraction_method" = excluded."extraction_method",
           "fetched_at" = excluded."fetched_at"`,
      )
      .bind(
        row.id,
        row.begins,
        row.ends,
        row.sourceText,
        row.extractionMethod,
        fetchedAt,
      )
      .run();
    saved.push(row.id);
  }
  return saved;
};

export async function syncSemesterDates(
  env: SemesterDatesEnv,
  now = new Date(),
  calendarFetcher = fetchAcademicCalendarEvents,
  llmExtractor: SemesterLlmExtractor = defaultSemesterLlmExtractor,
): Promise<{ saved: string[]; failed: string[] }> {
  if (!env.CALENDAR_API_KEY) {
    console.warn(
      "[semester-dates] CALENDAR_API_KEY is missing; stored dates kept",
    );
    return { saved: [], failed: ["calendar-sync"] };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear() + 2, 0, 1));
  try {
    const events = await calendarFetcher(
      start,
      end,
      env.CALENDAR_API_KEY,
      SOURCE_FETCH_TIMEOUT_MS,
    );
    const neighbours = await readMergedSemesterInfo(env.DB, now);
    const extracted = await extractSemesterDates(
      events,
      env,
      llmExtractor,
      neighbours,
    );
    const saved = await persistGoodSemesterDates(env.DB, extracted.rows, now);
    console.log(
      `[semester-dates] saved ${saved.join(", ") || "no rows"}; failed ${extracted.failed.join(", ") || "none"}`,
    );
    return { saved, failed: extracted.failed };
  } catch (error) {
    console.error("[semester-dates] sync failed; stored dates kept", error);
    return { saved: [], failed: ["calendar-sync"] };
  }
}
