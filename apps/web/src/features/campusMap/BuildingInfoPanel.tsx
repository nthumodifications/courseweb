import { Button, ExternalLink, MapPin, X } from "@courseweb/ui";
import type { CampusBuilding } from "@courseweb/shared";

type BuildingInfoPanelProps = {
  building: CampusBuilding;
  language: "en" | "zh";
  labels: {
    coursewebCode: string;
    openGoogleMaps: string;
    closeDetails: string;
  };
  onClose: () => void;
};

export default function BuildingInfoPanel({
  building,
  language,
  labels,
  onClose,
}: BuildingInfoPanelProps) {
  const title =
    language === "en"
      ? (building.names.en ?? building.names.zh)
      : building.names.zh;
  const secondaryName =
    language === "zh" && building.names.en ? building.names.en : undefined;
  const googleMapsUrl = building.googleMaps?.query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building.googleMaps.query)}`
    : undefined;

  return (
    <section
      className="pointer-events-auto w-full rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-md"
      aria-labelledby="campus-building-title"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="campus-building-title"
            className="font-semibold text-foreground"
          >
            {title}
          </h2>
          {secondaryName && (
            <p className="text-sm text-muted-foreground">{secondaryName}</p>
          )}
          {building.venue?.code && (
            <p className="mt-2 text-xs text-muted-foreground">
              {labels.coursewebCode}: {building.venue.code}
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

      {googleMapsUrl && (
        <Button asChild className="mt-4 w-full">
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            {labels.openGoogleMaps}
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      )}
    </section>
  );
}
