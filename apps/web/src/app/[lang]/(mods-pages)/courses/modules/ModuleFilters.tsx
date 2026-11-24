import { useEffect, useMemo, useState } from "react";
import { useRange, useRefinementList } from "react-instantsearch";
import {
  FilterBarLayout,
  type FilterSectionConfig,
} from "@/app/[lang]/(mods-pages)/courses/FilterBar";
import { useFilterSectionPreferences } from "@/app/[lang]/(mods-pages)/courses/Filters";
import ExpandableFilter from "@/app/[lang]/(mods-pages)/student/planner/course-picker/ExpandableFilter";
import InlineCheckboxFilter from "@/app/[lang]/(mods-pages)/student/planner/course-picker/InlineCheckboxFilter";
import useDictionary from "@/dictionaries/useDictionary";
import { Slider } from "@courseweb/ui";

const PRIMARY_MODULE_FILTERS = [
  "department",
  "credits",
  "level",
  "language",
  "termOffered",
] as const;

const MORE_MODULE_FILTERS = ["recentlyOffered", "englishTaught"] as const;
type ModuleFilterId =
  | (typeof PRIMARY_MODULE_FILTERS)[number]
  | (typeof MORE_MODULE_FILTERS)[number];
type ModuleFilterCounts = Record<ModuleFilterId, number>;
type CreditsRangeState = ReturnType<typeof useRange>;

const MODULE_FILTER_ATTRIBUTES: Record<ModuleFilterId, string> = {
  department: "department",
  credits: "credits",
  level: "courseLevel",
  language: "language",
  termOffered: "termOffered",
  recentlyOffered: "recentlyOffered",
  englishTaught: "englishTaught",
};

const useRefinedCount = (attribute: string) => {
  const { items } = useRefinementList({ attribute, limit: 500 });
  return items.reduce((count, item) => count + Number(item.isRefined), 0);
};

const useModuleFilterCounts = (
  creditsRange: CreditsRangeState,
): ModuleFilterCounts => {
  const department = useRefinedCount(MODULE_FILTER_ATTRIBUTES.department);
  const level = useRefinedCount(MODULE_FILTER_ATTRIBUTES.level);
  const language = useRefinedCount(MODULE_FILTER_ATTRIBUTES.language);
  const termOffered = useRefinedCount(MODULE_FILTER_ATTRIBUTES.termOffered);
  const recentlyOffered = useRefinedCount(
    MODULE_FILTER_ATTRIBUTES.recentlyOffered,
  );
  const englishTaught = useRefinedCount(MODULE_FILTER_ATTRIBUTES.englishTaught);
  const min = creditsRange.range.min ?? 0;
  const max = creditsRange.range.max ?? min;
  const startMin = creditsRange.start[0] ?? Number.NEGATIVE_INFINITY;
  const startMax = creditsRange.start[1] ?? Number.POSITIVE_INFINITY;
  const narrowed = startMin > min || startMax < max;

  return {
    department,
    credits: Number(narrowed),
    level,
    language,
    termOffered,
    recentlyOffered,
    englishTaught,
  };
};

// Credits cluster at 0–4 with a long tail (up to 20), so the slider stops are
// the credit values that exist, evenly spaced, not a linear 0–20 scale.
const useCreditStops = () => {
  const { items } = useRefinementList({ attribute: "credits", limit: 100 });
  return useMemo(
    () =>
      [...new Set(items.map((item) => Number(item.value)))]
        .filter(Number.isFinite)
        .sort((left, right) => left - right),
    [items],
  );
};

const nearestStopIndex = (stops: readonly number[], value: number) => {
  const index = stops.findIndex((stop) => stop >= value);
  return index === -1 ? stops.length - 1 : index;
};

const CreditsRangeFilter = ({
  rangeState,
}: {
  rangeState: CreditsRangeState;
}) => {
  const dict = useDictionary();
  const stops = useCreditStops();
  const { start, refine, canRefine } = rangeState;
  const lastIndex = Math.max(0, stops.length - 1);
  const startMin = start[0];
  const startMax = start[1];
  const selected: [number, number] = [
    startMin !== undefined && Number.isFinite(startMin)
      ? nearestStopIndex(stops, startMin)
      : 0,
    startMax !== undefined && Number.isFinite(startMax)
      ? Math.max(
          0,
          stops.findLastIndex((stop) => stop <= startMax),
        )
      : lastIndex,
  ];
  const [selectedFrom, selectedTo] = selected;
  const [draft, setDraft] = useState<[number, number]>(selected);

  useEffect(() => {
    setDraft([selectedFrom, selectedTo]);
  }, [selectedFrom, selectedTo]);

  if (stops.length === 0) return null;

  const unit = dict.course.module.credits_unit;
  const low = stops[draft[0]] ?? stops[0];
  const high = stops[draft[1]] ?? stops[lastIndex];

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {low === high ? `${low} ${unit}` : `${low} – ${high} ${unit}`}
      </div>
      <Slider
        min={0}
        max={lastIndex}
        step={1}
        minStepsBetweenThumbs={0}
        value={draft}
        onValueChange={(value) =>
          setDraft([value[0] ?? 0, value[1] ?? lastIndex])
        }
        onValueCommit={(value) => {
          const [from = 0, to = lastIndex] = value;
          refine(
            from === 0 && to === lastIndex
              ? [undefined, undefined]
              : [stops[from], stops[to]],
          );
        }}
        disabled={!canRefine || stops.length < 2}
        aria-label={dict.course.module.filters.credits}
      />
      {/* px-2.5 puts each label under a thumb centre (thumbs are 20px). */}
      <div className="flex justify-between px-2.5 text-xs tabular-nums text-muted-foreground">
        {stops.map((stop) => (
          <span key={stop} className="flex w-0 justify-center">
            {stop}
          </span>
        ))}
      </div>
    </div>
  );
};

const ModuleFilterBody = ({
  id,
  creditsRange,
}: {
  id: ModuleFilterId;
  creditsRange: CreditsRangeState;
}) => {
  const dict = useDictionary();
  const filters = dict.course.module.filters;

  switch (id) {
    case "department":
      return (
        <ExpandableFilter
          attribute="department"
          mode="checkbox"
          searchable
          limit={500}
          clientSearch
        />
      );
    case "credits":
      return <CreditsRangeFilter rangeState={creditsRange} />;
    case "level":
      return (
        <InlineCheckboxFilter
          attribute="courseLevel"
          synonyms={filters.levelOptions}
        />
      );
    case "language":
      return (
        <InlineCheckboxFilter
          attribute="language"
          synonyms={filters.languageOptions}
        />
      );
    case "termOffered":
      return (
        <InlineCheckboxFilter
          attribute="termOffered"
          synonyms={filters.termOptions}
        />
      );
    case "recentlyOffered":
      return (
        <InlineCheckboxFilter
          attribute="recentlyOffered"
          synonyms={filters.recentOptions}
        />
      );
    case "englishTaught":
      return (
        <InlineCheckboxFilter
          attribute="englishTaught"
          synonyms={filters.englishTaughtOptions}
        />
      );
  }
};

const ModuleFilters = () => {
  const dict = useDictionary();
  const creditsRange = useRange({ attribute: "credits", precision: 0 });
  const counts = useModuleFilterCounts(creditsRange);
  const { openSections, onOpenChange } = useFilterSectionPreferences(
    MORE_MODULE_FILTERS,
    counts,
    "moduleSearchFilterSections",
  );
  const getLabel = (id: ModuleFilterId) => {
    switch (id) {
      case "department":
        return dict.course.module.filters.department;
      case "credits":
        return dict.course.module.filters.credits;
      case "level":
        return dict.course.module.filters.level;
      case "language":
        return dict.course.module.filters.language;
      case "termOffered":
        return dict.course.module.filters.termOffered;
      case "recentlyOffered":
        return dict.course.module.filters.recentlyOffered;
      case "englishTaught":
        return dict.course.module.filters.englishTaught;
    }
  };
  const createSection = (id: ModuleFilterId): FilterSectionConfig => ({
    id,
    attribute: MODULE_FILTER_ATTRIBUTES[id],
    label: getLabel(id),
    count: counts[id],
    children: <ModuleFilterBody id={id} creditsRange={creditsRange} />,
  });

  return (
    <FilterBarLayout
      primarySections={PRIMARY_MODULE_FILTERS.map(createSection)}
      moreLabel={dict.course.refine.more_filters}
      moreSections={MORE_MODULE_FILTERS.map(createSection)}
      openSections={openSections}
      onOpenChange={onOpenChange}
    />
  );
};

export default ModuleFilters;
