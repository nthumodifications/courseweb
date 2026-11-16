import { describe, expect, test } from "bun:test";
import {
  announcementListReducer,
  formatAnnouncementDate,
  formatAnnouncementSourceGroups,
  getVisibleAnnouncements,
  getDefaultFollowIds,
  getEffectiveFollowIds,
  initialAnnouncementListState,
  type AnnouncementSource,
} from "./announcements-core";

const sources: AnnouncementSource[] = [
  {
    id: "academic-zh",
    title: "最新消息",
    link: "https://example/academic-zh",
    language: "zh-tw",
    department: "教務處",
  },
  {
    id: "student-zh",
    title: "最新消息",
    link: "https://example/student-zh",
    language: "zh-tw",
    department: "學務處",
  },
  {
    id: "student-en",
    title: "News",
    link: "https://example/student-en",
    language: "en",
    department: "學務處",
  },
  {
    id: "academic-sub-zh",
    title: "課務組公告",
    link: "https://example/academic-sub-zh",
    language: "zh-tw",
    department: "教務處課務組",
  },
];

describe("announcement follows", () => {
  test.each([
    ["zh", ["academic-zh", "student-zh", "academic-sub-zh"]],
    ["zh-cn", ["academic-zh", "student-zh", "academic-sub-zh"]],
    ["en", ["academic-zh", "student-en", "academic-sub-zh"]],
  ] as const)("uses the default sources for %s", (language, expected) => {
    expect(getDefaultFollowIds(sources, language)).toEqual(expected);
  });

  test("keeps an explicit empty follow list empty", () => {
    expect(getEffectiveFollowIds([], sources, "zh")).toEqual([]);
    expect(getEffectiveFollowIds(null, sources, "zh")).toEqual([
      "academic-zh",
      "student-zh",
      "academic-sub-zh",
    ]);
  });

  test("resets malformed stored follow values to language defaults", () => {
    expect(getEffectiveFollowIds(JSON.parse("{}"), sources, "zh")).toEqual([
      "academic-zh",
      "student-zh",
      "academic-sub-zh",
    ]);
    expect(
      getEffectiveFollowIds(JSON.parse('["student-zh", 4]'), sources, "zh"),
    ).toEqual(["academic-zh", "student-zh", "academic-sub-zh"]);
  });

  test("formats article dates in the selected locale", () => {
    expect(formatAnnouncementDate("2026-10-21", "en")).toBe("10/21/2026");
    expect(formatAnnouncementDate("2026-10-21", "zh")).toBe("2026/10/21");
  });
});

describe("announcement list paging", () => {
  test.each([
    [0, 30],
    [1, 30],
    [2, 60],
  ])("shows %i page(s) as %i articles", (page, expectedLength) => {
    expect(
      getVisibleAnnouncements(Array.from({ length: 75 }), page),
    ).toHaveLength(expectedLength);
  });

  test.each([
    [
      3,
      { type: "search", value: "deadline" },
      {
        page: 1,
        search: "deadline",
        sourceFilter: "all",
        view: "followed",
      },
    ],
    [
      3,
      { type: "sourceFilter", value: "academic" },
      {
        page: 1,
        search: "",
        sourceFilter: "academic",
        view: "followed",
      },
    ],
    [
      1,
      { type: "view", value: "matches" },
      { page: 1, search: "", sourceFilter: "all", view: "matches" },
    ],
    [
      1,
      { type: "showMore" },
      { page: 2, search: "", sourceFilter: "all", view: "followed" },
    ],
  ] as const)("applies %s to the list state", (page, action, expected) => {
    expect(
      announcementListReducer(
        { ...initialAnnouncementListState, page },
        action,
      ),
    ).toEqual(expected);
  });
});

describe("announcement source metadata", () => {
  const articleSources: AnnouncementSource[] = [
    {
      id: "student-notices",
      title: "公告",
      link: "https://example/student-notices",
      language: "zh-tw",
      department: "學務處學生住宿組(水木生活中心1樓)",
    },
    {
      id: "student-guidance",
      title: "宣導",
      link: "https://example/student-guidance",
      language: "zh-tw",
      department: "學務處學生住宿組(水木生活中心1樓)",
    },
    {
      id: "academic-notices",
      title: "公告",
      link: "https://example/academic-notices",
      language: "zh-tw",
      department: "教務處",
    },
    {
      id: "student-notices-duplicate",
      title: "公告",
      link: "https://example/student-notices-duplicate",
      language: "en",
      department: "學務處學生住宿組(水木生活中心1樓)",
    },
  ];

  test.each([
    ["zh", "學務處學生住宿組(水木生活中心1樓) · 公告、宣導 · 教務處 · 公告"],
    ["zh-cn", "學務處學生住宿組(水木生活中心1樓) · 公告、宣導 · 教務處 · 公告"],
    ["en", "學務處學生住宿組(水木生活中心1樓) · 公告, 宣導 · 教務處 · 公告"],
  ] as const)(
    "groups feed titles by department for %s",
    (language, expected) => {
      expect(formatAnnouncementSourceGroups(articleSources, language)).toBe(
        expected,
      );
    },
  );
});
