import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Accordion,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@courseweb/ui";
import { ChevronDown, Filter as FilterIcon } from "lucide-react";
import type { MinimalCourse } from "@/types/courses";
import useDictionary from "@/dictionaries/useDictionary";
import {
  AccordionFilterSection,
  ClearFilterSectionButton,
  CourseFilterBody,
  FILTER_SECTION_IDS,
  MORE_FILTER_SECTION_IDS,
  PRIMARY_FILTER_SECTION_IDS,
  countMoreFilterValues,
  getFilterSectionLabel,
  useCourseFilterCounts,
  useFilterSectionPreferences,
  type FilterSectionCounts,
  type FilterSectionId,
} from "./Filters";

type FilterBarLabels = {
  sections: Record<FilterSectionId, string>;
  more: string;
};

const FilterChip = ({
  label,
  count,
  children,
  icon,
}: {
  label: string;
  count: number;
  children: ReactNode;
  icon?: ReactNode;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        className={`h-8 shrink-0 rounded-full px-3 text-sm font-medium ${
          count > 0
            ? "bg-primary/10 text-primary hover:bg-primary/10"
            : "bg-surface text-foreground hover:bg-muted"
        }`}
      >
        {icon}
        <span>{count > 0 ? `${label} · ${count}` : label}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    {children}
  </Popover>
);

const FilterChipPopover = ({
  id,
  label,
  count,
  selectedCourses,
}: {
  id: FilterSectionId;
  label: string;
  count: number;
  selectedCourses: MinimalCourse[];
}) => (
  <FilterChip label={label} count={count}>
    <PopoverContent
      align="start"
      collisionPadding={16}
      className={`max-h-[min(70vh,32rem)] overflow-y-auto p-3 ${
        id === "time" ? "w-96" : "w-80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <ClearFilterSectionButton id={id} count={count} />
      </div>
      <div className="pt-3">
        <CourseFilterBody id={id} selectedCourses={selectedCourses} />
      </div>
    </PopoverContent>
  </FilterChip>
);

const MoreFiltersChip = ({
  labels,
  counts,
  selectedCourses,
  openSections,
  onOpenChange,
}: {
  labels: FilterBarLabels;
  counts: FilterSectionCounts;
  selectedCourses: MinimalCourse[];
  openSections: string[];
  onOpenChange: (values: string[]) => void;
}) => {
  const count = countMoreFilterValues(counts);

  return (
    <FilterChip
      label={labels.more}
      count={count}
      icon={<FilterIcon className="h-4 w-4" aria-hidden="true" />}
    >
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="w-80 max-h-[min(70vh,32rem)] overflow-y-auto p-3"
      >
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={onOpenChange}
          className="flex w-full flex-col gap-1"
        >
          {MORE_FILTER_SECTION_IDS.map((id) => (
            <AccordionFilterSection
              key={id}
              id={id}
              label={labels.sections[id]}
              count={counts[id]}
            >
              <CourseFilterBody id={id} selectedCourses={selectedCourses} />
            </AccordionFilterSection>
          ))}
        </Accordion>
      </PopoverContent>
    </FilterChip>
  );
};

export const FilterBarContent = ({
  labels,
  counts,
  selectedCourses,
  openSections,
  onOpenChange,
  resetControl,
}: {
  labels: FilterBarLabels;
  counts: FilterSectionCounts;
  selectedCourses: MinimalCourse[];
  openSections: string[];
  onOpenChange: (values: string[]) => void;
  resetControl?: ReactNode;
}) => (
  <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
    {PRIMARY_FILTER_SECTION_IDS.map((id) => (
      <FilterChipPopover
        key={id}
        id={id}
        label={labels.sections[id]}
        count={counts[id]}
        selectedCourses={selectedCourses}
      />
    ))}
    <MoreFiltersChip
      labels={labels}
      counts={counts}
      selectedCourses={selectedCourses}
      openSections={openSections}
      onOpenChange={onOpenChange}
    />
    {resetControl}
  </div>
);

const FilterBar = ({
  selectedCourses,
}: {
  selectedCourses: MinimalCourse[];
}) => {
  const dict = useDictionary();
  const counts = useCourseFilterCounts();
  const { openSections, onOpenChange } = useFilterSectionPreferences(counts);
  const labels = useMemo(
    () => ({
      sections: Object.fromEntries(
        FILTER_SECTION_IDS.map((id) => [id, getFilterSectionLabel(id, dict)]),
      ) as Record<FilterSectionId, string>,
      more: dict.course.refine.more_filters,
    }),
    [dict],
  );
  return (
    <FilterBarContent
      labels={labels}
      counts={counts}
      selectedCourses={selectedCourses}
      openSections={openSections}
      onOpenChange={onOpenChange}
    />
  );
};

export default FilterBar;
