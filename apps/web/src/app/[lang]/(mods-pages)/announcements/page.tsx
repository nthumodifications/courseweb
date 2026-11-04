import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, ListFilter, Search, Tag, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import {
  Button,
  Badge,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ErrorState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import {
  ANNOUNCEMENT_FOLLOWS_KEY,
  announcementListReducer,
  formatAnnouncementDate,
  formatAnnouncementSourceGroups,
  getEffectiveFollowIds,
  getVisibleAnnouncements,
  initialAnnouncementListState,
  isValidFollowIds,
  useAnnouncements,
  type AnnouncementSource,
} from "@/lib/announcements";
import {
  ANNOUNCEMENT_KEYWORDS_KEY,
  ANNOUNCEMENT_KEYWORDS_LAST_SEEN_KEY,
  getAnnouncementKeywordMatchState,
  getMatchedAnnouncementKeywords,
  normalizeAnnouncementKeywords,
  splitAnnouncementTitle,
} from "@/lib/announcements-keywords";
import { hasDeepLinkRequestChanged } from "@/lib/deep-links/deep-link";
import { safeExternalUrl } from "@/lib/safe-external-url";
import { parseAnnouncementsDeepLink } from "./deep-link";
import { usePushAnnouncementPreferences } from "@/lib/push/usePushNotifications";

const sourceMatches = (source: AnnouncementSource, search: string) => {
  const query = search.trim().toLocaleLowerCase();
  return (
    !query ||
    `${source.department} ${source.title}`.toLocaleLowerCase().includes(query)
  );
};

const AnnouncementsPage = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [storedFollowIds, setStoredFollowIds] = useLocalStorage<unknown>(
    ANNOUNCEMENT_FOLLOWS_KEY,
    null,
  );
  const [storedKeywords, setStoredKeywords] = useLocalStorage<unknown>(
    ANNOUNCEMENT_KEYWORDS_KEY,
    [],
  );
  const [storedKeywordLastSeen, setStoredKeywordLastSeen] =
    useLocalStorage<unknown>(ANNOUNCEMENT_KEYWORDS_LAST_SEEN_KEY, null);
  const [articleListState, dispatchArticleList] = useReducer(
    announcementListReducer,
    initialAnnouncementListState,
  );
  const [sourceSearch, setSourceSearch] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [newMatchesCount, setNewMatchesCount] = useState(0);
  const recordedKeywordVisits = useRef(new WeakMap<object, Set<string>>());
  const { data, isLoading, error, refetch } = useAnnouncements();

  const sources = data?.sources ?? [];
  const deepLink = parseAnnouncementsDeepLink(
    searchParams,
    sources.map((source) => source.id),
  );
  const lastAppliedSource = useRef<string | undefined | null>(null);
  useEffect(() => {
    if (isLoading || sources.length === 0) return;
    if (
      !hasDeepLinkRequestChanged(lastAppliedSource.current, deepLink.source)
    ) {
      return;
    }
    lastAppliedSource.current = deepLink.source;
    dispatchArticleList({
      type: "sourceFilter",
      value: deepLink.source ?? "all",
    });
  }, [deepLink.source, isLoading, sources.length]);
  const followIds = useMemo(
    () => getEffectiveFollowIds(storedFollowIds, sources, language),
    [language, sources, storedFollowIds],
  );
  usePushAnnouncementPreferences(
    followIds,
    language,
    data?.sources !== undefined,
  );
  useEffect(() => {
    if (sources.length > 0 && !isValidFollowIds(storedFollowIds)) {
      setStoredFollowIds(followIds);
    }
  }, [followIds, setStoredFollowIds, sources.length, storedFollowIds]);
  const followedSourceIds = useMemo(() => new Set(followIds), [followIds]);
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const keywords = useMemo(
    () => normalizeAnnouncementKeywords(storedKeywords),
    [storedKeywords],
  );
  const keywordLastSeen =
    typeof storedKeywordLastSeen === "string" ? storedKeywordLastSeen : null;
  const keywordSignature = keywords.join("\u001f");
  const matchedKeywordsByArticle = useMemo(
    () =>
      new Map(
        (data?.articles ?? []).map((article) => [
          article.link,
          getMatchedAnnouncementKeywords(article, keywords, sourceById),
        ]),
      ),
    [data?.articles, keywords, sourceById],
  );
  useEffect(() => {
    if (!data) return;
    const recordedSignatures =
      recordedKeywordVisits.current.get(data) ?? new Set<string>();
    if (recordedSignatures.has(keywordSignature)) return;

    const { newMatchesCount: nextNewMatchesCount, newestMatchDate } =
      getAnnouncementKeywordMatchState(
        data.articles,
        keywords,
        sourceById,
        keywordLastSeen,
      );
    setNewMatchesCount(nextNewMatchesCount);
    if (newestMatchDate && newestMatchDate !== keywordLastSeen) {
      setStoredKeywordLastSeen(newestMatchDate);
    }
    recordedSignatures.add(keywordSignature);
    recordedKeywordVisits.current.set(data, recordedSignatures);
  }, [
    data,
    keywordLastSeen,
    keywordSignature,
    keywords,
    setStoredKeywordLastSeen,
    sourceById,
  ]);
  const followedSources = useMemo(
    () => sources.filter((source) => followedSourceIds.has(source.id)),
    [sources, followedSourceIds],
  );
  const selectableSources = useMemo(() => {
    const selectedSource = sourceById.get(articleListState.sourceFilter);
    if (selectedSource && !followedSourceIds.has(selectedSource.id)) {
      return [selectedSource, ...followedSources];
    }
    return followedSources;
  }, [
    articleListState.sourceFilter,
    followedSources,
    followedSourceIds,
    sourceById,
  ]);
  const visibleArticles = useMemo(() => {
    const query = articleListState.search.trim().toLocaleLowerCase();
    return (data?.articles ?? []).filter((article) => {
      const articleSources = article.sourceIds
        .map((sourceId) => sourceById.get(sourceId))
        .filter((source): source is AnnouncementSource => Boolean(source));
      const sourceFilterMatches =
        articleListState.view === "matches"
          ? true
          : articleListState.sourceFilter === "all"
            ? article.sourceIds.some((sourceId) =>
                followedSourceIds.has(sourceId),
              )
            : article.sourceIds.includes(articleListState.sourceFilter);
      const keywordFilterMatches =
        articleListState.view !== "matches" ||
        (matchedKeywordsByArticle.get(article.link)?.length ?? 0) > 0;
      return (
        sourceFilterMatches &&
        keywordFilterMatches &&
        (!query || article.title.toLocaleLowerCase().includes(query)) &&
        articleSources.length > 0
      );
    });
  }, [
    articleListState.search,
    articleListState.sourceFilter,
    articleListState.view,
    data?.articles,
    followedSourceIds,
    matchedKeywordsByArticle,
    sourceById,
  ]);

  const displayedArticles = useMemo(
    () => getVisibleAnnouncements(visibleArticles, articleListState.page),
    [articleListState.page, visibleArticles],
  );

  const groupedSources = useMemo(() => {
    const groups = new Map<string, AnnouncementSource[]>();
    for (const source of sources.filter((item) =>
      sourceMatches(item, sourceSearch),
    )) {
      const group = groups.get(source.department) ?? [];
      group.push(source);
      groups.set(source.department, group);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sourceSearch, sources]);
  const languagesByDepartment = useMemo(() => {
    const languages = new Map<string, Set<AnnouncementSource["language"]>>();
    for (const source of sources) {
      const departmentLanguages =
        languages.get(source.department) ??
        new Set<AnnouncementSource["language"]>();
      departmentLanguages.add(source.language);
      languages.set(source.department, departmentLanguages);
    }
    return languages;
  }, [sources]);

  const toggleFollow = (sourceId: string, checked: boolean) => {
    const next = new Set(followIds);
    if (checked) next.add(sourceId);
    else next.delete(sourceId);
    setStoredFollowIds([...next]);
  };

  const addKeyword = (value: string) => {
    const next = normalizeAnnouncementKeywords([...keywords, value]);
    setStoredKeywords(next);
    setKeywordDraft("");
  };

  const removeKeyword = (keyword: string) => {
    setStoredKeywords(keywords.filter((candidate) => candidate !== keyword));
  };

  const newMatchesLabel = dict.announcements.new_matches_count.replace(
    "{count}",
    String(newMatchesCount),
  );

  return (
    <div className="flex flex-col px-4 md:px-6">
      <div className="flex flex-col gap-3 border-b border-border py-3">
        <Tabs
          value={articleListState.view}
          onValueChange={(value) => {
            if (value === "followed" || value === "matches") {
              dispatchArticleList({ type: "view", value });
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="followed">
              {dict.announcements.followed_tab}
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="matches">
              <span className="flex items-center justify-center gap-2">
                {dict.announcements.matches_tab}
                {newMatchesCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1 text-xs"
                    aria-label={newMatchesLabel}
                  >
                    {newMatchesCount}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-1.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={articleListState.search}
              onChange={(event) =>
                dispatchArticleList({
                  type: "search",
                  value: event.target.value,
                })
              }
              placeholder={dict.announcements.search_placeholder}
              aria-label={dict.announcements.search_placeholder}
              className="h-8 pl-6 text-xs"
            />
          </div>
          <div className="flex gap-2 sm:contents">
            {articleListState.view === "followed" && (
              <Select
                value={articleListState.sourceFilter}
                onValueChange={(value) => {
                  dispatchArticleList({ type: "sourceFilter", value });
                  setSearchParams(
                    (current) => {
                      const next = new URLSearchParams(current);
                      if (value === "all") next.delete("source");
                      else next.set("source", value);
                      return next;
                    },
                    { replace: true },
                  );
                }}
              >
                <SelectTrigger
                  className="min-w-0 flex-1 sm:w-[180px] sm:flex-none"
                  aria-label={dict.announcements.filter_source}
                >
                  <SelectValue placeholder={dict.announcements.all_followed} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {dict.announcements.all_followed}
                  </SelectItem>
                  {selectableSources.map((source) => (
                    <SelectItem value={source.id} key={source.id}>
                      {source.department} · {source.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <ListFilter />
                  {dict.announcements.manage_follows}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-hidden p-4 sm:w-full">
                <DialogHeader>
                  <DialogTitle>{dict.announcements.manage_follows}</DialogTitle>
                  <DialogDescription>
                    {dict.announcements.manage_follows_description}
                  </DialogDescription>
                </DialogHeader>
                <div className="relative">
                  <Search className="absolute left-1.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={sourceSearch}
                    onChange={(event) => setSourceSearch(event.target.value)}
                    placeholder={dict.announcements.source_search_placeholder}
                    aria-label={dict.announcements.source_search_placeholder}
                    className="h-8 pl-6 text-xs"
                  />
                </div>
                <div className="min-h-0 overflow-y-auto">
                  {groupedSources.map(([department, departmentSources]) => (
                    <section
                      key={department}
                      className="border-b border-border py-3 last:border-b-0"
                    >
                      <h3 className="mb-2 font-bold">{department}</h3>
                      <div className="flex flex-col divide-y divide-border">
                        {departmentSources.map((source) => (
                          <label
                            className="flex min-h-10 items-center gap-3 py-2"
                            key={source.id}
                          >
                            <Checkbox
                              checked={followedSourceIds.has(source.id)}
                              onCheckedChange={(checked) =>
                                toggleFollow(source.id, checked === true)
                              }
                            />
                            <span className="min-w-0 flex-1 text-sm">
                              <span className="block">{source.title}</span>
                              {languagesByDepartment.get(department)?.size !==
                                1 && (
                                <span className="block text-xs text-muted-foreground">
                                  {source.language === "en"
                                    ? dict.announcements.source_language.en
                                    : dict.announcements.source_language.zh_tw}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={keywordsOpen} onOpenChange={setKeywordsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Tag />
                  {dict.announcements.manage_keywords}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-hidden p-4 sm:w-full">
                <DialogHeader>
                  <DialogTitle>
                    {dict.announcements.manage_keywords}
                  </DialogTitle>
                  <DialogDescription>
                    {dict.announcements.manage_keywords_description}
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (keywordDraft.trim()) addKeyword(keywordDraft);
                  }}
                >
                  <Input
                    value={keywordDraft}
                    onChange={(event) => setKeywordDraft(event.target.value)}
                    placeholder={dict.announcements.keyword_placeholder}
                    aria-label={dict.announcements.keyword_placeholder}
                    className="h-8 min-w-0 flex-1 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!keywordDraft.trim()}
                  >
                    {dict.announcements.add_keyword}
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <Badge
                      variant="outline"
                      className="gap-1 py-1"
                      key={keyword}
                    >
                      {keyword}
                      <button
                        type="button"
                        className="rounded-sm text-muted-foreground hover:text-foreground"
                        onClick={() => removeKeyword(keyword)}
                        aria-label={`${dict.announcements.remove_keyword}: ${keyword}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    {dict.announcements.keyword_suggestions}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {dict.announcements.suggested_keywords.map((keyword) => (
                      <Button
                        key={keyword}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={keywords.some(
                          (existing) =>
                            existing.toLocaleLowerCase() ===
                            keyword.toLocaleLowerCase(),
                        )}
                        onClick={() => addKeyword(keyword)}
                      >
                        {keyword}
                      </Button>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className="flex flex-col divide-y divide-border"
          aria-label={dict.common.loading}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div className="flex flex-col gap-2 py-4" key={index}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title={dict.announcements.load_error}
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {dict.announcements.try_again}
            </Button>
          }
        />
      ) : visibleArticles.length === 0 ? (
        <div className="py-4 text-left text-sm text-muted-foreground">
          {articleListState.view === "matches"
            ? keywords.length > 0
              ? dict.announcements.no_keyword_matches
              : dict.announcements.no_keywords
            : dict.announcements.no_results}
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {displayedArticles.map((article) => {
              const articleSources = article.sourceIds
                .map((sourceId) => sourceById.get(sourceId))
                .filter((source): source is AnnouncementSource =>
                  Boolean(source),
                );
              if (articleSources.length === 0) return null;
              const href = safeExternalUrl(article.link);
              if (!href) return null;
              const matchedKeywords =
                matchedKeywordsByArticle.get(article.link) ?? [];
              const titleSegments =
                articleListState.view === "matches"
                  ? splitAnnouncementTitle(article.title, matchedKeywords)
                  : [{ text: article.title, matched: false }];
              return (
                <a
                  className="flex min-w-0 flex-col gap-2 py-4 hover:bg-accent/50 sm:flex-row sm:gap-4"
                  href={href}
                  key={`${article.link}:${article.date}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground">
                      {titleSegments.map((segment, index) =>
                        segment.matched ? (
                          <mark
                            className="rounded bg-primary/20 text-foreground"
                            key={index}
                          >
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={index}>{segment.text}</span>
                        ),
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatAnnouncementSourceGroups(articleSources, language)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground sm:justify-end">
                    <span>
                      {formatAnnouncementDate(article.date, language)}
                    </span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </div>
                </a>
              );
            })}
          </div>
          {displayedArticles.length < visibleArticles.length && (
            <div className="flex items-center gap-4 py-4">
              <Button
                variant="outline"
                onClick={() => dispatchArticleList({ type: "showMore" })}
              >
                {dict.announcements.show_more}
              </Button>
            </div>
          )}
        </>
      )}

      <div className="border-t border-border py-4 text-xs text-muted-foreground">
        {dict.announcements.attribution_prefix}{" "}
        <a
          className="underline underline-offset-2"
          href="https://github.com/NTHU-SA/NTHU-Data-API"
          target="_blank"
          rel="noreferrer"
        >
          {dict.announcements.attribution_name}
        </a>
      </div>
      <div className="h-6" />
    </div>
  );
};

export default AnnouncementsPage;
