import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { Badge } from "@courseweb/ui";
import { WidgetShell } from "./WidgetShell";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import {
  ANNOUNCEMENT_FOLLOWS_KEY,
  formatAnnouncementDate,
  formatAnnouncementSourceGroups,
  getEffectiveFollowIds,
  useAnnouncements,
} from "@/lib/announcements";
import type { AnnouncementSource } from "@/lib/announcements";
import {
  ANNOUNCEMENT_KEYWORDS_KEY,
  ANNOUNCEMENT_KEYWORDS_LAST_SEEN_KEY,
  countNewKeywordMatches,
  normalizeAnnouncementKeywords,
} from "@/lib/announcements-keywords";

interface AnnouncementsWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const AnnouncementsWidget: FC<AnnouncementsWidgetProps> = (props) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [storedFollowIds] = useLocalStorage<unknown>(
    ANNOUNCEMENT_FOLLOWS_KEY,
    null,
  );
  const [storedKeywords] = useLocalStorage<unknown>(
    ANNOUNCEMENT_KEYWORDS_KEY,
    [],
  );
  const [storedKeywordLastSeen] = useLocalStorage<unknown>(
    ANNOUNCEMENT_KEYWORDS_LAST_SEEN_KEY,
    null,
  );
  const { data, isLoading, error } = useAnnouncements();
  const sources = data?.sources ?? [];
  const followIds = useMemo(
    () => getEffectiveFollowIds(storedFollowIds, sources, language),
    [language, sources, storedFollowIds],
  );
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const keywords = useMemo(
    () => normalizeAnnouncementKeywords(storedKeywords),
    [storedKeywords],
  );
  const newMatchesCount = countNewKeywordMatches(
    data?.articles ?? [],
    keywords,
    sourceById,
    typeof storedKeywordLastSeen === "string" ? storedKeywordLastSeen : null,
  );
  const widgetTitle = (
    <span className="flex items-center gap-2">
      <span>
        {
          dict.settings.calendar.widget_dashboard.widget_options.announcements
            .title
        }
      </span>
      {newMatchesCount > 0 && (
        <Badge
          variant="secondary"
          className="h-5 min-w-5 px-1 text-xs"
          aria-label={dict.announcements.new_matches_count.replace(
            "{count}",
            String(newMatchesCount),
          )}
        >
          {newMatchesCount}
        </Badge>
      )}
    </span>
  );
  const articles = (data?.articles ?? [])
    .filter((article) =>
      article.sourceIds.some((sourceId) => followIds.includes(sourceId)),
    )
    .slice(0, 5);

  return (
    <WidgetShell title={widgetTitle} {...props}>
      <div className="flex flex-col p-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="flex flex-col gap-2" key={index}>
                <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-2 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 py-2 text-sm text-muted-foreground">
            <Megaphone className="h-4 w-4" />
            <span>{dict.announcements.load_error}</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">
            {dict.announcements.no_results}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {articles.map((article) => {
              const articleSources = article.sourceIds
                .map((sourceId) => sourceById.get(sourceId))
                .filter(
                  (source): source is AnnouncementSource => Boolean(source),
                );
              return (
                <a
                  className="flex flex-col gap-1 py-3"
                  href={article.link}
                  key={`${article.link}:${article.date}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="font-medium text-foreground">
                    {article.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatAnnouncementSourceGroups(articleSources, language)}{" "}
                    ·{" "}
                    {formatAnnouncementDate(article.date, language)}
                  </span>
                </a>
              );
            })}
          </div>
        )}
        <Link
          to={`/${language}/announcements`}
          className="mt-3 text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default AnnouncementsWidget;
