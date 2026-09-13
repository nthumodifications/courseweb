import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import { Input } from "@courseweb/ui";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@courseweb/ui";
import type Fuse from "fuse.js";
import useDictionary from "@/dictionaries/useDictionary";

const VenueList = ({ venues }: { venues: string[] }) => {
  const [filtered, setFiltered] = useState<Fuse.FuseResult<string>[]>([]);
  const [textSearch, setTextSearch] = useState<string>("");
  const { language } = useSettings();
  const dict = useDictionary();

  useEffect(() => {
    (async () => {
      const Fuse = (await import("fuse.js")).default;
      const fuse = new Fuse(venues);
      setFiltered(fuse.search(textSearch));
    })();
  }, [venues, textSearch]);

  // group each venue by the first few characters before the CJK character
  // example: BMES醫環101 => BMES : [BMES醫環101]
  const grouped = (
    textSearch == "" ? venues : filtered.map((mod) => mod.item)
  ).reduce(
    (acc, venue) => {
      const key = venue.match(/^[a-zA-Z0-9]+/)?.[0] || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(venue);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return (
    <div className="flex flex-col px-4 py-4">
      <Input
        className="sticky top-0"
        placeholder={dict.common.search}
        value={textSearch}
        onChange={(e) => setTextSearch(e.target.value)}
      />
      {Object.keys(grouped).length === 0 ? (
        <EmptyState title={dict.common.no_results} />
      ) : Object.keys(grouped).map((ven) => {
        return (
          <div key={ven} className="flex flex-col">
            <h2 className="py-4 font-bold text-base">{ven}</h2>
            <div className="flex flex-col divide-y divide-border">
              {grouped[ven].map((venue, i) => (
                <Link
                  key={i}
                  className="flex min-w-0 flex-row items-center gap-4 py-4"
                  to={`/${language}/venues/${venue}`}
                >
                  <span className="h-4 w-4 shrink-0 rounded-sm bg-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-bold text-foreground">
                    {venue}
                  </span>
                  <span className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {dict.venues.view_courses}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VenueList;
