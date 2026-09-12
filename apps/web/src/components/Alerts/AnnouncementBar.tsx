import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { cn } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import supabase, { AlertDefinition } from "@/config/supabase";

type AlertSeverity = "info" | "warning" | "error";

const severityStyles: Record<
  AlertSeverity,
  { className: string; Icon: typeof Info }
> = {
  info: {
    className: "border-info/40 bg-info text-info-foreground",
    Icon: Info,
  },
  warning: {
    className: "border-warning/40 bg-warning text-warning-foreground",
    Icon: AlertTriangle,
  },
  error: {
    className:
      "border-destructive/50 bg-destructive text-destructive-foreground",
    Icon: AlertTriangle,
  },
};

const fetchAnnouncement = async (): Promise<AlertDefinition | null> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("active", true)
    .lte("start_date", now)
    .gte("end_date", now)
    .order("priority", { ascending: false })
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const AnnouncementBar = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const [dismissedAnnouncements, setDismissedAnnouncements] = useLocalStorage<
    number[]
  >("dismissed_announcements", []);
  const { data: announcement, isLoading } = useQuery({
    queryKey: ["announcement"],
    queryFn: fetchAnnouncement,
    // This table's original use was "Typhoon Koinu: Class Suspended". An hour
    // of staleness behind a persisted cache would mean a class-suspension
    // notice reaching a returning student long after it mattered, so keep the
    // window short and re-check when the tab regains focus.
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (
    isLoading ||
    !announcement ||
    dismissedAnnouncements.includes(announcement.id)
  ) {
    return null;
  }

  const isEnglish = lang === "en";
  const title = isEnglish
    ? (announcement.title_en ?? announcement.title)
    : announcement.title;
  const description = isEnglish
    ? (announcement.description_en ?? announcement.description)
    : announcement.description;
  const linkLabel = isEnglish
    ? (announcement.link_label_en ?? announcement.link_label)
    : (announcement.link_label ?? announcement.link_label_en);
  // An internal target is stored as a locale-less path such as "/recruit" so
  // one row serves both languages; it is routed in-app rather than opening a
  // new tab. Anything absolute stays an external link.
  const rawLink = announcement.link_url;
  const isInternalLink = !!rawLink && rawLink.startsWith("/");
  const internalHref = isInternalLink
    ? `/${lang === "en" ? "en" : "zh"}${rawLink}`
    : null;

  const severity = announcement.severity as AlertSeverity;
  const style = severityStyles[severity] ?? severityStyles.info;
  const Icon = style.Icon;

  const dismiss = () => {
    setDismissedAnnouncements((ids) => [...new Set([...ids, announcement.id])]);
  };

  return (
    <div
      role="status"
      className={cn(
        // One tidy line once there is room; on a phone the title is allowed a
        // second line rather than being truncated into "NTHUM…".
        "flex min-h-9 w-full items-center gap-2 border-b px-3 py-1 text-sm sm:whitespace-nowrap",
        style.className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {/* The title stays readable at 400px: two lines rather than an
            ellipsis after five characters. The description is supplementary,
            so it is dropped entirely on a phone instead of competing for the
            same line. */}
        <span className="min-w-0 font-medium line-clamp-2 sm:truncate sm:line-clamp-none">
          {title}
        </span>
        {description && (
          <span className="hidden min-w-0 truncate text-current/80 sm:inline">
            — {description}
          </span>
        )}
      </div>
      {rawLink &&
        linkLabel &&
        (isInternalLink ? (
          <Link
            to={internalHref!}
            className="shrink-0 rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {linkLabel}
          </Link>
        ) : (
          <a
            href={rawLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {linkLabel}
          </a>
        ))}
      {announcement.dismissible && (
        <button
          type="button"
          aria-label={dict.alerts.dismiss}
          className="shrink-0 rounded-sm p-1 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={dismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default AnnouncementBar;
