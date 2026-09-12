import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Map } from "lucide-react";
import {
  Button,
  EmptyState,
  Fade,
  PageHeader,
  PageShell,
  PageSkeleton,
} from "@courseweb/ui";
import { lastSemester } from "@courseweb/shared";
import { toPrettySemester } from "@/helpers/semester";
import VenueList from "@/components/Venue/VenueList";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { MinimalCourse } from "@/types/courses";
import ErrorState from "@/components/Pages/ErrorState";
import { MapPin } from "lucide-react";

const VenueTimetableDynamic = lazy(
  () =>
    import(
      "@/app/[lang]/(mods-pages)/(venues)/venues/@content/[locationId]/VenueTimetable"
    ),
);

const VenuesPage = () => {
  const { locationId } = useParams<{ locationId?: string }>();
  const dict = useDictionary();

  const {
    data: venues = [],
    error: venuesError,
    isLoading: venuesLoading,
    refetch: refetchVenues,
  } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const res = await client.venue.$get();
      return res.json();
    },
  });

  const venueId = locationId ? decodeURI(locationId) : null;

  return (
    <PageShell width="app" gap={false} className="min-h-[calc(100dvh-var(--header-height))]">
      <PageHeader title={dict.venues.title} description={dict.venues.description} />
      <div className="grid min-h-[32rem] h-[calc(100dvh-var(--header-height)-8rem)] grid-cols-1 overflow-hidden rounded-lg border border-border md:grid-cols-[minmax(18rem,31.25rem)_minmax(0,1fr)]">
        <div
          className={`min-w-0 overflow-auto ${venueId ? "hidden md:block" : "block"}`}
        >
          {venuesLoading ? (
            <PageSkeleton rows={8} className="p-4" />
          ) : venuesError ? (
            <ErrorState
              title={dict.venues.load_error_title}
              description={dict.venues.load_error_description}
              retryLabel={dict.common.try_again}
              onRetry={() => void refetchVenues()}
            />
          ) : venues.length === 0 ? (
            <EmptyState
              size="sm"
              icon={MapPin}
              title={dict.venues.empty_title}
              description={dict.venues.empty_description}
            />
          ) : (
            <VenueList venues={venues as string[]} />
          )}
        </div>
        <div className="min-w-0 overflow-x-hidden overflow-y-auto">
          <Fade>
            {venueId ? (
              <VenueDetail venueId={venueId} />
            ) : (
              <div className="hidden min-h-[32rem] w-full place-content-center md:grid">
                <EmptyState
                  icon={MapPin}
                  title={dict.venues.placeholder_title}
                  description={dict.venues.placeholder_description}
                />
              </div>
            )}
          </Fade>
        </div>
      </div>
    </PageShell>
  );
};

function VenueDetail({ venueId }: { venueId: string }) {
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();

  const {
    data: courses,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["venue-courses", venueId],
    queryFn: async () => {
      const res = await client.venue[":venueId"].courses.$get({
        param: { venueId },
        query: { semester: lastSemester.id },
      });
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <PageSkeleton rows={5} className="p-4" />
    );
  }

  if (error) {
    return (
      <ErrorState
        title={dict.venues.load_error_title}
        description={dict.venues.load_error_description}
        retryLabel={dict.common.try_again}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="p-4 md:hidden">
        <Link to={`/${lang}/venues`}>
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" /> {dict.common.back}
          </Button>
        </Link>
      </div>
      <div className="flex flex-col items-center gap-2 p-4">
        <h2 className="text-xl font-semibold">
          {venueId} - {toPrettySemester(lastSemester.id)} {dict.course.details.semester}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/map?venue=${encodeURIComponent(venueId)}`}>
            <Map className="mr-2 h-4 w-4" aria-hidden="true" />
            {dict.campus_map.viewVenueOnMap}
          </Link>
        </Button>
        <Suspense fallback={<PageSkeleton rows={5} className="w-full" />}>
          <VenueTimetableDynamic courses={(courses ?? []) as MinimalCourse[]} />
        </Suspense>
      </div>
    </div>
  );
}

export default VenuesPage;
