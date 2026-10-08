import type { ChangelogRelease } from "@/const/changelog";

export const getHighlightedRelease = (releases: readonly ChangelogRelease[]) =>
  releases.find((release) => release.highlight);

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
}) => lastSeenVersion !== currentVersion && hasVisitedBefore && !hasOpenDialog;
