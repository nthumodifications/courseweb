import { YouBikeListingItem } from "@/app/[lang]/(mods-pages)/youbike/page";
import { YOUBIKE_PREVIEW_STATIONS } from "./sampleData";

const YouBikePreview = () => (
  // The real row needs about 450px before the station name truncates, so on
  // narrow dialogs it is laid out wider and scaled to fit the frame.
  <div className="pointer-events-none flex h-full flex-col justify-center divide-y divide-border overflow-hidden px-2 max-sm:w-[136%] max-sm:origin-left max-sm:scale-[0.735]">
    {YOUBIKE_PREVIEW_STATIONS.map((station) => (
      <YouBikeListingItem
        key={station.id}
        station={station}
        isPinned={false}
        onTogglePin={() => undefined}
      />
    ))}
  </div>
);

export default YouBikePreview;
