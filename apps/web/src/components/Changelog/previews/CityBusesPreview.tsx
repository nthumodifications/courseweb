import { BusListingItem } from "@/features/bus/BusListingItem";
import useDictionary from "@/dictionaries/useDictionary";
import {
  createCityBusPreviewItems,
  CITY_BUS_PREVIEW_REF_TIME,
} from "./sampleData";

const CityBusesPreview = ({ language }: { language: "zh" | "en" }) => {
  const labels = useDictionary().changelog.preview.bus;
  const items = createCityBusPreviewItems({ language, labels });

  return (
    <div className="pointer-events-none flex h-full flex-col justify-center divide-y divide-border overflow-hidden px-3">
      {items.map((item) => (
        <BusListingItem
          key={`${item.title}-${item.destination}`}
          {...item}
          refTime={CITY_BUS_PREVIEW_REF_TIME}
          compact
        />
      ))}
    </div>
  );
};

export default CityBusesPreview;
