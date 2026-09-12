import { Info } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import {
  CAMPUS_BUILDING_COLORS,
  CAMPUS_ROAD_COLOR,
  type CampusBuildingColorCategory,
} from "./sceneLogic";

type MapLegendProps = {
  labels: {
    button: string;
    title: string;
    course: string;
    dining: string;
    dormitory: string;
    other: string;
    road: string;
  };
};

export default function MapLegend({ labels }: MapLegendProps) {
  const entries: Array<{
    key: CampusBuildingColorCategory | "road";
    color: string;
    label: string;
  }> = [
    {
      key: "course",
      color: CAMPUS_BUILDING_COLORS.course,
      label: labels.course,
    },
    {
      key: "food",
      color: CAMPUS_BUILDING_COLORS.food,
      label: labels.dining,
    },
    {
      key: "dormitory",
      color: CAMPUS_BUILDING_COLORS.dormitory,
      label: labels.dormitory,
    },
    {
      key: "standard",
      color: CAMPUS_BUILDING_COLORS.standard,
      label: labels.other,
    },
    { key: "road", color: CAMPUS_ROAD_COLOR, label: labels.road },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={labels.button}
          title={labels.button}
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64"
        role="dialog"
        aria-label={labels.title}
      >
        <h2 className="text-sm font-semibold">{labels.title}</h2>
        <ul className="mt-3 space-y-3">
          {entries.map(({ key, color, label }) => (
            <li key={key} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-4 w-4 shrink-0 rounded-sm border border-border"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
