import { useEffect, useRef, useState } from "react";
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
  cn,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { CHANGELOG } from "@/const/changelog";
import { ChangelogVisualContent } from "./ChangelogVisual";
import { getHighlightedRelease, shouldShowWhatsNew } from "./changelogLogic";

const LAST_SEEN_VERSION_KEY = "last_seen_changelog_version";
const ONBOARDING_COMPLETE_KEY = "hasVisitedBefore";
const ONBOARDING_CHECK_INTERVAL_MS = 500;
const SWIPE_THRESHOLD_PX = 40;
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
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const release = getHighlightedRelease(CHANGELOG);
  const hasVisuals =
    release?.items.length !== 0 &&
    (release?.items.every((item) => item.visual) ?? false);

  useEffect(() => {
    if (!release || lastSeenVersion === release.version) return;

    const showIfOnboardingIsComplete = () => {
      if (
        !shouldShowWhatsNew({
          lastSeenVersion,
          currentVersion: release.version,
          hasVisitedBefore:
            window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true",
          hasOpenDialog: Boolean(document.querySelector(OPEN_DIALOG_SELECTOR)),
        })
      ) {
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

  useEffect(() => {
    if (open) setSlideIndex(0);
  }, [open, release?.version]);

  useEffect(() => {
    if (!open || !hasVisuals) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSlideIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSlideIndex((current) =>
          Math.min((release?.items.length ?? 1) - 1, current + 1),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasVisuals, open, release?.items.length]);

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

  const currentItem = release.items[slideIndex];
  const goToSlide = (index: number) => {
    setSlideIndex(Math.max(0, Math.min(release.items.length - 1, index)));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < SWIPE_THRESHOLD_PX) return;
    goToSlide(slideIndex + (distance < 0 ? 1 : -1));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-hidden p-4 sm:w-full">
        <DialogHeader
          className={hasVisuals ? "pr-8 text-left sm:text-left" : undefined}
        >
          {hasVisuals ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle>{dict.changelog.whats_new}</DialogTitle>
                <DialogDescription className="leading-relaxed">
                  {release.title?.[language] ?? release.version}
                </DialogDescription>
              </div>
              <Link
                to={`/${lang ?? "zh"}/changelog`}
                onClick={markAsSeen}
                className="shrink-0 pt-1 text-xs text-muted-foreground underline underline-offset-4"
              >
                {dict.changelog.view_all}
              </Link>
            </div>
          ) : (
            <>
              <DialogTitle>{dict.changelog.whats_new}</DialogTitle>
              <DialogDescription className="leading-relaxed">
                {release.title?.[language] ?? release.version}
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {hasVisuals ? (
          <>
            <div
              className="flex h-64 w-full flex-col justify-center overflow-hidden rounded-md border border-border bg-muted"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              aria-live="polite"
            >
              <div
                className="flex h-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none"
                style={{ transform: `translateX(-${slideIndex * 100}%)` }}
              >
                {release.items.map((item, index) => (
                  <div
                    key={`${release.version}-${index}-visual`}
                    className="pointer-events-none h-full min-w-full overflow-hidden"
                    aria-hidden={index !== slideIndex}
                    {...{ inert: "" }}
                  >
                    {item.visual ? (
                      <ChangelogVisualContent
                        visual={item.visual}
                        language={language}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">
                  {dict.changelog.types[currentItem.type]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {slideIndex + 1} / {release.items.length}
                </span>
              </div>
              <h3 className="font-bold leading-snug">
                {currentItem.title[language]}
              </h3>
              {currentItem.description && (
                <p className="min-h-12 text-sm leading-relaxed text-muted-foreground">
                  {currentItem.description[language]}
                </p>
              )}
            </div>

            {currentItem.action && (
              <Button asChild className="w-full">
                <Link
                  to={`/${language}${currentItem.action.href}`}
                  onClick={markAsSeen}
                >
                  {dict.changelog.actions[currentItem.action.key]}
                </Link>
              </Button>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1" role="tablist">
                  {release.items.map((item, index) => (
                    <button
                      key={`${release.version}-${index}-dot`}
                      type="button"
                      role="tab"
                      aria-label={`${index + 1} / ${release.items.length}`}
                      aria-selected={index === slideIndex}
                      className={cn(
                        "h-2 w-2 rounded-full bg-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        index === slideIndex && "bg-foreground",
                      )}
                      onClick={() => goToSlide(index)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={slideIndex === 0}
                    onClick={() => goToSlide(slideIndex - 1)}
                  >
                    {dict.changelog.previous}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (slideIndex === release.items.length - 1) {
                        markAsSeen();
                      } else {
                        goToSlide(slideIndex + 1);
                      }
                    }}
                  >
                    {slideIndex === release.items.length - 1
                      ? dict.changelog.finish
                      : dict.changelog.next}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        ) : (
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
                    <p className="min-h-12 text-sm leading-relaxed text-muted-foreground">
                      {item.description[language]}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!hasVisuals && (
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewDialog;
