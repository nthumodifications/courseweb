import CeranaSponsorBanner from "./CeranaSponsorBanner";
import OpenCollectiveSponsorBanner from "./OpenCollectiveSponsorBanner";

const SponsorshipBanner = () => {
  return (
    <div className="w-full space-y-2">
      {/* Cerana Tech Section - 60% */}
      <CeranaSponsorBanner />

      {/* Open Collective Section - 40% */}
      <OpenCollectiveSponsorBanner />
    </div>
  );
};

export default SponsorshipBanner;
