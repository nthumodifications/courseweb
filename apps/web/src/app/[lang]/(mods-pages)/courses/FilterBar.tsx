import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@courseweb/ui";
import { ChevronDown, Filter as FilterIcon } from "lucide-react";
import type { MinimalCourse } from "@/types/courses";
import { popoverScrollInDialogProps } from "../student/planner/course-picker/popoverScrollInDialog";
import useDictionary from "@/dictionaries/useDictionary";
import { useClearRefinements } from "react-instantsearch";
import {
  FILTER_SECTION_IDS,
  MORE_FILTER_SECTION_IDS,
  PRIMARY_FILTER_SECTION_IDS,
  FILTER_ATTRIBUTES,
  getFilterSectionLabel,
  useCourseFilterCounts,
  useFilterSectionPreferences,
  CourseFilterBody,
  type FilterSectionCounts,
  type FilterSectionId,
} from "./Filters";

export type FilterSectionConfig = {
  id: string;
  attribute: string;
  label: string;
  count: number;
  children: ReactNode;
  contentClassName?: string;
};

type FilterBarLabels = {
  sections: Record<FilterSectionId, string>;
  more: string;
};

export const FilterChip = ({
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

export const ClearFilterSectionButton = ({
  attribute,
  count,
  label,
}: {
  attribute: string;
  count: number;
  label?: string;
}) => {
  const dict = useDictionary();
  const { refine } = useClearRefinements({ includedAttributes: [attribute] });

  if (count === 0) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-3 text-muted-foreground"
      onClick={() => refine()}
    >
      {label ?? dict.course.refine.clear_section}
    </Button>
  );
};

export const FilterChipPopover = ({
  attribute,
  label,
  count,
  children,
  contentClassName = "w-80",
}: {
  attribute: string;
  label: string;
  count: number;
  children: ReactNode;
  contentClassName?: string;
}) => (
  <FilterChip label={label} count={count}>
    <PopoverContent
      {...popoverScrollInDialogProps}
      align="start"
      collisionPadding={16}
      className={`max-h-[min(70vh,32rem)] overflow-y-auto p-3 ${contentClassName}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <ClearFilterSectionButton attribute={attribute} count={count} />
      </div>
      <div className="pt-3">{children}</div>
    </PopoverContent>
  </FilterChip>
);

export const AccordionFilterSection = ({
  id,
  attribute,
  label,
  count,
  children,
}: FilterSectionConfig) => (
  <AccordionItem value={id} className="rounded-md border-0 bg-surface">
    <AccordionTrigger className="min-h-10 px-3 py-2 text-left text-sm font-medium hover:no-underline">
      <span className="flex min-w-0 items-center gap-2">
        <span>{label}</span>
        {count > 0 && (
          <span className="text-xs text-muted-foreground">{count}</span>
        )}
      </span>
    </AccordionTrigger>
    <AccordionContent className="flex flex-col gap-2 px-3 pb-3">
      {count > 0 && (
        <div className="flex justify-end">
          <ClearFilterSectionButton attribute={attribute} count={count} />
        </div>
      )}
      {children}
    </AccordionContent>
  </AccordionItem>
);

export const MoreFiltersChip = ({
  label,
  sections,
  openSections,
  onOpenChange,
}: {
  label: string;
  sections: FilterSectionConfig[];
  openSections: string[];
  onOpenChange: (values: string[]) => void;
}) => {
  const count = sections.reduce((total, section) => total + section.count, 0);

  return (
    <FilterChip
      label={label}
      count={count}
      icon={<FilterIcon className="h-4 w-4" aria-hidden="true" />}
    >
      <PopoverContent
        {...popoverScrollInDialogProps}
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
          {sections.map((section) => (
            <AccordionFilterSection key={section.id} {...section} />
          ))}
        </Accordion>
      </PopoverContent>
    </FilterChip>
  );
};

export const FilterBarLayout = ({
  primarySections,
  moreLabel,
  moreSections,
  openSections,
  onOpenChange,
  resetControl,
}: {
  primarySections: FilterSectionConfig[];
  moreLabel: string;
  moreSections: FilterSectionConfig[];
  openSections: string[];
  onOpenChange: (values: string[]) => void;
  resetControl?: ReactNode;
}) => (
  <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
    {primarySections.map((section) => (
      <FilterChipPopover
        key={section.id}
        attribute={section.attribute}
        label={section.label}
        count={section.count}
        contentClassName={section.contentClassName}
      >
        {section.children}
      </FilterChipPopover>
    ))}
    <MoreFiltersChip
      label={moreLabel}
      sections={moreSections}
      openSections={openSections}
      onOpenChange={onOpenChange}
    />
    {resetControl}
  </div>
);

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
}) => {
  const createSection = (id: FilterSectionId): FilterSectionConfig => ({
    id,
    attribute: FILTER_ATTRIBUTES[id],
    label: labels.sections[id],
    count: counts[id],
    contentClassName: id === "time" ? "w-96" : "w-80",
    children: <CourseFilterBody id={id} selectedCourses={selectedCourses} />,
  });

  return (
    <FilterBarLayout
      primarySections={PRIMARY_FILTER_SECTION_IDS.map(createSection)}
      moreLabel={labels.more}
      moreSections={MORE_FILTER_SECTION_IDS.map(createSection)}
      openSections={openSections}
      onOpenChange={onOpenChange}
      resetControl={resetControl}
    />
  );
};

const FilterBar = ({
  selectedCourses,
}: {
  selectedCourses: MinimalCourse[];
}) => {
  const dict = useDictionary();
  const counts = useCourseFilterCounts();
  const { openSections, onOpenChange } = useFilterSectionPreferences(
    MORE_FILTER_SECTION_IDS,
    counts,
    "courseSearchFilterSections",
  );
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
