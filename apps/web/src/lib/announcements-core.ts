import type { Language } from "@/types/settings";

export const ANNOUNCEMENT_FOLLOWS_KEY = "announcements_followed_sources";
export const ANNOUNCEMENTS_PAGE_SIZE = 30;

export interface AnnouncementSource {
  id: string;
  title: string;
  link: string;
  language: "zh-tw" | "en";
  department: string;
}

export interface AnnouncementArticle {
  title: string;
  link: string;
  date: string;
  sourceIds: string[];
}

export interface AnnouncementsData {
  sources: AnnouncementSource[];
  articles: AnnouncementArticle[];
}

export interface AnnouncementListState {
  page: number;
  search: string;
  sourceFilter: string;
  view: "followed" | "matches";
}

export type AnnouncementListAction =
  | { type: "search"; value: string }
  | { type: "sourceFilter"; value: string }
  | { type: "view"; value: AnnouncementListState["view"] }
  | { type: "showMore" };

export const initialAnnouncementListState: AnnouncementListState = {
  page: 1,
  search: "",
  sourceFilter: "all",
  view: "followed",
};

export const announcementListReducer = (
  state: AnnouncementListState,
  action: AnnouncementListAction,
): AnnouncementListState => {
  switch (action.type) {
    case "search":
      return { ...state, page: 1, search: action.value };
    case "sourceFilter":
      return { ...state, page: 1, sourceFilter: action.value };
    case "view":
      return { ...state, page: 1, view: action.value };
    case "showMore":
      return { ...state, page: state.page + 1 };
  }
};

export const getVisibleAnnouncements = <T>(items: T[], page: number) =>
  items.slice(0, Math.max(1, page) * ANNOUNCEMENTS_PAGE_SIZE);

export const getDefaultFollowIds = (
  sources: AnnouncementSource[],
  language: Language,
): string[] => {
  const sourceLanguage = language === "en" ? "en" : "zh-tw";
  const eligible = sources.filter(
    (source) =>
      source.department.startsWith("教務處") ||
      source.department.startsWith("學務處"),
  );
  return eligible
    .filter((source) => {
      const hasPreferredLanguage = eligible.some(
        (candidate) =>
          candidate.department === source.department &&
          candidate.language === sourceLanguage,
      );
      return source.language === sourceLanguage || !hasPreferredLanguage;
    })
    .map((source) => source.id);
};

export const isValidFollowIds = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === "string");

export const getEffectiveFollowIds = (
  storedIds: unknown,
  sources: AnnouncementSource[],
  language: Language,
): string[] => {
  if (!isValidFollowIds(storedIds))
    return getDefaultFollowIds(sources, language);
  const availableIds = new Set(sources.map((source) => source.id));
  return storedIds.filter((id) => availableIds.has(id));
};

export const formatAnnouncementDate = (date: string, language: Language) =>
  new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(new Date(`${date}T00:00:00Z`));

export const formatAnnouncementSourceGroups = (
  sources: AnnouncementSource[],
  language: Language,
) => {
  const titleSeparator = language === "en" ? ", " : "、";
  const titlesByDepartment = new Map<string, string[]>();

  for (const source of sources) {
    const titles = titlesByDepartment.get(source.department) ?? [];
    if (!titles.includes(source.title)) titles.push(source.title);
    titlesByDepartment.set(source.department, titles);
  }

  return [...titlesByDepartment.entries()]
    .map(
      ([department, titles]) =>
        `${department} · ${titles.join(titleSeparator)}`,
    )
    .join(" · ");
};
