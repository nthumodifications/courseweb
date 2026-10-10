import { parseHTML } from "linkedom/worker";
import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";
import {
  type CourseSelectionAudience,
  type CourseSelectionPeriodDetails,
  type CourseSelectionPhase,
} from "../course-selection-periods";
import {
  generateJSON,
  type GenerateJsonOptions,
  type LlmEnv,
  type ProviderName,
} from "../ai/llm";

export const SELECTION_SOURCE_URLS = {
  "11510": "https://curricul.site.nthu.edu.tw/p/404-1208-306079.php?Lang=zh-tw",
  "11520": "https://curricul.site.nthu.edu.tw/p/404-1208-306080.php?Lang=zh-tw",
} as const;

// RPage keeps the category/listing id stable while assigning new ids to the
// linked semester pages. The first URL currently contains both known links;
// the -1 form is the same category rendered through the list-page route.
export const SELECTION_DISCOVERY_URLS = [
  "https://curricul.site.nthu.edu.tw/p/403-1208-7893.php?Lang=zh-tw",
  "https://curricul.site.nthu.edu.tw/p/403-1208-7893-1.php?Lang=zh-tw",
] as const;

const SOURCE_HOST = "curricul.site.nthu.edu.tw";

const CACHE_PREFIX = "course_selection_schedule:";
const SOURCE_USER_AGENT = "NTHUMods-selection-dates/1.0";
const TAIPEI_TIME_ZONE = "Asia/Taipei";
const SEMESTER_BOUND_MARGIN_DAYS = 120;
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const MAX_SOURCE_BODY_BYTES = 2 * 1024 * 1024;
const MAX_DISCOVERY_CANDIDATES = 3;
const SELECTION_LLM_TIMEOUT_MS = 15_000;
export const MAX_SELECTION_CACHE_AGE_MS = 36 * 60 * 60 * 1000;
const DATE_PATTERN =
  /(?:(\d{3,4})\s*[-/.年]\s*)?(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/g;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_EVIDENCE_PATTERN = /(?:^|[^\d])(\d{1,2})[:：](\d{2})(?!\d)/g;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

type HtmlElement = {
  textContent?: string | null;
  querySelector(selector: string): HtmlElement | null;
  querySelectorAll(selector: string): HtmlElement[];
  getAttribute(name: string): string | null;
  parentElement?: HtmlElement | null;
  previousElementSibling?: HtmlElement | null;
  tagName?: string;
};

type HtmlDocument = HtmlElement & { body?: HtmlElement | null };

const PHASES = [
  "round-1",
  "round-2",
  "round-3",
  "new-students",
  "add-drop",
  "inter-school",
  "withdrawal",
] as const satisfies readonly CourseSelectionPhase[];

type SelectionPhase = (typeof PHASES)[number];

const PHASE_AUDIENCE: Record<SelectionPhase, CourseSelectionAudience> = {
  "round-1": "unspecified",
  "round-2": "unspecified",
  "round-3": "unspecified",
  "new-students": "new-students",
  "add-drop": "unspecified",
  "inter-school": "inter-school",
  withdrawal: "unspecified",
};

const REQUIRED_PHASES_BY_TERM = {
  "10": [
    "round-1",
    "round-2",
    "round-3",
    "add-drop",
    "inter-school",
    "withdrawal",
  ],
  "20": [
    "round-1",
    "round-2",
    "round-3",
    "add-drop",
    "inter-school",
    "withdrawal",
  ],
} as const satisfies Record<"10" | "20", readonly SelectionPhase[]>;

export type SelectionSourceTarget = {
  semester: string;
  url: string;
};

export type ScrapedSelectionPeriod = CourseSelectionPeriodDetails & {
  startTime?: string;
  endTime?: string;
};

export type StoredSelectionSchedule = {
  semester: string;
  periods: ScrapedSelectionPeriod[];
  metadata: {
    sourceUrl: string;
    fetchedAt: string;
    contentHash: string;
    extractionMethod: "parser" | "llm";
    sourceResolution?: "discovery" | "seed-fallback";
  };
};

type SelectionScraperEnv = LlmEnv & { DB: D1Database };

export const SELECTION_LLM_SCHEMA = {
  type: "object",
  properties: {
    periods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phase: { type: "string", enum: [...PHASES] },
          startDate: { type: "string" },
          endDate: { type: "string" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          sourceSummary: { type: "string" },
        },
        required: ["phase", "startDate", "endDate", "sourceSummary"],
      },
    },
  },
  required: ["periods"],
} as const;

const llmPeriodSchema = z
  .object({
    phase: z.enum(PHASES),
    startDate: z.string(),
    endDate: z.string(),
    startTime: z.string().regex(TIME_PATTERN).optional(),
    endTime: z.string().regex(TIME_PATTERN).optional(),
    sourceSummary: z.string().trim().min(1),
  })
  .strict();

const llmResultSchema = z
  .object({ periods: z.array(llmPeriodSchema).min(1) })
  .strict();

const normalizeFullWidthDigits = (value: string) =>
  value.replace(/[０-９]/g, (digit) =>
    String.fromCharCode(
      digit.charCodeAt(0) - "０".charCodeAt(0) + "0".charCodeAt(0),
    ),
  );

const normalizeText = (value: string) =>
  normalizeFullWidthDigits(value.replace(/\s+/g, " ")).trim();

const padTime = (value: string) => {
  const [hour, minute] = value.split(":");
  return `${hour!.padStart(2, "0")}:${minute}`;
};

const parseTimeRange = (value: string) => {
  const times = [...value.matchAll(/(\d{1,2}:\d{2})/g)].map((match) =>
    padTime(match[1]!),
  );
  return {
    startTime: times[0],
    endTime: times[1],
  };
};

const toDateKey = (year: number, month: number, day: number) => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const rocOrGregorianYear = (value: string) => {
  const year = Number(value);
  return year < 1000 ? year + 1911 : year;
};

const parseDateRange = (value: string, rocYear: number) => {
  const dates = [...value.matchAll(DATE_PATTERN)];
  if (dates.length < 2) return null;
  const first = dates[0]!;
  const second = dates[1]!;
  const startYear = first[1] ? rocOrGregorianYear(first[1]) : rocYear + 1911;
  const startMonth = Number(first[2]);
  const startDay = Number(first[3]);
  const startDate = toDateKey(startYear, startMonth, startDay);
  if (!startDate) return null;

  let endYear = startYear;
  if (second[1]) {
    endYear = rocOrGregorianYear(second[1]);
  } else if (Number(second[2]) < startMonth) {
    endYear += 1;
  }
  const endDate = toDateKey(endYear, Number(second[2]), Number(second[3]));
  if (!endDate) return null;
  return { startDate, endDate };
};

const phaseFromLabel = (label: string): SelectionPhase | null => {
  const lowerLabel = label.toLowerCase();
  const compactLabel = lowerLabel.replaceAll(" ", "");
  if (
    label.includes("新生選課") ||
    lowerLabel.includes("new student") ||
    lowerLabel.includes("transfer student")
  )
    return "new-students";
  if (
    label.includes("加退選") ||
    compactLabel.includes("adddrop") ||
    compactLabel.includes("add-drop")
  )
    return "add-drop";
  if (
    label.includes("校際選修") ||
    label.includes("校際選課") ||
    compactLabel.includes("interschool") ||
    compactLabel.includes("inter-school")
  )
    return "inter-school";
  if (
    label.includes("停修") ||
    label.includes("課程停修") ||
    lowerLabel.includes("withdrawal")
  )
    return "withdrawal";
  const round = label.match(/第\s*([123])\s*次選課/);
  if (round) return `round-${round[1]}` as SelectionPhase;
  const englishRound = label.match(/\b(1st|2nd|3rd)\b.*selection/i);
  if (englishRound) {
    return `round-${{ "1st": 1, "2nd": 2, "3rd": 3 }[englishRound[1]!]}` as SelectionPhase;
  }
  return null;
};

const semesterParts = (semester: string) => {
  const match = semester.match(/^(\d{3})(10|20)$/);
  if (!match) throw new Error(`Unsupported semester id: ${semester}`);
  return { rocYear: Number(match[1]), term: match[2] === "10" ? 1 : 2 };
};

const titleMatchesSemester = (value: string, semester: string) => {
  const { rocYear, term } = semesterParts(semester);
  const title = normalizeText(value);
  if (/暑期|暑修|summer\s+(?:session|term)/i.test(title)) return false;
  if (
    !new RegExp(String.raw`(?:^|\D)${rocYear}(?:學年度|年度|年)?`).test(title)
  )
    return false;
  const termPattern =
    term === 1
      ? /上(?:學期)?|第\s*1\s*學期|first\s+semester|fall/i
      : /下(?:學期)?|第\s*2\s*學期|second\s+semester|spring/i;
  return termPattern.test(title);
};

const pageIdentityMatches = (document: HtmlDocument, semester: string) =>
  document
    .querySelectorAll("title,h1,h2,h3,h4,h5,h6")
    .some((heading) =>
      titleMatchesSemester(heading.textContent ?? "", semester),
    );

const htmlHasPageIdentity = (html: string, semester: string) => {
  const { document: parsedDocument } = parseHTML(html);
  return pageIdentityMatches(
    parsedDocument as unknown as HtmlDocument,
    semester,
  );
};

export type SelectionSourceResolution = "discovery" | "seed-fallback";

export type DiscoveredSelectionSource = SelectionSourceTarget & {
  resolution: "discovery";
  discoveryUrl: string;
  html: string;
};

const resolveOfficialUrl = (href: string, baseUrl: string) => {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== "https:" || url.hostname !== SOURCE_HOST) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

export function findSelectionSourceLinks(
  html: string,
  semester: string,
  listingUrl: string = SELECTION_DISCOVERY_URLS[0],
): string[] {
  const { document: parsedDocument } = parseHTML(html);
  const document = parsedDocument as unknown as HtmlDocument;
  const sources = new Set<string>();
  for (const link of document.querySelectorAll("a")) {
    const href = link.getAttribute("href");
    const title = normalizeText(link.textContent ?? "");
    if (!href || !titleMatchesSemester(title, semester)) continue;
    const url = resolveOfficialUrl(href, listingUrl);
    if (url) sources.add(url);
  }
  return [...sources];
}

type SelectionFetcher = typeof fetch;

const readBoundedResponseBody = async (body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    totalBytes += chunk.value.byteLength;
    if (totalBytes > MAX_SOURCE_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`source body exceeds ${MAX_SOURCE_BODY_BYTES} bytes`);
    }
    chunks.push(chunk.value);
  }
  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bodyBytes);
};

const fetchHtml = async (url: string, fetcher: SelectionFetcher) => {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const fetchAndRead = async () => {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "text/html", "User-Agent": SOURCE_USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`source returned HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_SOURCE_BODY_BYTES
    ) {
      throw new Error(`source body exceeds ${MAX_SOURCE_BODY_BYTES} bytes`);
    }
    if (!response.body) throw new Error("source response has no body");
    return readBoundedResponseBody(response.body);
  };

  try {
    return await Promise.race([
      fetchAndRead(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(
            new Error(
              `source request timed out after ${SOURCE_FETCH_TIMEOUT_MS}ms`,
            ),
          );
        }, SOURCE_FETCH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export async function discoverSelectionSources(
  semesters: string[],
  fetcher: SelectionFetcher = fetch,
): Promise<Map<string, DiscoveredSelectionSource | null>> {
  const linksBySemester = new Map<string, Map<string, string>>();
  for (const listingUrl of SELECTION_DISCOVERY_URLS) {
    try {
      const html = await fetchHtml(listingUrl, fetcher);
      for (const semester of semesters) {
        const links = findSelectionSourceLinks(html, semester, listingUrl);
        const candidates =
          linksBySemester.get(semester) ?? new Map<string, string>();
        for (const link of links) {
          if (candidates.size >= MAX_DISCOVERY_CANDIDATES) break;
          candidates.set(link, listingUrl);
        }
        if (candidates.size > 0) linksBySemester.set(semester, candidates);
      }
    } catch (error) {
      console.warn(
        "[selection-dates] discovery listing failed at " +
          listingUrl +
          ": " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  const discovered = new Map<string, DiscoveredSelectionSource | null>();
  for (const semester of semesters) {
    const links = linksBySemester.get(semester) ?? new Map<string, string>();
    const urls = [...links.keys()];
    const candidates: Array<{
      url: string;
      html: string;
      discoveryUrl: string;
    }> = [];
    for (const url of urls) {
      try {
        const html = await fetchHtml(url, fetcher);
        const { document: parsedDocument } = parseHTML(html);
        const document = parsedDocument as unknown as HtmlDocument;
        if (pageIdentityMatches(document, semester)) {
          candidates.push({ url, html, discoveryUrl: links.get(url)! });
        }
      } catch (error) {
        console.warn(
          `[selection-dates] candidate failed for ${semester} at ${url}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (candidates.length === 0) continue;

    const valid = candidates.filter((candidate) => {
      try {
        const parsed = parseSelectionHtml(candidate.html, {
          semester,
          url: candidate.url,
        });
        return validateSelectionPeriods(parsed.periods, semester).length === 0;
      } catch {
        return false;
      }
    });
    if (valid.length > 1 || (valid.length === 0 && candidates.length > 1)) {
      console.warn(`[selection-dates] ambiguous sources for ${semester}`);
      discovered.set(semester, null);
      continue;
    }
    const selected = valid[0] ?? candidates[0]!;
    discovered.set(semester, {
      semester,
      url: selected.url,
      resolution: "discovery",
      discoveryUrl: selected.discoveryUrl,
      html: selected.html,
    });
  }
  return discovered;
}

export class SelectionDocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelectionDocumentParseError";
  }
}

type LogicalCell = { cell: HtmlElement; direct: boolean };
type ActiveCell = { cell: HtmlElement; remaining: number };

const fillRowspanCells = (
  active: Array<ActiveCell | undefined>,
  logical: Array<LogicalCell | undefined>,
) => {
  for (let column = 0; column < active.length; column += 1) {
    const entry = active[column];
    if (!entry) continue;
    logical[column] = { cell: entry.cell, direct: false };
    entry.remaining -= 1;
    if (entry.remaining <= 0) active[column] = undefined;
  }
};

const placeDirectCell = (
  cell: HtmlElement,
  column: number,
  active: Array<ActiveCell | undefined>,
  logical: Array<LogicalCell | undefined>,
) => {
  const colspan = Math.max(1, Number(cell.getAttribute("colspan") ?? "1"));
  const rowspan = Math.max(1, Number(cell.getAttribute("rowspan") ?? "1"));
  for (let offset = 0; offset < colspan; offset += 1) {
    const targetColumn = column + offset;
    logical[targetColumn] = { cell, direct: true };
    if (rowspan > 1) active[targetColumn] = { cell, remaining: rowspan - 1 };
  }
  return column + colspan;
};

const placeDirectCells = (
  row: HtmlElement,
  active: Array<ActiveCell | undefined>,
  logical: Array<LogicalCell | undefined>,
) => {
  let column = 0;
  for (const cell of row.querySelectorAll("td")) {
    while (logical[column]) column += 1;
    column = placeDirectCell(cell, column, active, logical);
  }
};

const logicalRows = (table: HtmlElement): LogicalCell[][] => {
  const active: Array<ActiveCell | undefined> = [];
  const rows: LogicalCell[][] = [];
  for (const row of table.querySelectorAll("tbody tr, tr")) {
    const logical: Array<LogicalCell | undefined> = [];
    fillRowspanCells(active, logical);
    placeDirectCells(row, active, logical);
    if (logical.some(Boolean))
      rows.push(logical.filter(Boolean) as LogicalCell[]);
  }
  return rows;
};

const hasDateRange = (value: string) =>
  [...value.matchAll(DATE_PATTERN)].length >= 2;

const scheduleTables = (document: HtmlDocument) =>
  Array.from(document.querySelectorAll("table")).filter((table) => {
    const header = normalizeText(table.querySelector("tr")?.textContent ?? "");
    return (
      /選課階段|階段|selection stage/i.test(header) &&
      /開放日期|日期區間|date/i.test(header)
    );
  });

const headingBeforeTableMatches = (table: HtmlElement, semester: string) => {
  let node: HtmlElement | null | undefined = table;
  for (let level = 0; level < 8 && node; level += 1) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      const directHeading = /^H[1-6]$/i.test(sibling.tagName ?? "")
        ? sibling
        : null;
      const heading =
        directHeading ?? sibling.querySelector("h1,h2,h3,h4,h5,h6");
      if (heading) {
        return titleMatchesSemester(heading.textContent ?? "", semester);
      }
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return false;
};

const tableIdentityMatches = (
  table: HtmlElement,
  document: HtmlDocument,
  semester: string,
  tableCount: number,
) =>
  headingBeforeTableMatches(table, semester) ||
  (tableCount === 1 && pageIdentityMatches(document, semester));

const parseScheduleTable = (
  table: HtmlElement,
  target: SelectionSourceTarget,
  generalTimes: { startTime?: string; endTime?: string },
) => {
  const { rocYear } = semesterParts(target.semester);
  const periods: ScrapedSelectionPeriod[] = [];
  const seen = new Set<SelectionPhase>();

  for (const row of logicalRows(table)) {
    const directCells = row.filter((entry) => entry.direct);
    const phaseEntry =
      directCells.find((entry) =>
        phaseFromLabel(normalizeText(entry.cell.textContent ?? "")),
      ) ??
      row.find((entry) =>
        phaseFromLabel(normalizeText(entry.cell.textContent ?? "")),
      );
    if (!phaseEntry) continue;
    const label = normalizeText(phaseEntry.cell.textContent ?? "");
    const phase = phaseFromLabel(label);
    if (!phase) continue;
    if (seen.has(phase)) {
      throw new SelectionDocumentParseError(`duplicate phase: ${phase}`);
    }
    const dateEntry = row.find(
      (entry) =>
        entry.cell !== phaseEntry.cell &&
        hasDateRange(normalizeText(entry.cell.textContent ?? "")),
    );
    if (!dateEntry) {
      throw new SelectionDocumentParseError(
        `could not find dates for ${phase}`,
      );
    }
    const dateText = normalizeText(dateEntry.cell.textContent ?? "");
    const range = parseDateRange(dateText, rocYear);
    if (!range) {
      throw new SelectionDocumentParseError(
        `could not parse dates for ${phase}: ${dateText}`,
      );
    }
    seen.add(phase);
    const specialEnd = dateText.match(/(\d{1,2}:\d{2})\s*截止/i)?.[1];
    periods.push({
      id: `course-selection:${target.semester}:${phase}`,
      semester: target.semester,
      phase,
      audience: PHASE_AUDIENCE[phase],
      startDate: range.startDate,
      endDate: range.endDate,
      sourceEventId: `scraped:${target.semester}:${phase}`,
      sourceSummary: `${label} ${dateText}`,
      startTime: generalTimes.startTime,
      endTime: specialEnd ? padTime(specialEnd) : generalTimes.endTime,
    });
  }

  if (periods.length === 0)
    throw new SelectionDocumentParseError("no known selection phases found");
  return periods;
};

export function parseSelectionHtml(
  html: string,
  target: SelectionSourceTarget,
): { periods: ScrapedSelectionPeriod[]; extractionMethod: "parser" } {
  const { document: parsedDocument } = parseHTML(html);
  const document = parsedDocument as unknown as HtmlDocument;
  if (!pageIdentityMatches(document, target.semester)) {
    throw new SelectionDocumentParseError(
      `document title or heading does not identify ${target.semester}`,
    );
  }
  const tables = scheduleTables(document);
  if (tables.length === 0)
    throw new SelectionDocumentParseError("schedule table not found");
  const generalTimes = parseTimeRange(
    document.querySelector(".time-notice")?.textContent ?? "",
  );
  const contextualTables = tables.filter((table) =>
    tableIdentityMatches(table, document, target.semester, tables.length),
  );
  if (contextualTables.length === 0) {
    throw new SelectionDocumentParseError(
      `schedule table heading does not identify ${target.semester}`,
    );
  }
  const candidates = contextualTables.map((table) => {
    try {
      const periods = parseScheduleTable(table, target, generalTimes);
      return {
        periods,
        errors: validateSelectionPeriods(periods, target.semester),
      };
    } catch (error) {
      return {
        periods: [] as ScrapedSelectionPeriod[],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });
  const validCandidates = candidates.filter(
    (candidate) => candidate.periods.length > 0,
  );
  if (validCandidates.length > 1) {
    throw new SelectionDocumentParseError(
      `ambiguous schedule tables for ${target.semester}`,
    );
  }
  const candidate = validCandidates[0];
  if (!candidate)
    throw new SelectionDocumentParseError("no known selection phases found");
  return { periods: candidate.periods, extractionMethod: "parser" };
}

const htmlToText = (html: string) => {
  const { document: parsedDocument } = parseHTML(`<body>${html}</body>`);
  const document = parsedDocument as unknown as HtmlDocument;
  const bodyText = document.querySelector("body")?.textContent ?? "";
  return normalizeText(bodyText.trim() ? bodyText : html);
};

export type SelectionLlmDataExtractor = (
  options: GenerateJsonOptions,
) => Promise<unknown>;

const selectionLlmProvider = (env: LlmEnv): ProviderName => {
  const configured = env.SELECTION_LLM_PROVIDER?.trim() as
    | ProviderName
    | undefined;
  const providers: ProviderName[] = [
    "gemini",
    "groq",
    "cerebras",
    "openrouter",
    "mistral",
    "workers-ai",
  ];
  if (configured && providers.includes(configured)) return configured;
  if (configured)
    throw new Error(`unsupported selection LLM provider: ${configured}`);
  return "workers-ai";
};

const defaultLlmDataExtractor: SelectionLlmDataExtractor = async (options) =>
  (
    await generateJSON({
      ...options,
      provider: selectionLlmProvider(options.env),
      model: options.env.SELECTION_LLM_MODEL,
      timeoutMs: SELECTION_LLM_TIMEOUT_MS,
    })
  ).data;

type DateEvidence = { keys: Set<string>; invalid: boolean };

const extractDateEvidence = (
  value: string,
  target: SelectionSourceTarget,
): DateEvidence => {
  const { rocYear } = semesterParts(target.semester);
  const matches = [...normalizeFullWidthDigits(value).matchAll(DATE_PATTERN)];
  const keys = new Set<string>();
  let previousYear = rocYear + 1911;
  let previousMonth: number | undefined;
  let invalid = false;
  for (const match of matches) {
    const month = Number(match[2]);
    const day = Number(match[3]);
    let year = match[1] ? rocOrGregorianYear(match[1]) : previousYear;
    if (!match[1] && previousMonth !== undefined && month < previousMonth) {
      year += 1;
    }
    const key = toDateKey(year, month, day);
    if (!key) invalid = true;
    else keys.add(key);
    previousYear = year;
    previousMonth = month;
  }
  return { keys, invalid };
};

const extractTimeEvidence = (value: string) => {
  const times = new Set<string>();
  for (const match of normalizeFullWidthDigits(value).matchAll(
    TIME_EVIDENCE_PATTERN,
  )) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour <= 23 && minute <= 59) {
      times.add(padTime(`${hour}:${match[2]}`));
    }
  }
  return times;
};

const normalizeLlmDate = (value: string, target: SelectionSourceTarget) => {
  const normalized = normalizeFullWidthDigits(value.trim());
  const matches = [...normalized.matchAll(DATE_PATTERN)];
  if (
    matches.length !== 1 ||
    matches[0]![0]!.replace(/\s/g, "") !== normalized.replace(/\s/g, "")
  ) {
    throw new SelectionDocumentParseError(`invalid LLM date: ${value}`);
  }
  const match = matches[0]!;
  const { rocYear } = semesterParts(target.semester);
  const year = match[1] ? rocOrGregorianYear(match[1]) : rocYear + 1911;
  const dateKey = toDateKey(year, Number(match[2]), Number(match[3]));
  if (!dateKey)
    throw new SelectionDocumentParseError(`invalid LLM date: ${value}`);
  return dateKey;
};

const fromLlmData = (
  value: unknown,
  target: SelectionSourceTarget,
  sourceText: string,
): ScrapedSelectionPeriod[] => {
  const parsed = llmResultSchema.parse(value);
  const dateEvidence = extractDateEvidence(sourceText, target);
  const timeEvidence = extractTimeEvidence(sourceText);
  return parsed.periods.map((period) => {
    const startDate = normalizeLlmDate(period.startDate, target);
    const endDate = normalizeLlmDate(period.endDate, target);
    const summaryEvidence = extractDateEvidence(period.sourceSummary, target);
    if (
      !dateEvidence.keys.has(startDate) ||
      !dateEvidence.keys.has(endDate) ||
      dateEvidence.invalid ||
      summaryEvidence.invalid ||
      [...summaryEvidence.keys].some((date) => !dateEvidence.keys.has(date))
    ) {
      throw new SelectionDocumentParseError(
        `LLM date is not evidenced by the official document for ${period.phase}`,
      );
    }
    for (const time of [period.startTime, period.endTime]) {
      if (time && !timeEvidence.has(time)) {
        throw new SelectionDocumentParseError(
          `LLM time is not evidenced by the official document for ${period.phase}`,
        );
      }
    }
    const summaryTimes = extractTimeEvidence(period.sourceSummary);
    if ([...summaryTimes].some((time) => !timeEvidence.has(time))) {
      throw new SelectionDocumentParseError(
        `LLM summary time is not evidenced by the official document for ${period.phase}`,
      );
    }
    return {
      id: `course-selection:${target.semester}:${period.phase}`,
      semester: target.semester,
      phase: period.phase,
      audience: PHASE_AUDIENCE[period.phase],
      startDate,
      endDate,
      sourceEventId: `scraped:${target.semester}:${period.phase}`,
      sourceSummary: period.sourceSummary,
      startTime: period.startTime,
      endTime: period.endTime,
    };
  });
};

export async function extractSelectionDocument(
  html: string,
  target: SelectionSourceTarget,
  env: LlmEnv,
  llmDataExtractor: SelectionLlmDataExtractor = defaultLlmDataExtractor,
): Promise<{
  periods: ScrapedSelectionPeriod[];
  extractionMethod: "parser" | "llm";
}> {
  try {
    const parsed = parseSelectionHtml(html, target);
    const errors = validateSelectionPeriods(parsed.periods, target.semester);
    if (errors.length > 0)
      throw new SelectionDocumentParseError(errors.join("; "));
    return parsed;
  } catch (parserError) {
    console.warn(
      `[selection-dates] deterministic parser failed for ${target.semester}: ${parserError instanceof Error ? parserError.message : String(parserError)}`,
    );
    if (!htmlHasPageIdentity(html, target.semester)) throw parserError;
    const sourceText = htmlToText(html);
    const data = await llmDataExtractor({
      env,
      purpose: "bulk",
      system:
        "Extract NTHU course-selection schedule dates from the supplied official document. Use only explicit rows. Map only these phase ids: round-1, round-2, round-3, new-students, add-drop, inter-school, withdrawal. Return only JSON matching the schema; never infer missing dates.",
      text: `Semester: ${target.semester}\nOfficial document text:\n${sourceText.slice(0, 50_000)}`,
      schema: SELECTION_LLM_SCHEMA,
    });
    const periods = fromLlmData(data, target, sourceText);
    const errors = validateSelectionPeriods(periods, target.semester);
    if (errors.length > 0)
      throw new SelectionDocumentParseError(errors.join("; "));
    return { periods, extractionMethod: "llm" };
  }
}

const dateValue = (dateKey: string) => {
  if (typeof dateKey !== "string") return NaN;
  const match = dateKey.match(DATE_KEY_PATTERN);
  if (!match) return NaN;
  const key = toDateKey(Number(match[1]), Number(match[2]), Number(match[3]));
  return key === dateKey
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : NaN;
};

const shiftDate = (dateKey: string, days: number) => {
  const date = new Date(dateValue(dateKey));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Keep this Worker-local validation mirror aligned with the course-data
// semester table. 11520 is intentionally absent there until its course data
// is published, so it uses the conservative academic-year fallback below.
const KNOWN_SEMESTER_BOUNDS: Record<
  string,
  { startDate: string; endDate: string }
> = {
  "11510": { startDate: "2026-09-07", endDate: "2026-12-27" },
};

export const getSemesterBounds = (semester: string) => {
  const { rocYear, term } = semesterParts(semester);
  const year = rocYear + 1911;
  const known = KNOWN_SEMESTER_BOUNDS[semester];
  const coreStart =
    known?.startDate ?? (term === 1 ? `${year}-08-01` : `${year + 1}-02-01`);
  const coreEnd =
    known?.endDate ?? (term === 1 ? `${year + 1}-01-31` : `${year + 1}-07-31`);
  return {
    startDate: shiftDate(coreStart, -SEMESTER_BOUND_MARGIN_DAYS),
    endDate: shiftDate(coreEnd, SEMESTER_BOUND_MARGIN_DAYS),
  };
};

const phaseOrder: Record<SelectionPhase, number> = {
  "round-1": 1,
  "round-2": 2,
  "new-students": 3,
  "round-3": 4,
  "add-drop": 5,
  "inter-school": 5,
  withdrawal: 6,
};

const mayOverlap = (a: SelectionPhase, b: SelectionPhase) =>
  new Set([a, b]).size === 2 &&
  new Set([a, b]).has("add-drop") &&
  new Set([a, b]).has("inter-school");

export function validateSelectionPeriods(
  periods: ScrapedSelectionPeriod[],
  semester: string,
): string[] {
  const errors: string[] = [];
  const bounds = getSemesterBounds(semester);
  const seen = new Set<string>();
  for (const period of periods) {
    if (!PHASES.includes(period.phase))
      errors.push(`unknown phase id: ${period.phase}`);
    if (seen.has(period.phase))
      errors.push(`duplicate phase id: ${period.phase}`);
    seen.add(period.phase);
    const start = dateValue(period.startDate);
    const end = dateValue(period.endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      errors.push(`invalid date for ${period.phase}`);
      continue;
    }
    if (start >= end)
      errors.push(`start must be before end for ${period.phase}`);
    if (
      period.startDate < bounds.startDate ||
      period.endDate > bounds.endDate
    ) {
      errors.push(`date outside ${semester} bounds for ${period.phase}`);
    }
    if (period.startTime && !TIME_PATTERN.test(period.startTime))
      errors.push(`invalid start time for ${period.phase}`);
    if (period.endTime && !TIME_PATTERN.test(period.endTime))
      errors.push(`invalid end time for ${period.phase}`);
  }

  const requiredPhases =
    REQUIRED_PHASES_BY_TERM[semesterParts(semester).term === 1 ? "10" : "20"];
  for (const phase of requiredPhases) {
    if (!seen.has(phase)) errors.push(`missing required phase: ${phase}`);
  }

  for (let i = 0; i < periods.length; i += 1) {
    const left = periods[i]!;
    for (let j = i + 1; j < periods.length; j += 1) {
      const right = periods[j]!;
      if (
        left.startDate <= right.endDate &&
        right.startDate <= left.endDate &&
        !mayOverlap(left.phase, right.phase)
      ) {
        errors.push(`forbidden overlap: ${left.phase}/${right.phase}`);
      }
      if (
        phaseOrder[left.phase] < phaseOrder[right.phase] &&
        left.startDate >= right.startDate
      ) {
        errors.push(`implausible phase order: ${left.phase}/${right.phase}`);
      }
      if (
        phaseOrder[right.phase] < phaseOrder[left.phase] &&
        right.startDate >= left.startDate
      ) {
        errors.push(`implausible phase order: ${right.phase}/${left.phase}`);
      }
    }
  }
  return [...new Set(errors)];
}

const cacheKey = (semester: string) => `${CACHE_PREFIX}${semester}`;

const isSelectionCacheFresh = (fetchedAt: string, now = Date.now()) => {
  const timestamp = Date.parse(fetchedAt);
  return (
    Number.isFinite(timestamp) && now - timestamp <= MAX_SELECTION_CACHE_AGE_MS
  );
};

export async function readStoredSelectionSchedule(
  db: D1Database | undefined,
  semester: string,
): Promise<StoredSelectionSchedule | null> {
  if (!db) return null;
  try {
    const row = await db
      .prepare('SELECT "data" FROM "Cache" WHERE "key" = ?')
      .bind(cacheKey(semester))
      .first<{ data: string }>();
    if (!row?.data) return null;
    const value = JSON.parse(row.data) as StoredSelectionSchedule;
    return value.semester === semester && Array.isArray(value.periods)
      ? value
      : null;
  } catch (error) {
    console.error(`[selection-dates] failed to read ${semester} cache:`, error);
    return null;
  }
}

export async function readStoredSelectionSchedules(
  db: D1Database | undefined,
  now = new Date(),
): Promise<StoredSelectionSchedule[]> {
  if (!db) return [];
  try {
    const result = await db
      .prepare('SELECT "data" FROM "Cache" WHERE "key" LIKE ?')
      .bind(`${CACHE_PREFIX}%`)
      .all<{ data: string }>();
    return result.results.flatMap((row) => {
      try {
        const value = JSON.parse(row.data) as StoredSelectionSchedule;
        return value.semester &&
          Array.isArray(value.periods) &&
          isSelectionCacheFresh(value.metadata?.fetchedAt ?? "", now.getTime())
          ? [value]
          : [];
      } catch {
        return [];
      }
    });
  } catch (error) {
    console.error("[selection-dates] failed to read schedule cache:", error);
    return [];
  }
}

const storeSelectionSchedule = async (
  db: D1Database,
  schedule: StoredSelectionSchedule,
) => {
  await db
    .prepare(
      `INSERT INTO "Cache" ("key", "data", "updatedAt") VALUES (?, ?, ?)
       ON CONFLICT ("key") DO UPDATE SET "data" = excluded."data", "updatedAt" = excluded."updatedAt"`,
    )
    .bind(
      cacheKey(schedule.semester),
      JSON.stringify(schedule),
      schedule.metadata.fetchedAt,
    )
    .run();
};

export const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const currentSemesterId = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const rocYear = month >= 8 ? year - 1911 : year - 1912;
  return `${rocYear}${month >= 8 ? "10" : "20"}`;
};

export const getSelectionSourceTargets = (now = new Date()) => {
  const current = currentSemesterId(now);
  const next = current.endsWith("10")
    ? `${current.slice(0, 3)}20`
    : `${Number(current.slice(0, 3)) + 1}10`;
  return [current, next].map((semester) => ({
    semester,
    url:
      SELECTION_SOURCE_URLS[semester as keyof typeof SELECTION_SOURCE_URLS] ??
      "",
  }));
};

export async function syncSelectionDates(
  env: SelectionScraperEnv,
  now = new Date(),
  targets: SelectionSourceTarget[] = getSelectionSourceTargets(now),
): Promise<{ saved: string[]; skipped: string[]; failed: string[] }> {
  const result = { saved: [], skipped: [], failed: [] } as {
    saved: string[];
    skipped: string[];
    failed: string[];
  };
  const discovered = await discoverSelectionSources(
    targets.map((target) => target.semester),
  );
  for (const target of targets) {
    try {
      const discoveredSource = discovered.get(target.semester);
      if (discovered.has(target.semester) && !discoveredSource) {
        throw new Error("ambiguous official sources");
      }
      const source =
        discoveredSource ??
        (target.url
          ? { ...target, resolution: "seed-fallback" as const }
          : null);
      if (!source) throw new Error("no official source discovered or seeded");
      console.log(
        `[selection-dates] ${target.semester} source=${source.resolution} url=${source.url}`,
      );
      const html =
        ("html" in source ? source.html : undefined) ??
        (await fetchHtml(source.url, fetch));
      const contentHash = await sha256(html);
      const existing = await readStoredSelectionSchedule(
        env.DB,
        target.semester,
      );
      const existingIsComplete =
        existing !== null &&
        validateSelectionPeriods(existing.periods, target.semester).length ===
          0;
      if (existingIsComplete && existing.metadata.contentHash === contentHash) {
        if (!isSelectionCacheFresh(existing.metadata.fetchedAt)) {
          await storeSelectionSchedule(env.DB, {
            ...existing,
            metadata: {
              ...existing.metadata,
              sourceUrl: source.url,
              fetchedAt: new Date().toISOString(),
              sourceResolution: source.resolution,
            },
          });
          console.log(`[selection-dates] ${target.semester} cache refreshed`);
          result.saved.push(target.semester);
          continue;
        }
        console.log(`[selection-dates] ${target.semester} unchanged; skipped`);
        result.skipped.push(target.semester);
        continue;
      }
      const extracted = await extractSelectionDocument(html, target, env);
      const validationErrors = validateSelectionPeriods(
        extracted.periods,
        target.semester,
      );
      if (validationErrors.length > 0) {
        throw new Error(`validation failed: ${validationErrors.join("; ")}`);
      }
      await storeSelectionSchedule(env.DB, {
        semester: target.semester,
        periods: extracted.periods,
        metadata: {
          sourceUrl: source.url,
          fetchedAt: new Date().toISOString(),
          contentHash,
          extractionMethod: extracted.extractionMethod,
          sourceResolution: source.resolution,
        },
      });
      console.log(
        `[selection-dates] saved ${target.semester} via ${extracted.extractionMethod}`,
      );
      result.saved.push(target.semester);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[selection-dates] ${target.semester} not saved; previous data kept: ${message}`,
      );
      result.failed.push(target.semester);
    }
  }
  return result;
}

export function selectionSchedulesToEvents(
  schedules: StoredSelectionSchedule[],
  windowStart: string,
  windowEnd: string,
): Array<{
  id: string;
  summary: string;
  date: string;
  courseSelectionPeriod: ScrapedSelectionPeriod;
}> {
  return schedules.flatMap((schedule) =>
    schedule.periods
      .filter(
        (period) =>
          period.startDate <= windowEnd && period.endDate >= windowStart,
      )
      .map((period) => ({
        id: period.sourceEventId,
        summary: period.sourceSummary,
        date: period.startDate,
        courseSelectionPeriod: period,
      })),
  );
}
