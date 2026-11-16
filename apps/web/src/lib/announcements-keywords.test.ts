import { describe, expect, test } from "bun:test";
import {
  countNewKeywordMatches,
  getAnnouncementKeywordMatchState,
  getMatchedAnnouncementKeywords,
  getNewestKeywordMatchDate,
  isValidAnnouncementKeywords,
  normalizeAnnouncementKeywords,
  splitAnnouncementTitle,
} from "./announcements-keywords";
import type {
  AnnouncementArticle,
  AnnouncementSource,
} from "./announcements-core";

const sources: AnnouncementSource[] = [
  {
    id: "academic",
    title: "教務處公告",
    link: "https://example/academic",
    language: "zh-tw",
    department: "教務處",
  },
  {
    id: "student",
    title: "Student Affairs News",
    link: "https://example/student",
    language: "en",
    department: "學務處",
  },
];

const sourceById = new Map(sources.map((source) => [source.id, source]));

const article = (
  title: string,
  date = "2026-10-21",
  sourceIds = ["academic"],
): AnnouncementArticle => ({
  title,
  link: `https://example/${encodeURIComponent(title)}`,
  date,
  sourceIds,
});

describe("announcement keyword storage", () => {
  test("uses an empty list for an absent or malformed stored value", () => {
    expect(normalizeAnnouncementKeywords(undefined)).toEqual([]);
    expect(normalizeAnnouncementKeywords([" 獎學金 ", "獎學金", 4])).toEqual([
      "獎學金",
    ]);
    expect(isValidAnnouncementKeywords(undefined)).toBe(false);
    expect(isValidAnnouncementKeywords([])).toBe(true);
  });
});

describe("announcement keyword matching", () => {
  test("matches title and source metadata case-insensitively", () => {
    expect(
      getMatchedAnnouncementKeywords(
        article("Scholarship application deadline"),
        ["SCHOLARSHIP", "交換"],
        sourceById,
      ),
    ).toEqual(["SCHOLARSHIP"]);
    expect(
      getMatchedAnnouncementKeywords(
        article("其他公告", "2026-10-21", ["student"]),
        ["學務", "exchange"],
        sourceById,
      ),
    ).toEqual(["學務"]);
  });

  test("splits all matching title ranges, including overlapping keywords", () => {
    expect(
      splitAnnouncementTitle("Scholarship exchange", ["ship", "EXCHANGE"]),
    ).toEqual([
      { text: "Scholar", matched: false },
      { text: "ship", matched: true },
      { text: " ", matched: false },
      { text: "exchange", matched: true },
    ]);
  });
});

describe("new announcement keyword matches", () => {
  const articles = [
    article("Old scholarship", "2026-10-19"),
    article("New scholarship", "2026-10-21"),
    article("Unrelated", "2026-10-22"),
    article("New exchange", "2026-10-20", ["student"]),
  ];

  test("counts matches newer than the last visit across all sources", () => {
    expect(
      countNewKeywordMatches(
        articles,
        ["scholarship", "exchange"],
        sourceById,
        "2026-10-19",
      ),
    ).toBe(2);
    expect(
      countNewKeywordMatches(articles, ["scholarship"], sourceById, null),
    ).toBe(0);
  });

  test("finds the newest matched date to record after visiting", () => {
    expect(
      getNewestKeywordMatchDate(
        articles,
        ["scholarship", "exchange"],
        sourceById,
      ),
    ).toBe("2026-10-21");
  });

  test("recomputes the count and watermark for newly fetched articles", () => {
    const previousArticles = articles.slice(0, 2);
    const nextArticles = [
      ...previousArticles,
      article("Newest scholarship", "2026-10-23"),
    ];

    expect(
      getAnnouncementKeywordMatchState(
        previousArticles,
        ["scholarship"],
        sourceById,
        "2026-10-21",
      ),
    ).toEqual({ newMatchesCount: 0, newestMatchDate: "2026-10-21" });
    expect(
      getAnnouncementKeywordMatchState(
        nextArticles,
        ["scholarship"],
        sourceById,
        "2026-10-21",
      ),
    ).toEqual({ newMatchesCount: 1, newestMatchDate: "2026-10-23" });
  });
});
