import { Button, ExternalLink, MapPin, X } from "@courseweb/ui";
import type { CampusMapFeature } from "@courseweb/shared";
import {
  getCampusFeatureGoogleMapsUrl,
  getCampusFeatureNames,
  isCampusBuilding,
} from "./sceneLogic";

type BuildingInfoPanelProps = {
  feature: CampusMapFeature;
  labelNumber?: number;
  language: "en" | "zh";
  labels: {
    chineseName: string;
    englishName: string;
    coursewebCode: string;
    openGoogleMaps: string;
    closeDetails: string;
  };
  onClose: () => void;
};

export default function BuildingInfoPanel({
  feature,
  labelNumber,
  language,
  labels,
  onClose,
}: BuildingInfoPanelProps) {
  const names = getCampusFeatureNames(feature);
  const title = language === "en" ? (names.en ?? names.zh) : names.zh;
  const googleMapsUrl = getCampusFeatureGoogleMapsUrl(feature);
  const building = isCampusBuilding(feature) ? feature : undefined;
  const venue = building?.venue;

  return (
    <section
      className="pointer-events-auto w-full rounded-lg border border-border bg-background/95 p-4 shadow-xl backdrop-blur-md"
      aria-labelledby="campus-feature-title"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="campus-feature-title"
            className="font-semibold text-foreground"
          >
            {labelNumber ? `#${labelNumber} ${title}` : title}
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{labels.chineseName}</dt>
            <dd className="text-foreground">{names.zh}</dd>
            <dt className="text-muted-foreground">{labels.englishName}</dt>
            <dd className="text-foreground">{names.en ?? "—"}</dd>
          </dl>
          {venue?.code && (
            <p className="mt-2 text-xs text-muted-foreground">
              {labels.coursewebCode}: {venue.code}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={labels.closeDetails}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Button asChild className="mt-4 w-full">
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
          {labels.openGoogleMaps}
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    </section>
  );
}
