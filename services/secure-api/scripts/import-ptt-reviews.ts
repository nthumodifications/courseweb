import prisma from "../src/client";
import {
  hasCjkCharacters,
  parsePttPostHtml,
  resolveInstructorName,
  type ModuleOfferingTeachers,
  type ParsedPttPost,
} from "./ptt-review-parser";

const BOARD = "https://www.ptt.cc/bbs/NTHU_Course";
const USER_AGENT = "NTHUMods native course review importer/1.0";
const REQUEST_INTERVAL_MS = 1_000;
const MODULE_OFFERINGS_API = "https://api.nthumods.com/search/fallback";

type ImportRow = {
  moduleKey: string;
  instructor: string;
  semester: string | null;
  coolness: number | null;
  sweetness: number | null;
  body: string;
  sourceUrl: string;
  sourceAuthor: string | null;
  sourcePostedAt: Date | null;
};

const args = new Set(process.argv.slice(2));
const pagesFlag = process.argv.find((arg) => arg.startsWith("--pages="));
const pagesArgumentIndex = process.argv.findIndex((arg) => arg === "--pages");
const pagesValue =
  pagesFlag?.slice("--pages=".length) ??
  (pagesArgumentIndex >= 0 ? process.argv[pagesArgumentIndex + 1] : undefined);
const pages = Number(pagesValue ?? "");
const dryRun = args.has("--dry-run");

if (!Number.isInteger(pages) || pages < 1) {
  throw new Error(
    "Usage: bun run scripts/import-ptt-reviews.ts --pages N [--dry-run]",
  );
}

let lastRequestAt = 0;
const waitForRateLimit = async () => {
  const wait = REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
};

const fetchPtt = async (url: string) => {
  await waitForRateLimit();
  const response = await fetch(url, {
    headers: {
      Cookie: "over18=1",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
};

const postLinks = (html: string) => {
  const links = new Set<string>();
  for (const match of html.matchAll(
    /href=["'](\/bbs\/NTHU_Course\/M\.[^"']+\.html)["']/giu,
  )) {
    links.add(`https://www.ptt.cc${match[1]}`);
  }
  return [...links];
};

type CourseSearchResponse = {
  data?: {
    hits?: Array<{
      department?: string | null;
      course?: string | null;
      teacher_zh?: string[] | null;
      teacher_en?: string[] | null;
    }>;
    nbPages?: number;
  };
};

const moduleOfferingsCache = new Map<
  string,
  Promise<ModuleOfferingTeachers[]>
>();

const moduleParts = (moduleKey: string) => {
  const separator = moduleKey.indexOf(":");
  if (separator < 1) return null;
  return {
    department: moduleKey.slice(0, separator),
    course: moduleKey.slice(separator + 1),
  };
};

const fetchModuleOfferings = (moduleKey: string) => {
  const cached = moduleOfferingsCache.get(moduleKey);
  if (cached) return cached;

  const request = (async () => {
    const parts = moduleParts(moduleKey);
    if (!parts) return [];

    const offerings: ModuleOfferingTeachers[] = [];
    for (let page = 0; page < 100; page += 1) {
      const url = new URL(MODULE_OFFERINGS_API);
      url.searchParams.set("q", `${parts.department} ${parts.course}`);
      url.searchParams.set(
        "filters",
        `department:${parts.department} AND course:${parts.course}`,
      );
      url.searchParams.set("limit", "100");
      url.searchParams.set("page", String(page));
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `module offerings ${response.status} ${response.statusText}`,
        );
      }
      const payload = (await response.json()) as CourseSearchResponse;
      const hits = payload.data?.hits ?? [];
      offerings.push(
        ...hits
          .filter(
            (hit) =>
              hit.department?.normalize("NFKC").trim() === parts.department &&
              hit.course?.normalize("NFKC").replace(/\s+/gu, "") ===
                parts.course,
          )
          .map(({ teacher_zh, teacher_en }) => ({ teacher_zh, teacher_en })),
      );
      const pageCount = payload.data?.nbPages ?? page + 1;
      if (hits.length < 100 || page + 1 >= pageCount) break;
    }
    return offerings;
  })().catch((error) => {
    console.warn(
      `could not load offerings for ${moduleKey}: ${error instanceof Error ? error.message : error}`,
    );
    return [];
  });

  moduleOfferingsCache.set(moduleKey, request);
  return request;
};

const rowsFromPost = async (
  parsed: ParsedPttPost,
  sourceUrl: string,
): Promise<ImportRow[]> => {
  if (!parsed.moduleKey || parsed.instructors.length === 0) return [];

  const needsResolution = parsed.instructors.some(
    (instructor) => !hasCjkCharacters(instructor),
  );
  const offerings = needsResolution
    ? await fetchModuleOfferings(parsed.moduleKey)
    : [];

  return parsed.instructors.map((instructor) => {
    const resolvedInstructor = resolveInstructorName(instructor, offerings);
    if (
      !hasCjkCharacters(instructor) &&
      resolvedInstructor === instructor.normalize("NFKC").trim()
    ) {
      console.warn(
        `could not uniquely resolve instructor ${JSON.stringify(instructor)} for ${parsed.moduleKey}`,
      );
    }
    return {
      moduleKey: parsed.moduleKey!,
      instructor: resolvedInstructor,
      semester: parsed.semester,
      coolness: parsed.coolness,
      sweetness: parsed.sweetness,
      body: parsed.body,
      sourceUrl,
      sourceAuthor: parsed.sourceAuthor,
      sourcePostedAt: parsed.sourcePostedAt,
    };
  });
};

const saveRow = async (row: ImportRow) => {
  const existing = await prisma.courseReview.findFirst({
    where: { sourceUrl: row.sourceUrl, instructor: row.instructor },
    select: { id: true, source: true },
  });
  if (existing?.source === "NATIVE") {
    console.warn(`skip native collision ${row.sourceUrl} / ${row.instructor}`);
    return;
  }

  const data = {
    moduleKey: row.moduleKey,
    instructor: row.instructor,
    semester: row.semester,
    coolness: row.coolness,
    sweetness: row.sweetness,
    learning: null,
    attendance: null,
    examStyle: [],
    body: row.body,
    source: "PTT" as const,
    sourceUrl: row.sourceUrl,
    sourceAuthor: row.sourceAuthor,
    sourcePostedAt: row.sourcePostedAt,
    userId: null,
  };
  if (existing) {
    await prisma.courseReview.update({ where: { id: existing.id }, data });
  } else {
    await prisma.courseReview.create({ data });
  }
};

let postsSeen = 0;
let postsParsed = 0;
let postsSkipped = 0;
let rowsParsed = 0;
const sampleRows: ImportRow[] = [];
const seenUrls = new Set<string>();

for (let page = 1; page <= pages; page += 1) {
  const indexUrl = `${BOARD}/index${page === 1 ? "" : page}.html`;
  let links: string[];
  try {
    links = postLinks(await fetchPtt(indexUrl));
  } catch (error) {
    console.warn(
      `skip page ${indexUrl}: ${error instanceof Error ? error.message : error}`,
    );
    continue;
  }

  for (const sourceUrl of links) {
    if (seenUrls.has(sourceUrl)) continue;
    seenUrls.add(sourceUrl);
    postsSeen += 1;
    try {
      const parsed = parsePttPostHtml({
        html: await fetchPtt(sourceUrl),
        sourceUrl,
      });
      const rows = await rowsFromPost(parsed, sourceUrl);
      if (rows.length === 0) {
        postsSkipped += 1;
        console.warn(`skip post ${sourceUrl}: missing or invalid 科號/老師`);
        continue;
      }
      postsParsed += 1;
      rowsParsed += rows.length;
      sampleRows.push(...rows.slice(0, Math.max(0, 5 - sampleRows.length)));
      if (!dryRun) {
        for (const row of rows) await saveRow(row);
      }
    } catch (error) {
      postsSkipped += 1;
      console.warn(
        `skip post ${sourceUrl}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

console.log(`PTT import ${dryRun ? "dry-run " : ""}summary`);
console.log(`pages: ${pages}`);
console.log(`posts seen: ${postsSeen}`);
console.log(`posts parsed: ${postsParsed}`);
console.log(`posts skipped: ${postsSkipped}`);
console.log(`rows: ${rowsParsed}`);
console.log("sample rows:");
for (const row of sampleRows) {
  console.log(
    `- ${row.moduleKey} | ${row.instructor} | coolness=${row.coolness ?? "null"} | sweetness=${row.sweetness ?? "null"} | semester=${row.semester ?? "null"}`,
  );
}

await prisma.$disconnect();
