import { useLocalStorage } from "usehooks-ts";
import { CHANGELOG, type ChangelogRelease } from "@/const/changelog";
import {
  getHighlightedRelease,
  isReleaseUnread,
  LAST_SEEN_VERSION_KEY,
  ONBOARDING_COMPLETE_KEY,
} from "./changelogLogic";

export const useUnseenRelease = (): ChangelogRelease | undefined => {
  const [lastSeenVersion] = useLocalStorage<string | null>(
    LAST_SEEN_VERSION_KEY,
    null,
  );
  const [hasVisitedBefore] = useLocalStorage<boolean>(
    ONBOARDING_COMPLETE_KEY,
    false,
  );
  const release = getHighlightedRelease(CHANGELOG);

  return release &&
    isReleaseUnread({
      lastSeenVersion,
      currentVersion: release.version,
      hasVisitedBefore,
    })
    ? release
    : undefined;
};
