import { Suspense } from "react";
import { cn } from "@courseweb/ui";
import type { ChangelogVisual as ChangelogVisualData } from "@/const/changelog";
import {
  CHANGELOG_PREVIEW_REGISTRY,
  type ChangelogPreviewProps,
} from "./previewRegistry";

export const ChangelogVisualContent = ({
  visual,
  language,
}: { visual: ChangelogVisualData } & ChangelogPreviewProps) => {
  if (visual.kind === "image") {
    return (
      <img
        src={visual.src}
        alt={visual.alt}
        width={visual.width}
        height={visual.height}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    );
  }

  const Preview = CHANGELOG_PREVIEW_REGISTRY[visual.id];
  return (
    <div
      className="h-full w-full overflow-hidden pointer-events-none"
      aria-hidden="true"
      {...{ inert: "" }}
    >
      <Suspense fallback={<div className="h-full w-full bg-muted" />}>
        <Preview language={language} />
      </Suspense>
    </div>
  );
};

export const ChangelogVisual = ({
  visual,
  language,
  className,
}: { visual: ChangelogVisualData } & ChangelogPreviewProps & {
    className?: string;
  }) => (
  <div
    className={cn(
      "h-64 w-full overflow-hidden rounded-md border border-border bg-muted",
      className,
    )}
    aria-hidden="true"
    {...{ inert: "" }}
  >
    <ChangelogVisualContent visual={visual} language={language} />
  </div>
);
