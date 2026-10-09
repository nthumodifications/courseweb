import useDictionary from "@/dictionaries/useDictionary";
import { Badge } from "@courseweb/ui";
import UsageForecast from "@/components/Venue/UsageForecast";
import type { ChangelogEntryType } from "@/const/changelog";
import {
  USAGE_FORECAST_PREVIEW_NOW,
  USAGE_FORECAST_PREVIEW_SERIES,
} from "./sampleData";

const COURSE_HEADER_ITEM: { type: ChangelogEntryType; key: "course_header" } = {
  type: "fix",
  key: "course_header",
};

const SmallerUpdatesPreview = () => {
  const dict = useDictionary();
  const labels = dict.changelog.preview.smaller;

  return (
    <ul className="pointer-events-none flex h-full flex-col justify-center gap-3 overflow-hidden p-3">
      <li className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="shrink-0">
            {dict.changelog.types.feature}
          </Badge>
          <span className="min-w-0 truncate font-medium">
            {labels.items.usage_forecast}
          </span>
        </div>
        <UsageForecast
          series={USAGE_FORECAST_PREVIEW_SERIES}
          kind="occupancy"
          now={USAGE_FORECAST_PREVIEW_NOW}
          generatedAt="2026-10-07T05:30:00.000Z"
          onOpenDetails={() => undefined}
        />
      </li>
      <li className="flex min-w-0 items-center gap-2">
        <Badge variant="secondary" className="shrink-0">
          {dict.changelog.types[COURSE_HEADER_ITEM.type]}
        </Badge>
        <span className="min-w-0 truncate font-medium">
          {labels.items[COURSE_HEADER_ITEM.key]}
        </span>
      </li>
    </ul>
  );
};

export default SmallerUpdatesPreview;
