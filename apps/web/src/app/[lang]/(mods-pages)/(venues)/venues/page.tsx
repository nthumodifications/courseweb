import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@courseweb/ui";
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

  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const res = await client.venue.$get();
      return res.json();
    },
  });

  const venueId = locationId ? decodeURI(locationId) : null;

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[500px_auto] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`w-full h-full ${venueId ? "hidden md:block" : "block"} overflow-auto`}
      >
        {venuesLoading ? (
          <div className="grid place-items-center h-64">
            <span className="text-gray-400">Loading...</span>
          </div>
        ) : (
          <VenueList venues={venues as string[]} />
        )}
      </div>
      {/* Content */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <Fade>
          {venueId ? (
            <VenueDetail venueId={venueId} />
          ) : (
            <div className="hidden h-full max-h-screen min-h-[500px] w-full md:grid place-content-center">
              <h1 className="text-xl font-semibold text-gray-400">
                {dict.venues.placeholder}
              </h1>
            </div>
          )}
        </Fade>
      </div>
    </div>
  );
};

function VenueDetail({ venueId }: { venueId: string }) {
  const { lang } = useParams<{ lang: string }>();

  const { data: courses, isLoading } = useQuery({
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
      <div className="grid place-items-center h-64">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="pl-4 pt-2 md:hidden">
        <Link to={`/${lang}/venues`}>
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>
      </div>
      <div className="py-4 flex flex-col items-center space-y-2 px-2 md:px-6">
        <h2 className="font-semibold text-xl">
          {venueId} - {toPrettySemester(lastSemester.id)}學期
        </h2>
        <Suspense fallback={null}>
          <VenueTimetableDynamic courses={(courses ?? []) as MinimalCourse[]} />
        </Suspense>
      </div>
    </div>
  );
}

export default VenuesPage;
