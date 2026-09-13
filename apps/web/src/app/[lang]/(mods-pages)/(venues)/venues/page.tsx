import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Map } from "lucide-react";
import { Button, EmptyState, ErrorState } from "@courseweb/ui";
import { Fade } from "@courseweb/ui";
import { lastSemester } from "@courseweb/shared";
import { toPrettySemester } from "@/helpers/semester";
import VenueList from "@/components/Venue/VenueList";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { MinimalCourse } from "@/types/courses";

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
    isLoading: venuesLoading,
    error: venuesError,
    refetch: refetchVenues,
  } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const res = await client.venue.$get();
      if (!res.ok) throw new Error("Failed to load venues");
      return res.json();
    },
  });

  const venueId = locationId ? decodeURI(locationId) : null;

  return (
    <div className="grid h-full min-w-0 grid-cols-1 overflow-hidden md:grid-cols-[500px_auto]">
      {/* Sidebar */}
      <div
        className={`w-full h-full ${venueId ? "hidden md:block" : "block"} overflow-auto`}
      >
        {venuesLoading ? (
          <div className="flex flex-col divide-y divide-border px-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="flex min-w-0 flex-row items-center gap-4 py-4" key={index}>
                <div className="h-4 w-4 shrink-0 rounded-sm bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="flex-1" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : venuesError ? (
          <ErrorState
            title={dict.common.load_error}
            action={
              <Button variant="outline" size="sm" onClick={() => void refetchVenues()}>
                {dict.common.try_again}
              </Button>
            }
          />
        ) : (
          <VenueList venues={venues as string[]} />
        )}
      </div>
      {/* Content */}
      <div className="h-full min-w-0 overflow-y-auto">
        <Fade>
          {venueId ? (
            <VenueDetail venueId={venueId} />
          ) : (
            <EmptyState title={dict.venues.placeholder} />
          )}
        </Fade>
      </div>
    </div>
  );
};

function VenueDetail({ venueId }: { venueId: string }) {
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();

  const {
    data: courses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["venue-courses", venueId],
    queryFn: async () => {
      const res = await client.venue[":venueId"].courses.$get({
        param: { venueId },
        query: { semester: lastSemester.id },
      });
      if (!res.ok) throw new Error("Failed to load venue courses");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-border px-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="flex min-w-0 flex-row items-center gap-4 py-4" key={index}>
            <div className="h-4 w-4 shrink-0 rounded-sm bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="flex-1" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={dict.common.load_error}
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {dict.common.try_again}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="pl-4 pt-2 md:hidden">
        <Link to={`/${lang}/venues`}>
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" /> {dict.common.back}
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-2 px-2 py-4 md:px-6">
        <h2 className="font-bold text-base">
          {venueId} - {toPrettySemester(lastSemester.id)} {dict.course.details.semester}
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/map?venue=${encodeURIComponent(venueId)}`}>
            <Map className="mr-2 h-4 w-4" aria-hidden="true" />
            {dict.campus_map.viewVenueOnMap}
          </Link>
        </Button>
        <Suspense fallback={null}>
          <VenueTimetableDynamic courses={(courses ?? []) as MinimalCourse[]} />
        </Suspense>
      </div>
    </div>
  );
}

export default VenuesPage;
