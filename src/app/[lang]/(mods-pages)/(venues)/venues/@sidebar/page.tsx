import { FC } from "react";
import { getVenues } from "@/lib/venues";
import VenueList from "@/components/Venue/VenueList";

const Sidebar = async () => {
  const venues = await getVenues();

  return (
    <div className={`w-full h-full block overflow-auto`}>
      <VenueList venues={venues} />
    </div>
  );
};

export default Sidebar;
