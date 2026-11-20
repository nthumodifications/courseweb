import { useMemo, useState, type ReactNode } from "react";
import { useRefinementList } from "react-instantsearch";
import { departments, GETargetCodes } from "@courseweb/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ScrollArea,
} from "@courseweb/ui";
import ExpandableClassFilter from "../student/planner/course-picker/ExpandableClassFilter";
import ExpandableFilter from "../student/planner/course-picker/ExpandableFilter";
import InlineCheckboxFilter from "../student/planner/course-picker/InlineCheckboxFilter";
import useCustomRefinementList from "./useCustomRefinementList";
import TimeSelectionFilter from "./TimeSelectionFilter";
import CourseAudienceFilter from "./CourseAudienceFilter";
import { MinimalCourse } from "@/types/courses";
import useDictionary from "@/dictionaries/useDictionary";
import ResetFiltersButton from "./ResetFiltersButton";
import { countActiveRefinementValues } from "./courseSearchView";

const languageSynonyms: Record<string, string> = {
  中: "Chinese",
  英: "English",
};
const departmentSynonyms: Record<string, string> = departments.reduce(
  (a, v) => ({ ...a, [v.code]: `${v.code} ${v.name_zh}` }),
  {},
);
const geTargetSynonyms: Record<string, string> = GETargetCodes.reduce(
  (a, v) => ({ ...a, [v.code]: `${v.short_en} ${v.short_zh}` }),
  {},
);

// Courses without a GE target index an empty facet value; hide that row.
const withoutBlankValues = <T extends { value: string }>(items: T[]) =>
  items.filter((item) => item.value.trim() !== "");

const SECTION_IDS = [
  "compulsory",
  "department",
  "level",
  "audience",
  "time",
  "tags",
  "language",
  "ge_target",
  "ge_type",
  "venues",
  "first_specialization",
  "second_specialization",
  "cross_discipline",
] as const;
type SectionId = (typeof SECTION_IDS)[number];
type SectionPreferences = Partial<Record<SectionId, boolean>>;
const FILTER_OPEN_KEY = "courseSearchFilterSections";

const readSectionPreferences = (): SectionPreferences => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(FILTER_OPEN_KEY) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          SECTION_IDS.includes(key as SectionId) && typeof value === "boolean",
      ),
    ) as SectionPreferences;
  } catch {
    return {};
  }
};

const persistSectionPreferences = (preferences: SectionPreferences) => {
  try {
    window.localStorage.setItem(FILTER_OPEN_KEY, JSON.stringify(preferences));
  } catch {
    // Keep the accordion usable when storage is unavailable.
  }
};

const useActiveCount = (attribute: string) => {
  const { items } = useRefinementList({ attribute, limit: 500 });
  return countActiveRefinementValues(items);
};

const FilterSection = ({
  id,
  label,
  count,
  children,
}: {
  id: SectionId;
  label: string;
  count: number;
  children: ReactNode;
}) => (
  <AccordionItem value={id} className="border-b border-border last:border-b-0">
    <AccordionTrigger className="min-h-10 px-2 py-2 text-left text-sm font-medium hover:no-underline">
      <span className="flex min-w-0 items-center gap-2">
        <span>{label}</span>
        {count > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {count}
          </span>
        )}
      </span>
    </AccordionTrigger>
    <AccordionContent className="px-2 pb-2">{children}</AccordionContent>
  </AccordionItem>
);

const Filters = ({
  selectedCourses,
  fillHeight = false,
}: {
  selectedCourses: MinimalCourse[];
  fillHeight?: boolean;
}) => {
  const dict = useDictionary();
  const [preferences, setPreferences] = useState(readSectionPreferences);
  const { items: classItems } = useCustomRefinementList({
    attribute: "for_class",
    limit: 20,
  });
  const classCount = countActiveRefinementValues(classItems);
  const departmentCount = useActiveCount("department");
  const levelCount = useActiveCount("courseLevel");
  const audienceCount = useActiveCount("audience");
  const timeCount = useActiveCount("separate_times");
  const tagsCount = useActiveCount("tags");
  const languageCount = useActiveCount("language");
  const geTargetCount = useActiveCount("ge_target");
  const geTypeCount = useActiveCount("ge_type");
  const venuesCount = useActiveCount("venues");
  const firstSpecializationCount = useActiveCount("first_specialization");
  const secondSpecializationCount = useActiveCount("second_specialization");
  const crossDisciplineCount = useActiveCount("cross_discipline");

  const counts: Record<SectionId, number> = {
    compulsory: classCount,
    department: departmentCount,
    level: levelCount,
    audience: audienceCount,
    time: timeCount,
    tags: tagsCount,
    language: languageCount,
    ge_target: geTargetCount,
    ge_type: geTypeCount,
    venues: venuesCount,
    first_specialization: firstSpecializationCount,
    second_specialization: secondSpecializationCount,
    cross_discipline: crossDisciplineCount,
  };
  const openSections = useMemo(
    () => SECTION_IDS.filter((id) => preferences[id] ?? counts[id] > 0),
    [
      preferences,
      classCount,
      departmentCount,
      levelCount,
      audienceCount,
      timeCount,
      tagsCount,
      languageCount,
      geTargetCount,
      geTypeCount,
      venuesCount,
      firstSpecializationCount,
      secondSpecializationCount,
      crossDisciplineCount,
    ],
  );
  const onOpenChange = (values: string[]) => {
    const next = Object.fromEntries(
      SECTION_IDS.map((id) => [id, values.includes(id)]),
    ) as SectionPreferences;
    setPreferences(next);
    persistSectionPreferences(next);
  };

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-col rounded-lg border border-border${
        fillHeight ? " h-full" : ""
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-2">
        <span className="text-sm font-bold">{dict.course.refine.title}</span>
        <ResetFiltersButton showLabel />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={onOpenChange}
          className="w-full"
        >
          <FilterSection
            id="compulsory"
            label={dict.course.refine.compulsory_elective}
            count={classCount}
          >
            <ExpandableClassFilter limit={20} />
          </FilterSection>

          <FilterSection
            id="department"
            label={dict.course.refine.department}
            count={departmentCount}
          >
            <ExpandableFilter
              attribute="department"
              searchable
              limit={500}
              clientSearch
              synonms={departmentSynonyms}
            />
          </FilterSection>

          <FilterSection
            id="level"
            label={dict.course.refine.level}
            count={levelCount}
          >
            <ExpandableFilter attribute="courseLevel" searchable limit={20} />
          </FilterSection>

          <FilterSection
            id="audience"
            label={dict.course.details.audience_tags.title}
            count={audienceCount}
          >
            <CourseAudienceFilter />
          </FilterSection>

          <FilterSection
            id="time"
            label={dict.course.refine.time}
            count={timeCount}
          >
            <TimeSelectionFilter
              attribute="separate_times"
              selectedCourses={selectedCourses}
            />
          </FilterSection>

          <FilterSection
            id="tags"
            label={dict.course.refine.special_tags}
            count={tagsCount}
          >
            <InlineCheckboxFilter attribute="tags" />
          </FilterSection>

          <FilterSection
            id="language"
            label={dict.course.refine.language}
            count={languageCount}
          >
            <InlineCheckboxFilter
              attribute="language"
              synonms={languageSynonyms}
            />
          </FilterSection>

          <FilterSection
            id="ge_target"
            label={dict.course.refine.geTarget}
            count={geTargetCount}
          >
            <InlineCheckboxFilter
              attribute="ge_target"
              synonms={geTargetSynonyms}
              filterFn={withoutBlankValues}
            />
          </FilterSection>

          <FilterSection
            id="ge_type"
            label={dict.course.refine.gecDimensions}
            count={geTypeCount}
          >
            <InlineCheckboxFilter
              attribute="ge_type"
              filterFn={(items) =>
                items.filter((item) => item.label.startsWith("核心通識"))
              }
              sortFn={(items) =>
                items.sort((a, b) => a.label.localeCompare(b.label))
              }
            />
          </FilterSection>

          <FilterSection
            id="venues"
            label={dict.course.refine.venues}
            count={venuesCount}
          >
            <ExpandableFilter
              attribute="venues"
              searchable
              limit={20}
              placeholder={dict.planner.coursePicker.searchToDisplayMore}
            />
          </FilterSection>

          <FilterSection
            id="first_specialization"
            label={dict.course.refine.firstSpecialization}
            count={firstSpecializationCount}
          >
            <ExpandableFilter
              attribute="first_specialization"
              searchable
              limit={20}
              placeholder={dict.planner.coursePicker.searchToDisplayMore}
            />
          </FilterSection>

          <FilterSection
            id="second_specialization"
            label={dict.course.refine.secondSpecialization}
            count={secondSpecializationCount}
          >
            <ExpandableFilter
              attribute="second_specialization"
              searchable
              limit={20}
              placeholder={dict.planner.coursePicker.searchToDisplayMore}
            />
          </FilterSection>

          <FilterSection
            id="cross_discipline"
            label={dict.course.refine.cross_discipline}
            count={crossDisciplineCount}
          >
            <ExpandableFilter
              attribute="cross_discipline"
              searchable
              limit={20}
              placeholder={dict.planner.coursePicker.searchToDisplayMore}
            />
          </FilterSection>
        </Accordion>
      </ScrollArea>
    </div>
  );
};

export default Filters;
