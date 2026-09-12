import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { CHANGELOG } from "@/const/changelog";

const LAST_SEEN_VERSION_KEY = "last_seen_changelog_version";
const ONBOARDING_COMPLETE_KEY = "hasVisitedBefore";
const ONBOARDING_CHECK_INTERVAL_MS = 500;
const OPEN_DIALOG_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

const WhatsNewDialog = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const language = lang === "en" ? "en" : "zh";
  const [lastSeenVersion, setLastSeenVersion] = useLocalStorage<string | null>(
    LAST_SEEN_VERSION_KEY,
    null,
  );
  const [open, setOpen] = useState(false);
  const release = CHANGELOG.find((entry) => entry.highlight);

  useEffect(() => {
    if (!release || lastSeenVersion === release.version) return;

    // A missing value means this is a new install. Register the current
    // release silently so a new user is not treated as an upgrade.
    if (lastSeenVersion === null) {
      setLastSeenVersion(release.version);
      return;
    }

    const showIfOnboardingIsComplete = () => {
      if (window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) !== "true") {
        return false;
      }
      if (document.querySelector(OPEN_DIALOG_SELECTOR)) {
        return false;
      }

      setOpen(true);
      return true;
    };

    if (showIfOnboardingIsComplete()) return;

    // Help opens automatically for a first-time visitor. Keep checking until
    // it records completion, which prevents two modal dialogs from stacking.
    const interval = window.setInterval(() => {
      if (showIfOnboardingIsComplete()) {
        window.clearInterval(interval);
      }
    }, ONBOARDING_CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [lastSeenVersion, release, setLastSeenVersion]);

  if (!release) return null;

  const markAsSeen = () => {
    setLastSeenVersion(release.version);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      markAsSeen();
      return;
    }

    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{dict.changelog.whats_new}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {release.title?.[language] ?? release.version}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-4">
          {release.items.map((item, index) => (
            <li
              key={`${release.version}-${index}`}
              className="flex items-start gap-4"
            >
              <Badge variant="secondary" className="mt-1 shrink-0">
                {dict.changelog.types[item.type]}
              </Badge>
              <div className="min-w-0 flex flex-col gap-1">
                <h3 className="font-medium leading-relaxed">
                  {item.title[language]}
                </h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description[language]}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={`/${lang ?? "zh"}/changelog`} onClick={markAsSeen}>
              {dict.changelog.view_all}
            </Link>
          </Button>
          <Button onClick={markAsSeen} className="w-full sm:w-auto">
            {dict.changelog.dismiss}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewDialog;
