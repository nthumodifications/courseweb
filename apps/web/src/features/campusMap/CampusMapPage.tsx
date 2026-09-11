import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@courseweb/ui";
import { useParams, useSearchParams } from "react-router-dom";
import {
  findCampusBuildingForIdentity,
  getCampusBuildingIdentity,
  resolveVenueToCampusIdentity,
  type CampusMapFeature,
} from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import BuildingInfoPanel from "./BuildingInfoPanel";
import CampusScene from "./CampusScene";
import MapLegend from "./MapLegend";
import MapSearch from "./MapSearch";
import { CAMPUS_MAP_DATA_CACHE_VERSION, loadCampusMapData } from "./data";
import {
  createCampusFeatureLabelNumbers,
  getCampusFeatureLabelKey,
  isCampusBuilding,
} from "./sceneLogic";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

function MapMessage({
  title,
  detail,
  loading = false,
}: {
  title: string;
  detail?: string;
  loading?: boolean;
}) {
  return (
    <div className="grid h-full min-h-[32rem] place-items-center bg-muted/30 px-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-3">
        {loading ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        ) : (
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export default function CampusMapPage() {
  const dict = useDictionary().campus_map;
  const { lang } = useParams<{ lang: string }>();
  const language = lang === "en" ? "en" : "zh";
  const [searchParams, setSearchParams] = useSearchParams();
  const [resetNonce, setResetNonce] = useState(0);
  const webglAvailable = useMemo(supportsWebGL, []);
  const { data, isLoading, error } = useQuery({
    queryKey: ["nthu-campus-map", CAMPUS_MAP_DATA_CACHE_VERSION],
    queryFn: ({ signal }) => loadCampusMapData(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const availableIdentityIds = useMemo(
    () =>
      new Set(
        data?.buildings
          .map((building) => building.identityId)
          .filter((id): id is string => Boolean(id)) ?? [],
      ),
    [data?.buildings],
  );

  const requestedVenue = searchParams.get("venue");
  const requestedIdentityId = searchParams.get("building");
  const requestedFeatureId = searchParams.get("feature");
  const venueIdentity = requestedVenue
    ? resolveVenueToCampusIdentity(requestedVenue)
    : undefined;
  const identity = requestedIdentityId
    ? getCampusBuildingIdentity(requestedIdentityId)
    : venueIdentity;
  const selectedFeature: CampusMapFeature | undefined = data
    ? identity
      ? findCampusBuildingForIdentity(data, identity.id)
      : requestedFeatureId
        ? (data.buildings.find(
            (building) => building.id === requestedFeatureId,
          ) ??
          data.water.find((area) => area.id === requestedFeatureId) ??
          data.areas.find((area) => area.id === requestedFeatureId))
        : undefined
    : undefined;
  const selectedBuilding =
    selectedFeature && isCampusBuilding(selectedFeature)
      ? selectedFeature
      : undefined;
  const featureLabelNumbers = useMemo(
    () => (data ? createCampusFeatureLabelNumbers(data) : undefined),
    [data],
  );
  const selectedFeatureLabelNumber = selectedFeature
    ? featureLabelNumbers?.get(getCampusFeatureLabelKey(selectedFeature))
    : undefined;

  const requestWarning = data
    ? requestedVenue && !venueIdentity
      ? `${dict.venueNotMapped}: ${requestedVenue}`
      : identity && !selectedBuilding
        ? `${dict.venueNotMapped}: ${requestedVenue ?? identity.names.zh}`
        : requestedIdentityId && !identity
          ? `${dict.venueNotMapped}: ${requestedIdentityId}`
          : undefined
    : undefined;

  const selectIdentity = (identityId: string) => {
    const next = new URLSearchParams();
    next.set("building", identityId);
    setSearchParams(next);
  };

  const selectFeature = (feature: CampusMapFeature) => {
    const next = new URLSearchParams();
    if (isCampusBuilding(feature) && feature.identityId) {
      next.set("building", feature.identityId);
    } else {
      next.set("feature", feature.id);
    }
    setSearchParams(next);
  };

  const clearSelection = () => setSearchParams(new URLSearchParams());
  const resetCamera = () => {
    clearSelection();
    setResetNonce((value) => value + 1);
  };

  if (isLoading) {
    return <MapMessage title={dict.loading} loading />;
  }
  if (error || !data) {
    return (
      <MapMessage
        title={dict.loadError}
        detail={error instanceof Error ? error.message : undefined}
      />
    );
  }
  if (!webglAvailable) {
    return (
      <MapMessage title={dict.webglError} detail={dict.webglErrorDetail} />
    );
  }

  const sceneFallback = (
    <MapMessage title={dict.webglError} detail={dict.webglErrorDetail} />
  );

  return (
    <main className="relative h-[calc(100dvh-9rem)] min-h-[32rem] w-full overflow-hidden bg-muted/30 md:h-[calc(100dvh-5rem)] md:min-h-[38rem]">
      <ErrorBoundary
        fallbackRender={({ error: sceneError }) => (
          <MapMessage
            title={dict.webglError}
            detail={
              sceneError instanceof Error ? sceneError.message : undefined
            }
          />
        )}
        resetKeys={[data]}
      >
        <CampusScene
          data={data}
          selectedFeature={selectedFeature}
          resetNonce={resetNonce}
          language={language}
          onSelectFeature={selectFeature}
          webglFallback={sceneFallback}
        />
      </ErrorBoundary>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 md:p-4">
        <div className="flex max-w-sm min-w-0 flex-col items-start">
          <MapSearch
            availableIdentityIds={availableIdentityIds}
            language={language}
            labels={{
              searchLabel: dict.searchLabel,
              searchPlaceholder: dict.searchPlaceholder,
              noResults: dict.noResults,
            }}
            onSelect={selectIdentity}
          />
          {requestWarning && (
            <p
              className="pointer-events-auto mt-2 rounded-lg border border-amber-500/40 bg-background/95 px-3 py-2 text-sm text-amber-700 shadow dark:text-amber-300"
              role="status"
            >
              {requestWarning}
            </p>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-2">
          <MapLegend
            labels={{
              button: dict.showLegend,
              title: dict.legendTitle,
              course: dict.legendCourse,
              dining: dict.legendDining,
              dormitory: dict.legendDormitory,
              other: dict.legendOther,
              road: dict.legendRoad,
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shadow-lg"
            aria-label={dict.resetCamera}
            title={dict.resetCamera}
            onClick={resetCamera}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedFeature && (
        <div className="pointer-events-none absolute bottom-10 left-0 z-10 w-full max-w-sm p-3 md:bottom-8 md:p-4">
          <BuildingInfoPanel
            feature={selectedFeature}
            labelNumber={selectedFeatureLabelNumber}
            language={language}
            labels={{
              chineseName: dict.chineseName,
              englishName: dict.englishName,
              coursewebCode: dict.coursewebCode,
              openGoogleMaps: dict.openGoogleMaps,
              closeDetails: dict.closeDetails,
            }}
            onClose={clearSelection}
          />
        </div>
      )}

      <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm md:block">
        {dict.instructions}
      </p>
      <a
        href={data.attribution.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-10 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground underline shadow-sm"
      >
        {data.attribution.text}
      </a>
    </main>
  );
}
