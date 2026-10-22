import { Hono } from "hono";
import { fetchUpstream } from "./utils/upstream";

const UPSTREAM_BASE_URL = "https://api.nthusa.tw/announcements";
const CACHE_KEY = "https://api.nthumods.com/internal/announcements";
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";
const REQUEST_TIMEOUT_MS = 8_000;
const RETENTION_DAYS = 120;
const LANGUAGES = ["zh-tw", "en"] as const;

export type AnnouncementLanguage = (typeof LANGUAGES)[number];

export interface AnnouncementSource {
  id: string;
  title: string;
  link: string;
  language: AnnouncementLanguage;
  department: string;
}

export interface AnnouncementArticle {
  title: string;
  link: string;
  date: string;
  sourceIds: string[];
}

export interface AnnouncementsResponse {
  sources: AnnouncementSource[];
  articles: AnnouncementArticle[];
}

interface RawSource {
  title?: unknown;
  link?: unknown;
  language?: unknown;
  department?: unknown;
}

interface RawAnnouncementGroup extends RawSource {
  articles?: unknown;
}

interface RawArticle {
  title?: unknown;
  link?: unknown;
  date?: unknown;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const requireString = (
  value: unknown,
  field: string,
  context: string,
): string => {
  if (typeof value !== "string") {
    throw new Error(
      `Invalid announcements ${context}: ${field} must be a string`,
    );
  }
  return value.trim();
};

const requireNonEmptyString = (
  value: unknown,
  field: string,
  context: string,
): string => {
  const result = requireString(value, field, context);
  if (!result) {
    throw new Error(
      `Invalid announcements ${context}: ${field} must not be empty`,
    );
  }
  return result;
};

const validateSourceShape = (value: unknown, context: string): void => {
  if (!isRecord(value)) {
    throw new Error(`Invalid announcements ${context}: expected an object`);
  }
  requireNonEmptyString(value.title, "title", context);
  requireNonEmptyString(value.link, "link", context);
  requireNonEmptyString(value.language, "language", context);
  requireNonEmptyString(value.department, "department", context);
};

const validateUpstreamShapes = (
  sourcePayload: unknown,
  announcementPayloads: unknown[],
): void => {
  if (!Array.isArray(sourcePayload)) {
    throw new Error("Invalid announcements sources payload: expected an array");
  }
  sourcePayload.forEach((source, index) =>
    validateSourceShape(source, `source at index ${index}`),
  );

  announcementPayloads.forEach((payload, payloadIndex) => {
    if (!Array.isArray(payload)) {
      throw new Error(
        `Invalid announcements payload ${payloadIndex}: expected an array`,
      );
    }
    payload.forEach((group, groupIndex) => {
      validateSourceShape(
        group,
        `group at payload ${payloadIndex}, index ${groupIndex}`,
      );
      if (!isRecord(group) || !Array.isArray(group.articles)) {
        throw new Error(
          `Invalid announcements group at payload ${payloadIndex}, index ${groupIndex}: articles must be an array`,
        );
      }
      group.articles.forEach((article, articleIndex) => {
        if (!isRecord(article)) {
          throw new Error(
            `Invalid announcements article at payload ${payloadIndex}, index ${groupIndex}, article ${articleIndex}: expected an object`,
          );
        }
        requireNonEmptyString(
          article.title,
          "title",
          `article at payload ${payloadIndex}, index ${groupIndex}, article ${articleIndex}`,
        );
        requireNonEmptyString(
          article.link,
          "link",
          `article at payload ${payloadIndex}, index ${groupIndex}, article ${articleIndex}`,
        );
        requireString(
          article.date,
          "date",
          `article at payload ${payloadIndex}, index ${groupIndex}, article ${articleIndex}`,
        );
      });
    });
  });
};

const sourceKey = (source: RawSource): string =>
  [
    text(source.link),
    text(source.department),
    text(source.title),
    text(source.language),
  ].join("\u001f");

/** Stable, dependency-free identifier for a source's upstream identity. */
export const sourceIdFor = (source: RawSource): string => {
  let hash = 2166136261;
  for (const character of sourceKey(source)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `source-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const isAnnouncementLanguage = (value: string): value is AnnouncementLanguage =>
  (LANGUAGES as readonly string[]).includes(value);

const httpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};

const canonicalArticleLink = (value: string): string | null => {
  const url = httpUrl(value.trim());
  if (!url) return null;
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
};

const normalizeSource = (value: unknown): AnnouncementSource | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as RawSource;
  const title = text(source.title);
  const link = text(source.link);
  const language = text(source.language);
  const department = text(source.department);
  if (
    !title ||
    !link ||
    !httpUrl(link) ||
    !department ||
    !isAnnouncementLanguage(language)
  ) {
    return null;
  }
  return {
    id: sourceIdFor(source),
    title,
    link,
    language,
    department,
  };
};

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const groupValues = (value: unknown): RawAnnouncementGroup[] =>
  Array.isArray(value) ? (value as RawAnnouncementGroup[]) : [];

const sourceComparator = (a: AnnouncementSource, b: AnnouncementSource) =>
  a.department.localeCompare(b.department) ||
  a.title.localeCompare(b.title) ||
  a.language.localeCompare(b.language) ||
  a.link.localeCompare(b.link);

const articleTitleKey = (title: string): string =>
  title.trim().replace(/\s+/g, " ");

export function normalizeAnnouncements(
  sourcePayload: unknown,
  announcementPayloads: unknown[],
  now = new Date(),
): AnnouncementsResponse {
  validateUpstreamShapes(sourcePayload, announcementPayloads);
  const sourceMap = new Map<string, AnnouncementSource>();
  const groups = [
    ...(sourcePayload as RawSource[]),
    ...announcementPayloads.flatMap(groupValues),
  ];

  for (const group of groups) {
    const source = normalizeSource(group);
    if (source) sourceMap.set(source.id, source);
  }

  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const articleMap = new Map<string, AnnouncementArticle>();

  for (const group of announcementPayloads.flatMap(groupValues)) {
    const source = normalizeSource(group);
    if (!source) continue;
    sourceMap.set(source.id, source);
    const articles = group.articles as RawArticle[];
    for (const value of articles) {
      const article = value as RawArticle;
      const title = articleTitleKey(text(article.title));
      const link = canonicalArticleLink(text(article.link));
      const date = text(article.date);
      if (!title || !link || !isValidDate(date) || date < cutoff) continue;
      const existing = articleMap.get(link);
      if (existing) {
        if (!existing.sourceIds.includes(source.id)) {
          existing.sourceIds.push(source.id);
        }
        if (date > existing.date) {
          existing.title = title;
          existing.date = date;
        }
      } else {
        articleMap.set(link, { title, link, date, sourceIds: [source.id] });
      }
    }
  }

  const departmentArticleMap = new Map<string, AnnouncementArticle>();
  for (const article of articleMap.values()) {
    const departments = new Set(
      article.sourceIds
        .map((sourceId) => sourceMap.get(sourceId)?.department)
        .filter((value): value is string => Boolean(value)),
    );
    if (departments.size !== 1) {
      departmentArticleMap.set(article.link, article);
      continue;
    }
    const department = [...departments][0];
    const key = [articleTitleKey(article.title), article.date, department].join(
      "\u001f",
    );
    const existing = departmentArticleMap.get(key);
    if (existing) {
      for (const sourceId of article.sourceIds) {
        if (!existing.sourceIds.includes(sourceId)) {
          existing.sourceIds.push(sourceId);
        }
      }
    } else {
      departmentArticleMap.set(key, article);
    }
  }

  return {
    sources: [...sourceMap.values()].sort(sourceComparator),
    articles: [...departmentArticleMap.values()].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.title.localeCompare(b.title) ||
        a.link.localeCompare(b.link),
    ),
  };
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetchUpstream(
    url,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
    { fetcher },
  );
  return response.json();
}

const getCache = (): Cache | undefined => {
  try {
    return typeof caches === "undefined" ? undefined : caches.default;
  } catch {
    return undefined;
  }
};

const readCache = async (
  cache: Cache,
  key: Request,
): Promise<Response | undefined> => {
  try {
    return await cache.match(key);
  } catch (error) {
    console.error("Failed to read announcements cache", error);
    return undefined;
  }
};

export const createAnnouncementsApp = (
  fetcher: typeof fetch = fetch,
  cache: Cache | undefined = getCache(),
) =>
  new Hono().get("/", async (c) => {
    const cacheKey = new Request(CACHE_KEY);
    if (cache) {
      const cached = await readCache(cache, cacheKey);
      if (cached) return cached;
    }

    try {
      const [sources, ...announcementPayloads] = await Promise.all([
        fetchJson(`${UPSTREAM_BASE_URL}/sources`, fetcher),
        ...LANGUAGES.map((language) =>
          fetchJson(
            `${UPSTREAM_BASE_URL}?language=${encodeURIComponent(language)}`,
            fetcher,
          ),
        ),
      ]);
      const response = c.json(
        normalizeAnnouncements(sources, announcementPayloads),
        200,
        { "Cache-Control": CACHE_CONTROL },
      );
      if (cache) {
        try {
          const cacheWrite = cache.put(cacheKey, response.clone());
          const guardedWrite = cacheWrite.catch((error) => {
            console.error("Failed to write announcements cache", error);
          });
          try {
            c.executionCtx.waitUntil(guardedWrite);
          } catch {
            await guardedWrite;
          }
        } catch {
          console.error("Failed to start announcements cache write");
        }
      }
      return response;
    } catch (error) {
      console.error("Failed to fetch announcements data", error);
      if (cache) {
        const stale = await readCache(cache, cacheKey);
        if (stale) return stale;
      }
      return c.json({ error: "Announcements service unavailable" }, 502);
    }
  });

const announcements = createAnnouncementsApp();

export default announcements;
