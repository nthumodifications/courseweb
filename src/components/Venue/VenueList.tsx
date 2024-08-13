"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type Fuse from "fuse.js";

const VenueList = ({ venues }: { venues: string[] }) => {
  const [filtered, setFiltered] = useState<Fuse.FuseResult<string>[]>([]);
  const [textSearch, setTextSearch] = useState<string>("");
  const { language } = useSettings();

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
    <div className="px-8 py-4 space-y-4">
      <Input
        className="sticky top-0"
        placeholder="Search..."
        value={textSearch}
        onChange={(e) => setTextSearch(e.target.value)}
      />
      {Object.keys(grouped).map((ven, i) => {
        return (
          <div key={ven} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{ven}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3">
              {grouped[ven].map((venue, i) => (
                <Link key={i} href={`/${language}/venues/${venue}`}>
                  <Button className="text-gray-400" variant="ghost">
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
