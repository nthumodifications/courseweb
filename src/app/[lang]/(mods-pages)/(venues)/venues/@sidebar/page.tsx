import VenueList from "@/components/Venue/VenueList";
import client from "@/config/api";

export const revalidate = 0;

const Sidebar = async () => {
  const res = await client.venue.$get();
  const venues = await res.json();

  return (
    <div className={`w-full h-full block overflow-auto`}>
      <VenueList venues={venues} />
    </div>
  );
};

export default Sidebar;
