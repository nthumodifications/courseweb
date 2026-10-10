import type { ChangelogRelease } from "@/const/changelog";

export const LAST_SEEN_VERSION_KEY = "last_seen_changelog_version";
export const ONBOARDING_COMPLETE_KEY = "hasVisitedBefore";

export const getHighlightedRelease = (releases: readonly ChangelogRelease[]) =>
  releases.find((release) => release.highlight);

export const isReleaseUnread = ({
  lastSeenVersion,
  currentVersion,
  hasVisitedBefore,
}: {
  lastSeenVersion: string | null;
  currentVersion: string;
  hasVisitedBefore: boolean;
}) => hasVisitedBefore && lastSeenVersion !== currentVersion;

export const shouldShowWhatsNew = ({
  lastSeenVersion,
  currentVersion,
  hasVisitedBefore,
  hasOpenDialog,
}: {
  lastSeenVersion: string | null;
  currentVersion: string;
  hasVisitedBefore: boolean;
  hasOpenDialog: boolean;
}) =>
  isReleaseUnread({ lastSeenVersion, currentVersion, hasVisitedBefore }) &&
  !hasOpenDialog;

const toLocaleIndependentPath = (href: string) => {
  const pathname = new URL(href, "https://nthumods.test").pathname;
  const segments = pathname.split("/");
  return segments[1] === "en" || segments[1] === "zh"
    ? `/${segments.slice(2).join("/")}`
    : pathname;
};

export const hasReleaseActionForHref = (
  release: ChangelogRelease,
  href: string,
) => {
  const path = toLocaleIndependentPath(href);
  return release.items.some(
    (item) =>
      item.action !== undefined &&
      toLocaleIndependentPath(item.action.href) === path,
  );
};
