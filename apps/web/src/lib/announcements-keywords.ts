import type {
  AnnouncementArticle,
  AnnouncementSource,
} from "./announcements-core";

export const ANNOUNCEMENT_KEYWORDS_KEY = "announcements_keywords";
export const ANNOUNCEMENT_KEYWORDS_LAST_SEEN_KEY =
  "announcements_keywords_last_seen";

export interface AnnouncementTitleSegment {
  text: string;
  matched: boolean;
}

const normalizeKeyword = (keyword: string) => keyword.trim();

const keywordKey = (keyword: string) =>
  normalizeKeyword(keyword).toLocaleLowerCase();

export const normalizeAnnouncementKeywords = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.reduce<string[]>((keywords, item) => {
    if (typeof item !== "string") return keywords;
    const keyword = normalizeKeyword(item);
    const key = keywordKey(keyword);
    if (!key || seen.has(key)) return keywords;
    seen.add(key);
    keywords.push(keyword);
    return keywords;
  }, []);
};

export const isValidAnnouncementKeywords = (
  value: unknown,
): value is string[] =>
  Array.isArray(value) && value.every((keyword) => typeof keyword === "string");

const searchableAnnouncementText = (
  article: AnnouncementArticle,
  sourceById: ReadonlyMap<string, AnnouncementSource>,
) =>
  [
    article.title,
    ...article.sourceIds.flatMap((sourceId) => {
      const source = sourceById.get(sourceId);
      return source ? [source.title, source.department] : [];
    }),
  ]
    .join(" ")
    .toLocaleLowerCase();

export const getMatchedAnnouncementKeywords = (
  article: AnnouncementArticle,
  keywords: readonly string[],
  sourceById: ReadonlyMap<string, AnnouncementSource>,
): string[] => {
  const searchableText = searchableAnnouncementText(article, sourceById);
  return normalizeAnnouncementKeywords(keywords).filter((keyword) =>
    searchableText.includes(keywordKey(keyword)),
  );
};

export const splitAnnouncementTitle = (
  title: string,
  keywords: readonly string[],
): AnnouncementTitleSegment[] => {
  const lowerTitle = title.toLocaleLowerCase();
  const ranges: Array<[start: number, end: number]> = [];

  for (const keyword of normalizeAnnouncementKeywords(keywords)) {
    const lowerKeyword = keywordKey(keyword);
    let start = lowerTitle.indexOf(lowerKeyword);
    while (start >= 0) {
      ranges.push([start, start + keyword.length]);
      start = lowerTitle.indexOf(lowerKeyword, start + lowerKeyword.length);
    }
  }

  if (ranges.length === 0) return [{ text: title, matched: false }];

  ranges.sort(([a], [b]) => a - b);
  const mergedRanges: Array<[start: number, end: number]> = [];
  for (const [start, end] of ranges) {
    const previous = mergedRanges.at(-1);
    if (previous && start <= previous[1]) {
      previous[1] = Math.max(previous[1], end);
    } else {
      mergedRanges.push([start, end]);
    }
  }

  const segments: AnnouncementTitleSegment[] = [];
  let cursor = 0;
  for (const [start, end] of mergedRanges) {
    if (start > cursor)
      segments.push({ text: title.slice(cursor, start), matched: false });
    segments.push({ text: title.slice(start, end), matched: true });
    cursor = end;
  }
  if (cursor < title.length) {
    segments.push({ text: title.slice(cursor), matched: false });
  }
  return segments;
};

export const getNewestKeywordMatchDate = (
  articles: readonly AnnouncementArticle[],
  keywords: readonly string[],
  sourceById: ReadonlyMap<string, AnnouncementSource>,
): string | null => {
  let newest: string | null = null;
  for (const article of articles) {
    if (
      getMatchedAnnouncementKeywords(article, keywords, sourceById).length === 0
    ) {
      continue;
    }
    if (newest === null || article.date > newest) newest = article.date;
  }
  return newest;
};

export const countNewKeywordMatches = (
  articles: readonly AnnouncementArticle[],
  keywords: readonly string[],
  sourceById: ReadonlyMap<string, AnnouncementSource>,
  lastSeenDate: string | null | undefined,
): number => {
  if (!lastSeenDate) return 0;
  return articles.filter(
    (article) =>
      article.date > lastSeenDate &&
      getMatchedAnnouncementKeywords(article, keywords, sourceById).length > 0,
  ).length;
};
