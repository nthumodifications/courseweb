import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import { Input } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
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
      const key = venue.match(/^[a-zA-Z0-9]+/)?.[0] || dict.venues.other;
      if (!acc[key]) acc[key] = [];
      acc[key].push(venue);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return (
    <div className="space-y-4 p-4">
      <Input
        className="sticky top-0"
        placeholder={dict.common.search}
        value={textSearch}
        onChange={(e) => setTextSearch(e.target.value)}
      />
      {Object.keys(grouped).map((ven) => {
        return (
          <div key={ven} className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">{ven}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3">
              {grouped[ven].map((venue) => (
                <Link key={venue} to={`/${language}/venues/${venue}`}>
                  <Button className="w-full text-muted-foreground" variant="ghost">
                    {venue}
                  </Button>
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
