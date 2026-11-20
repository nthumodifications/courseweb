import { useEffect, useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@courseweb/ui";
import { LayoutGrid, List, Table2 } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import useDictionary from "@/dictionaries/useDictionary";
import {
  readCourseSearchView,
  resolveCourseSearchView,
  writeCourseSearchView,
  type CourseSearchView,
} from "./courseSearchView";

const CourseSearchViewSwitch = ({
  view,
  onViewChange,
}: {
  view: CourseSearchView;
  onViewChange: (view: CourseSearchView) => void;
}) => {
  const dict = useDictionary();
  const labels = dict.course.search.views;
  const options = [
    { value: "list", label: labels.list, Icon: List, className: "" },
    {
      value: "table",
      label: labels.table,
      Icon: Table2,
      className: "hidden sm:inline-flex",
    },
    {
      value: "grid",
      label: labels.grid,
      Icon: LayoutGrid,
      className: "",
    },
  ] as const;

  return (
    <div
      role="group"
      aria-label={labels.label}
      className="flex shrink-0 items-center gap-1"
    >
      {options.map(({ value, label, Icon, className }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={view === value ? "secondary" : "ghost"}
              size="icon"
              className={className}
              aria-label={label}
              aria-pressed={view === value}
              onClick={() => onViewChange(value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export const useCourseSearchView = () => {
  const [view, setView] = useState<CourseSearchView>(readCourseSearchView);
  const isSmUp = useMediaQuery("(min-width: 640px)");

  useEffect(() => {
    writeCourseSearchView(view);
  }, [view]);

  return {
    view: resolveCourseSearchView(view, !isSmUp),
    setView,
  };
};

export default CourseSearchViewSwitch;
