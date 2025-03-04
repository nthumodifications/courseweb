import VenueList from "@/components/Venue/VenueList";
import client from "@/config/api";

const Sidebar = async () => {
  const res = await client.venue.$get();
  const venues = await res.json();

  return (
    <div className={`w-full h-full hidden md:block overflow-auto`}>
      <VenueList venues={venues} />
    </div>
  );
};

export default Sidebar;
